const coinbaseClient = require("./coinbaseClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const socketClient = require("./socketClient");

// start a sync loop for each active user
async function startSync() {
  console.log('starting sync loop');
  // get all users from the db
  const sqlText = `SELECT "id" FROM "user";`
  const result = await pool.query(sqlText);
  const userlist = result.rows;
  // console.log(userlist);
  userlist.forEach(user => {
    // console.log(user.id);
    syncOrders(user.id);
  });
}

// REST protocol to find orders that have settled on coinbase
async function syncOrders(userID) {
  let user;
  try {
    user = await databaseClient.getUser(userID);
    if (user?.active && user?.approved) {

      // *** GET ORDERS THAT NEED PROCESSING ***

      // console.log('starting the loop for user id', user.id, user.active);
      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb
        databaseClient.getUnsettledTrades('all', userID),
        coinbaseClient.getOpenOrders(userID)
      ]);
      // store the lists of orders in the corresponding arrays so they can be compared
      const dbOrders = results[0];
      const cbOrders = results[1];
      // compare the arrays and remove any where the ids match in both,
      // leaving a list of orders that are open in the db, but not on cb. Probably settled
      const ordersToCheck = await orderElimination(dbOrders, cbOrders);

      // also get a list of orders that are open on cb, but not stored in the db. 
      // these are extra orders and should be canceled???
      const ordersToCancel = await orderElimination(cbOrders, dbOrders);


      // *** CANCEL EXTRA ORDERS ON COINBASE THAT ARE NOT OPEN IN DATABASE ***
      try {
        let result = await cancelMultipleOrders(ordersToCancel, userID);
        if (result.ordersCanceled && (result.quantity > 0)) {
          console.log(result.message);
          socketClient.emit('message', {
            error: `${result.quantity} Extra orders were found and canceled for user ${userID}`,
            orderUpdate: true,
            userID: Number(userID)
          });
        }
      } catch (err) {
        console.log('error deleting extra order', err);
      }
      // wait for a second to allow cancels to go through so bot doesn't cancel twice
      await sleep(1000);
      // }


      // *** SETTLE ORDERS IN DATABASE THAT ARE SETTLED ON COINBASE ***
      try {
        let result = await settleMultipleOrders(ordersToCheck, userID);
        if (result.ordersFlipped) {
          console.log(result.message);
        }
      } catch (err) {
        if (err.response?.status === 500) {
          console.log('internal server error from coinbase');
          socketClient.emit('message', {
            error: `Internal server error from coinbase! Is the Coinbase Pro website down?`,
            orderUpdate: true,
            userID: Number(userID)
          });
        } else {
          console.log('Error settling all settled orders', err);
        }
      }


      // PROCESS ALL ORDERS THAT HAVE BEEN CHANGED
      await processOrders(userID);

      // DELETE ALL ORDERS MARKED FOR DELETE
      await deleteMarkedOrders(userID);

    } else {
      // if the user is not active, loop every 1 second
      await sleep(1000);
    }
  } catch (err) {
    // console.log('catch of syncOrders');
    if (err.code === 'ECONNRESET') {
      console.log('Connection reset by Coinbase server');
    } else if (err.response?.status === 500) {
      console.log('internal server error from coinbase');
      socketClient.emit('message', {
        error: `Internal server error from coinbase! Is the Coinbase Pro website down?`,
        orderUpdate: true,
        userID: Number(userID)
      });
    } else if (err.response?.status === 401) {
      console.log('Invalid API key');
      socketClient.emit('message', {
        error: `Invalid API key end of syncOrders!`,
        orderUpdate: false,
        userID: Number(userID)
      });
    } else {
      console.log('unknown error at end of syncOrders', err);
    }
  } finally {
    socketClient.emit('message', {
      heartbeat: true,
      userID: Number(userID)
    });
    // when everything is done, call the sync again if the user still exists

    if (user) {
      setTimeout(() => {
        syncOrders(userID);
      }, 300);
    } else {
      console.log('user is NOT THERE');
    }
  }
}

async function deleteMarkedOrders(userID) {
  return new Promise(async (resolve, reject) => {
    // console.log('deleting orders marked for cancelation');
    try {
      const queryText = `DELETE from "orders" WHERE "will_cancel"=true AND "userID"=$1;`;
      let result = await pool.query(queryText, [userID]);
      if (result.rowCount > 0) {
        console.log('orders marked for cancel were deleted from db', result.rowCount);
        socketClient.emit('message', {
          message: `orders marked for cancel were deleted from db`,
          orderUpdate: true,
          userID: Number(userID)
        });
      }
      resolve(result);
    } catch (err) {
      console.log('problem in deleteMarkedOrders function in robot', err);
      reject(err)
    }
  });
}

// process orders that have been settled
async function processOrders(userID) {
  return new Promise(async (resolve, reject) => {
    // check all trades in db that are both settled and NOT flipped
    sqlText = `SELECT * FROM "orders" WHERE "settled"=true AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;
    // store the trades in an object
    const result = await pool.query(sqlText, [userID]);
    const tradeList = result.rows;
    // if there is at least one trade...
    // console.log(`there are ${tradeList.length} trades to process`);
    if (tradeList.length > 0) {
      // loop through all the settled orders and flip them
      for (let i = 0; i < tradeList.length; i++) {
        // ...take the first trade that needs to be flipped, 
        let dbOrder = tradeList[i];
        // get the user of the trade
        let user = await databaseClient.getUserAndSettings(dbOrder.userID);
        // ...flip the trade details
        // console.log('dbOrder is', dbOrder);
        let tradeDetails = flipTrade(dbOrder, user);
        // ...send the new trade
        try {
          let cancelling = await databaseClient.checkIfCancelling(dbOrder.id);
          if (!cancelling) {
            console.log('cancelling in processOrders?:', cancelling);


            let cbOrder = await coinbaseClient.placeOrder(tradeDetails);
            // ...store the new trade
            await databaseClient.storeTrade(cbOrder, dbOrder);
            // ...mark the old trade as flipped
            const queryText = `UPDATE "orders" SET "flipped" = true WHERE "id"=$1;`;
            let updatedTrade = await pool.query(queryText, [dbOrder.id]);
            // tell the frontend that an update was made so the DOM can update
            socketClient.emit('message', {
              orderUpdate: true,
              userID: Number(dbOrder.userID)
            });
          }
        } catch (err) {
          if (err.code && err.code === 'ETIMEDOUT') {
            console.log('Timed out!!!!! from the loop');
            // await coinbaseClient.cancelAllOrders();
            console.log('maybe need to sync orders just in case');
          } else if (err.response?.status === 400) {
            console.log('Insufficient funds! from the loop');
            socketClient.emit('message', {
              error: `Insufficient funds in the loop!`,
              userID: Number(dbOrder.userID)
            });
            // todo - check funds to make sure there is enough for 
            // all of them to be replaced, and balance if needed
          } else {
            console.log('error in the loop', err);
            // reject(err);
          }
        } finally {
          // call the loop again. Wait half second to avoid rate limiting
          // setTimeout(() => {
          //   processOrders();
          // }, 300);
          console.log('processOrders is finished and had trades to flip');
          // resolve();
        }
        // avoid rate limiting
        await sleep(100)
      }
    } else {
      // call the loop again right away since no connections have been used
      // setTimeout(() => {
      //   processOrders();
      // }, 100);
      // console.log('processOrders is finished and DID NOT HAVE trades to flip');
      resolve();
    }
    resolve();
  });
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
function flipTrade(dbOrder, user) {
  const reinvestRatio = user.reinvest_ratio / 100;
  // console.log('here is the order to flip', dbOrder);
  // set up the object to be sent
  const tradeDetails = {
    side: '',
    price: '', // USD
    // when flipping a trade, size and product will always be the same
    size: dbOrder.size, // BTC
    trade_pair_ratio: dbOrder.trade_pair_ratio,
    product_id: dbOrder.product_id,
    stp: 'cn',
    userID: dbOrder.userID,
  };
  // add buy/sell requirement and price
  // console.log('in flipTrade user reinvest_ratio', reinvestRatio);

  let orderSize = Number(dbOrder.size);

  let margin = (dbOrder.original_sell_price - dbOrder.original_buy_price)
  let grossProfit = Number(margin * dbOrder.size)
  let profit = Number(grossProfit - (dbOrder.fill_fees * 2))
  let profitBTC = Number(Math.floor((profit / dbOrder.price) * reinvestRatio * 100000000) / 100000000)
  // console.log('order size and profit in btc', orderSize, 'fixed', (profitBTC).toFixed(8), 'string', profitBTC.toString());
  let newSize = Math.floor((orderSize + profitBTC) * 100000000) / 100000000;
  // console.log('new size is', newSize);
  // console.log('PROFIT', profit);
  // console.log('PROFIT in btc', profitBTC);
  // console.log('NEW SIZE', newSize);
  if (dbOrder.side === "buy") {
    // if it was a buy, sell for more. multiply old price
    tradeDetails.side = "sell"
    tradeDetails.price = dbOrder.original_sell_price;
    socketClient.emit('message', {
      message: `Selling for $${Number(tradeDetails.price)}`,
      userID: Number(dbOrder.userID)
    });
  } else {
    // console.log('check for reinvest', user.reinvest);
    if (user.reinvest) {
      // console.log('changing size!!!!!!!', newSize);
      tradeDetails.size = newSize.toFixed(8);
    }
    // if it was a sell, buy for less. divide old price
    tradeDetails.side = "buy"
    tradeDetails.price = dbOrder.original_buy_price;
    socketClient.emit('message', {
      message: `Buying for $${Number(tradeDetails.price)}`,
      userID: Number(dbOrder.userID)
    });
  }
  // return the tradeDetails object
  return tradeDetails;
}


// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function settleMultipleOrders(ordersArray, userID) {
  return new Promise(async (resolve, reject) => {
    if (ordersArray.length > 0) {
      console.log(`User ${userID} has ${ordersArray.length} settled orders that should be flipped`);
      socketClient.emit('message', {
        message: `There are ${ordersArray.length} orders that need to be synced`,
        userID: Number(userID)
      });
      // loop over the array and flip each trade
      for (let i = 0; i < ordersArray.length; i++) {
        const orderToCheck = ordersArray[i];
        // send heartbeat for each loop
        socketClient.emit('message', {
          heartbeat: true,
          userID: Number(userID)
        });
        try {
          // wait between each loop to prevent rate limiting
          await sleep(500);
          // get all the order details from cb
          await sleep(100); // avoid rate limiting
          let fullSettledDetails = await coinbaseClient.getOrder(orderToCheck.id, userID);
          console.log('1111111111111 setting this trade as settled in the db', orderToCheck.id, orderToCheck.price, fullSettledDetails);
          if (fullSettledDetails.size !== fullSettledDetails.filled_size) {
            console.log('!!!!!!!!!!!!!!! the order was not fully settled!');
          }
          // update the order in the db
          const queryText = `UPDATE "orders" SET "settled" = $1, "done_at" = $2, "fill_fees" = $3, "filled_size" = $4, "executed_value" = $5 WHERE "id"=$6;`;
          await pool.query(queryText, [
            fullSettledDetails.settled,
            fullSettledDetails.done_at,
            fullSettledDetails.fill_fees,
            fullSettledDetails.filled_size,
            fullSettledDetails.executed_value,
            orderToCheck.id
          ]);
        } catch (err) {
          // handle not found order
          if (err.response?.status === 404) {
            // if the order was supposed to be canceled, cancel it
            if (orderToCheck.will_cancel) {
              console.log('need to delete for sure', orderToCheck);
              // delete the trade from the db
              await databaseClient.deleteTrade(orderToCheck.id);
            }
            // if the order was not supposed to be canceled, reorder it
            else {
              console.log('need to reorder', orderToCheck.price);
              try {
                await reorder(orderToCheck, userID);
              } catch (err) {
                console.log('error reordering trade', err);
              }
            } // end reorder
          } // end not found
          else {
            console.log('error in settleMultipleOrders loop', err);
          }
        } // end catch
      } // end for loop

      // if all goes well, resolve promise with success message
      resolve({
        message: "All settled orders were flipped successfully",
        ordersSettled: true
      });
    } else {
      // if no orders to settle, resolve
      resolve({
        message: "No orders to settle",
        ordersSettled: false
      });
    }
  })
}

async function reorder(orderToReorder) {
  return new Promise(async (resolve, reject) => {
    try {
      const userID = orderToReorder.userID;
      // console.log('2222222222 id is ', orderToReorder.id);
      await sleep(1000);
      console.log('looking again for the order before reordering', orderToReorder.userID);


      // let success = await coinbaseClient.repeatedCheck(orderToReorder, userID, 0);
      // console.log('was the order found by repeatedChecker?', success);


      let fullSettledDetails = await coinbaseClient.getOrder(orderToReorder.id, orderToReorder.userID);
      console.log('did it find the order?', fullSettledDetails);
    } catch (err) {
      console.log('did not find the order', err.response?.status);
      let cancelling = await databaseClient.checkIfCancelling(orderToReorder.id);
      console.log('cancelling?:', cancelling);
      if ((err.response?.status === 404) && (!cancelling)) {
        try {
          const tradeDetails = {
            original_sell_price: orderToReorder.original_sell_price,
            original_buy_price: orderToReorder.original_buy_price,
            side: orderToReorder.side,
            price: orderToReorder.price, // USD
            size: orderToReorder.size, // BTC
            product_id: orderToReorder.product_id,
            trade_pair_ratio: orderToReorder.trade_pair_ratio,
            stp: 'cn',
            userID: orderToReorder.userID,
          };
          // send the new order with the trade details
          let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
          // store the new trade in the db. the trade details are also sent to store trade position prices
          let results = await databaseClient.storeTrade(pendingTrade, tradeDetails);

          // delete the old order from the db
          const queryText = `DELETE from "orders" WHERE "id"=$1;`;
          await pool.query(queryText, [orderToReorder.id]);
          socketClient.emit('message', {
            message: `trade was reordered`,
            orderUpdate: true,
            userID: Number(orderToReorder.userID)
          });
          resolve({
            results: results,
            reordered: true
          })
        } catch (err) {
          if (err.response?.status === 400) {
            console.log('Insufficient funds when reordering missing trade in the loop!');
            socketClient.emit('message', {
              error: `Insufficient funds!`,
              orderUpdate: true,
              userID: Number(orderToReorder.userID)
            });
            reject('Insufficient funds')
          }
          console.log('error in reorder function in robot.js');
          reject(err)
        }
      }
    }
    resolve();
  });
}



async function cancelMultipleOrders(ordersArray, userID) {
  return new Promise(async (resolve, reject) => {
    // set variable to track how many orders were actually canceled
    let quantity = 0;
    if (ordersArray.length > 0) {
      console.log(`There are ${ordersArray.length} extra orders that may need to be canceled`);
      // need to wait and double check db before deleting because they take time to store and show up on cb first
      // only need to wait once because as the loop runs nothing will be added to it. Only wait for most recent order
      await sleep(2000);


      for (let i = 0; i < ordersArray.length; i++) {
        const orderToCancel = ordersArray[i];
        try {
          // check to make sure it really isn't in the db
          let doubleCheck = await databaseClient.getSingleTrade(orderToCancel.id);
          if (!doubleCheck) {
            // cancel the order if nothing comes back from db
            console.log('canceling order', orderToCancel.id, 'at price', orderToCancel.price);
            await coinbaseClient.cancelOrder(orderToCancel.id, userID);
            quantity++;
          } else {
            console.log('checked again for the order in the db', doubleCheck.id, doubleCheck.price);
          }
        } catch (err) {
          if (err.response?.status === 404) {
            console.log('order not found when canceling extra order!');
            // if not found, cancel all orders may have been done, so get out of the loop
            // new array will be made on next loop
            i += ordersArray.length; // don't use break because need current loop iteration to finish
          } else if (err.response?.status === 401 || err.response?.status === 502) {
            console.log('connection issue in cancel orders loop. Probably nothing to worry about');
            socketClient.emit('message', {
              error: `Connection issue in cancel orders loop. Probably nothing to worry about unless it keeps repeating.`,
              orderUpdate: true,
              userID: Number(userID)
            });
          } else {
            console.log('unknown error in cancelMultipleOrders for loop', err);
          }
        }
        // wait to prevent rate limiting
        await sleep(100);
      } //end for loop
      // if all goes well, resolve promise with success message
      resolve({
        message: `${quantity} Extra orders were canceled`,
        ordersCanceled: true,
        quantity: quantity
      })
    } else {
      resolve({
        message: "No orders to cancel",
        ordersCanceled: false,
        quantity: quantity
      })
    }
  });
}

async function syncEverything() {
  try {
    await coinbaseClient.cancelAllOrders();
    console.log('synching all orders');
    socketClient.emit('message', {
      message: `synching everything`,
      orderUpdate: true
    });
  } catch (err) {
    console.log('error at end of syncEverything function');
    socketClient.emit('message', {
      error: `unknown error when trying to sync everything`,
      orderUpdate: true
    });
  }
}

// take in an array and an item to check
function orderElimination(dbOrders, cbOrders) {
  for (let i = 0; i < cbOrders.length; i++) {
    // look at each id of coinbase orders
    const cbOrderID = cbOrders[i].id;
    // filter out dbOrders of that id
    dbOrders = dbOrders.filter(id => {
      return (id.id !== cbOrderID)
    })
  }
  // return a list of orders that are settled on cb, but have not yet been handled by the bot
  return dbOrders;
}



const robot = {
  // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
  // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
  canToggle: true,
  looping: false,
  loop: 0,
  busy: 0,
  sleep: sleep,
  flipTrade: flipTrade,
  syncOrders: syncOrders,
  synching: false,
  maxHistory: 200,
  processOrders: processOrders,
  syncEverything: syncEverything,
  startSync: startSync,
}


module.exports = robot;