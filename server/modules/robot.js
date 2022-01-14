const coinbaseClient = require("./coinbaseClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const socketClient = require("./socketClient");

// start a sync loop for each active user
async function startSync() {
  // get all users from the db
  const sqlText = `SELECT "id" FROM "user";`
  const result = await pool.query(sqlText);
  const userlist = result.rows;
  userlist.forEach(user => {
    syncOrders(user.id);
  });
}

// REST protocol to find orders that have settled on coinbase
async function syncOrders(userID) {
  let user;
  let botSettings;
  try {
    botSettings = await databaseClient.getBotSettings();
    user = await databaseClient.getUserAndSettings(userID);
    
    if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {

      // *** GET ORDERS THAT NEED PROCESSING ***

      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb
        databaseClient.getUnsettledTrades('all', userID),
        coinbaseClient.getOpenOrders(userID)
      ]);
      // store the lists of orders in the corresponding arrays so they can be compared
      const dbOrders = results[0];
      let cbOrders = results[1];

      const getMoreOrders = async () => {
        // find the oldest date in the returned orders
        const oldestDate = cbOrders[cbOrders.length - 1].created_at;

        await sleep(100); // avoid rate limit
        // use the oldest date to get open orders before that date
        const olderOrders = await coinbaseClient.getOpenOrdersBeforeDate(userID, oldestDate);

        // compare the arrays and remove any where the ids match in both,
        // leaving a list of orders that are older than the initial 1000 orders from cb
        const olderOrdersRemovedDuplicates = await orderElimination(olderOrders, cbOrders);
        // console.log('after removing duplicates', olderOrdersRemovedDuplicates);

        // Combine the arrays
        cbOrders = cbOrders.concat(olderOrdersRemovedDuplicates);
        
        // if there are 1000 orders, there may be more so check again
        if (olderOrders.length >= 1000) {
          await getMoreOrders();
        }
      }
      
      // CHECK IF THERE ARE 1000 OPEN ORDERS AND GET MORE FROM CB IF NEEDED
      if (cbOrders.length >= 1000) {
        await getMoreOrders();
      }
      

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
          // console.log(result.message);
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
          // console.log(result.message);
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
      // if the user is not active or is paused, loop every 5 seconds
      await sleep(5000);
    }
  } catch (err) {
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
      }, (botSettings.loopSpeed * 100));
    } else {
      console.log('user is NOT THERE, stopping loop for user');
    }
  }
}

async function deleteMarkedOrders(userID) {
  return new Promise(async (resolve, reject) => {
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
      // console.log('problem in deleteMarkedOrders function in robot', err);
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
    if (tradeList.length > 0) {
      // loop through all the settled orders and flip them
      for (let i = 0; i < tradeList.length; i++) {
        // ...take the first trade that needs to be flipped, 
        let dbOrder = tradeList[i];
        // get the user of the trade
        let user = await databaseClient.getUserAndSettings(dbOrder.userID);
        // ...flip the trade details
        let tradeDetails = flipTrade(dbOrder, user);
        // ...send the new trade
        try {
          let cancelling = await databaseClient.checkIfCancelling(dbOrder.id);
          if (!cancelling) {
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
            console.log('Timed out!!!!! from processOrders');
          } else if (err.response?.status === 400) {
            console.log('Insufficient funds! from processOrders');
            socketClient.emit('message', {
              error: `Insufficient funds in processOrders!`,
              userID: Number(dbOrder.userID)
            });
            // todo - check funds to make sure there is enough for 
            // all of them to be replaced, and balance if needed
          } else {
            console.log('unknown error in processOrders', err);
          }
        }
        // avoid rate limiting
        await sleep(100)
      }
    } else {
      resolve();
    }
    resolve();
  });
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
function flipTrade(dbOrder, user) {
  const reinvestRatio = user.reinvest_ratio / 100;
  const maxTradeSize = user.max_trade_size;
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

  let orderSize = Number(dbOrder.size);

  let margin = (dbOrder.original_sell_price - dbOrder.original_buy_price)
  let grossProfit = Number(margin * dbOrder.size)
  let profit = Number(grossProfit - (dbOrder.fill_fees * 2))
  let profitBTC = Number(Math.floor((profit / dbOrder.price) * reinvestRatio * 100000000) / 100000000)
  let newSize = Math.floor((orderSize + profitBTC) * 100000000) / 100000000;

  if (dbOrder.side === "buy") {
    // if it was a buy, sell for more. multiply old price
    tradeDetails.side = "sell"
    tradeDetails.price = dbOrder.original_sell_price;
    socketClient.emit('message', {
      message: `Selling for $${Number(tradeDetails.price)}`,
      userID: Number(dbOrder.userID)
    });
  } else {

    // if it is a sell turning into a buy, check if user wants to reinvest the funds
    if (user.reinvest) {
      let newPrice = dbOrder.original_buy_price;
      let newSizeString = newSize.toFixed(8);
      console.log('new size after reinvesting', newSizeString);
      let newSizeNumber = Number(newSizeString);
      console.log('new size as number', newSizeNumber, 'price', newPrice);
      let newSizeUSD = newSizeNumber * newPrice;
      console.log('new size in usd', newSizeUSD);
      console.log('user set max size in usd', maxTradeSize);

      if (newSizeUSD > maxTradeSize) {
        console.log('the new size is too big');
      } else {
        console.log('the new size is small enough');
      }

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
      // console.log(`User ${userID} has ${ordersArray.length} settled orders that should be flipped`);
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
          // await sleep(500);
          // get all the order details from cb
          await sleep(200); // avoid rate limiting
          let fullSettledDetails = await coinbaseClient.getOrder(orderToCheck.id, userID);
          // console.log('1111111111111 setting this trade as settled in the db', orderToCheck.id, orderToCheck.price, fullSettledDetails);
          if (fullSettledDetails.size !== fullSettledDetails.filled_size) {
            console.log('!!!!!!!!!!!!!!! the order was not fully settled!');
          }
          // update the order in the db
          const queryText = `UPDATE "orders" SET "settled" = $1, "done_at" = $2, "fill_fees" = $3, "filled_size" = $4, "executed_value" = $5, "done_reason" = $6 WHERE "id"=$7;`;
          await pool.query(queryText, [
            fullSettledDetails.settled,
            fullSettledDetails.done_at,
            fullSettledDetails.fill_fees,
            fullSettledDetails.filled_size,
            fullSettledDetails.executed_value,
            fullSettledDetails.done_reason,
            orderToCheck.id
          ]);
        } catch (err) {
          // handle not found order
          if (err.response?.status === 404) {
            // if the order was supposed to be canceled, cancel it
            if (orderToCheck.will_cancel) {
              // console.log('need to delete for sure', orderToCheck);
              // delete the trade from the db
              await databaseClient.deleteTrade(orderToCheck.id);
            }
            // if the order was not supposed to be canceled, reorder it
            else {
              // console.log('need to reorder', orderToCheck.price);
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
      // console.log('looking again for the order before reordering', orderToReorder);
      let upToDateDbOrder = await databaseClient.getSingleTrade(orderToReorder.id);
      // console.log('order in db up to date', upToDateDbOrder.reorder);

      // if the order is marked for reordering, it was deleted already and there is no need to wait to double check
      if (upToDateDbOrder.reorder) {
        // console.log('for sure need to reorder');
        if (!upToDateDbOrder.will_cancel) {
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
              // console.log('Insufficient funds when reordering missing trade in the loop!');
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
      } else {
        await sleep(1000);
        // check again. if it finds it, don't do anything. If not found, error handling will reorder
        let fullSettledDetails = await coinbaseClient.getOrder(orderToReorder.id, orderToReorder.userID);
      }
    } catch (err) {
      // console.log('did not find the order', err.response?.status);
      let cancelling = await databaseClient.checkIfCancelling(orderToReorder.id);
      // console.log('cancelling?:', cancelling);
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
            // console.log('Insufficient funds when reordering missing trade in the loop!');
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
      // console.log(`There are ${ordersArray.length} extra orders that may need to be canceled`);
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
            // console.log('canceling order', orderToCancel.id, 'at price', orderToCancel.price);
            await coinbaseClient.cancelOrder(orderToCancel.id, userID);
            quantity++;
          } else {
            // console.log('checked again for the order in the db', doubleCheck.id, doubleCheck.price);
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


// auto setup trades until run out of money
async function autoSetup(user, parameters) {
  // stop bot from adding more trades if 10000 already placed
  let totalOrders = await databaseClient.getUnsettledTrades('all', user.id);
  if (totalOrders.length >= 10000) {
    // console.log('more than 10000 unsettled orders');
    return;
  }
  // console.log('in autoSetup function', user, parameters);

  // get the BTC size from the entered USD size
  const convertedAmount = Number(Math.floor((parameters.size / parameters.startingValue) * 100000000)) / 100000000;
  // console.log(convertedAmount);

  // calculate original sell price
  let original_sell_price = (Math.round((parameters.startingValue * (Number(parameters.trade_pair_ratio) + 100))) / 100);

  const tradeDetails = {
    original_sell_price: original_sell_price, //done
    original_buy_price: parameters.startingValue, //done
    side: "buy", //done
    price: parameters.startingValue, // USD done
    size: convertedAmount, // BTC done
    product_id: parameters.product_id, //done
    stp: 'cn',
    userID: user.id,
    trade_pair_ratio: parameters.trade_pair_ratio
  };
  // console.log('trade details', tradeDetails);

  // send the order through
  try {
    // send the new order with the trade details
    let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
    // console.log('pending trade', pendingTrade);
    // wait a second before storing the trade. Sometimes it takes a second for coinbase to register the trade,
    // even after returning the details. robot.syncOrders will think it settled if it sees it in the db first
    await robot.sleep(100);
    // store the new trade in the db. the trade details are also sent to store trade position prices
    await databaseClient.storeTrade(pendingTrade, tradeDetails);

    await robot.sleep(1000);

    // create new parameters 

    const newStartingValue = (Number(parameters.startingValue) + Number(parameters.increment));

    const newParameters = {
      startingValue: newStartingValue, // done
      increment: parameters.increment, // done
      trade_pair_ratio: parameters.trade_pair_ratio, // done
      size: parameters.size, // done
      product_id: parameters.product_id // done
    }


    // call the function again with the new parameters
    setTimeout(() => {
      autoSetup(user, newParameters);
    }, 100);

  } catch (err) {
    if (err.response?.status === 400) {
      console.log('Insufficient funds! Or too small order or some similar problem');
      socketClient.emit('message', {
        error: `Insufficient funds!`,
        orderUpdate: true
      });
    } else if (err.code && err.code === 'ETIMEDOUT') {
      console.log('Timed out!!!!!');
      socketClient.emit('message', {
        error: `Connection timed out, consider synching all orders to prevent duplicates. This will not be done for you.`,
        orderUpdate: true
      });
    } else {
      console.log('problem in autoSetup', err);
    }
  }
}


const robot = {
  sleep: sleep,
  flipTrade: flipTrade,
  syncOrders: syncOrders,
  processOrders: processOrders,
  syncEverything: syncEverything,
  startSync: startSync,
  autoSetup: autoSetup,
}


module.exports = robot;