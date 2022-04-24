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
    syncOrders(user.id, 0);
  });
}

// REST protocol to find orders that have settled on coinbase
async function syncOrders(userID, count) {
  let timer = true;
  setTimeout(() => {
    timer = false;
  }, 100);
  let user;
  let botSettings;
  try {
    botSettings = await databaseClient.getBotSettings();
    // console.log(botSettings);
    user = await databaseClient.getUserAndSettings(userID);
    if (count > botSettings.full_sync - 1) {
      count = 0
    }
    if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {

      // *** GET ORDERS THAT NEED PROCESSING ***

      // start with two empty arrays
      let dbOrders = [];
      let cbOrders = [];
      let ordersToCheck = [];
      let ordersToCancel = [];

      if (count === 0) {
        // full sync compares all trades that should be on CB with DB, and does other less frequent maintenance tasks
        const fullSyncOrders = await fullSync(userID, botSettings);

        dbOrders = fullSyncOrders.dbOrders;
        cbOrders = fullSyncOrders.cbOrders;
        ordersToCheck = fullSyncOrders.ordersToCheck;
        ordersToCancel = await orderElimination(cbOrders, dbOrders);

      } else {
        //  quick sync only checks fills endpoint and has fewer functions for less CPU usage
        ordersToCheck = await quickSync(userID, botSettings);
      }

      // also get a list of orders that are open on cb, but not stored in the db. 

      // *** CANCEL EXTRA ORDERS ON COINBASE THAT ARE NOT OPEN IN DATABASE ***
      if (ordersToCancel.length) {
        console.log(' deleting extra orders', ordersToCancel.length);
        try {
          let result = await cancelMultipleOrders(ordersToCancel, userID);
          // console.log('updating funds');
          await updateFunds(userID);
          if (result.ordersCanceled && (result.quantity > 0)) {
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
      }


      // *** SETTLE ORDERS IN DATABASE THAT ARE SETTLED ON COINBASE ***
      if (ordersToCheck.length) {
        try {
          let result = await settleMultipleOrders(ordersToCheck, userID);
          // console.log('updating funds');
          await updateFunds(userID);
        } catch (err) {
          if (err.response?.status === 500) {
            console.log('internal server error from coinbase');
            socketClient.emit('message', {
              error: `Internal server error from coinbase! Is the Coinbase Pro website down?`,
              orderUpdate: true,
              userID: Number(userID)
            });
          } else {
            console.log(err, 'Error settling all settled orders');
          }
        }
      }


      // PROCESS ALL ORDERS THAT HAVE BEEN CHANGED
      await processOrders(userID);

      // DELETE ALL ORDERS MARKED FOR DELETE
      await deleteMarkedOrders(userID);

      // const available = await getAvailableFunds(userID);
      // console.log('avail funds', available);
      // await databaseClient.saveFunds(available, userID);

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
    } else if (err.response?.statusText === 'Bad Gateway') {
      console.log('bad gateway');
    } else if (err.response?.statusText === 'Gateway Timeout') {
      console.log('Gateway Timeout');
    } else if (err.code === 'ECONNABORTED') {
      console.log('10 sec timeout');
    } else {
      console.log(err, 'unknown error at end of syncOrders');
    }
  } finally {
    socketClient.emit('message', {
      heartbeat: true,
      count: botSettings.full_sync - count,
      userID: Number(userID)
    });
    // when everything is done, call the sync again if the user still exists
    if (user) {
      while (timer) {
        await sleep(10);
        // console.log('not 100ms yet!');
      }
      if (!timer) {
        // console.log('100ms is up');
      }
      // console.log('time between full sync', time < 1000, time);
      setTimeout(() => {
        syncOrders(userID, count + 1);
      }, (botSettings.loop_speed * 10));
    } else {
      console.log('user is NOT THERE, stopping loop for user');
    }
  }
}

async function fullSync(userID, botSettings) {
  // IF FULL SYNC, compare all trades that should be on CB, and do other less frequent maintenance tasks
  return new Promise(async (resolve, reject) => {
    try {
      // initiate empty object to hold arrays that will be returned to the sync loop
      let fullSyncOrders = {
        dbOrders: [],
        cbOrders: [],
        ordersToCheck: []
      };

      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb
        databaseClient.getLimitedTrades(userID, botSettings.orders_to_sync),
        coinbaseClient.getOpenOrders(userID),
        // get fees
        coinbaseClient.getFees(userID)
      ]);
      // store the lists of orders in the corresponding arrays so they can be compared
      fullSyncOrders.dbOrders = results[0];
      fullSyncOrders.cbOrders = results[1];
      const fees = results[2];

      // console.log('updating funds in full sync');
      await updateFunds(userID);

      // need to get the fees for more accurate Available funds reporting
      // fees don't change frequently so only need to do this during full sync
      await databaseClient.saveFees(fees, userID);

      // compare the arrays and remove any where the ids match in both,
      // leaving a list of orders that are open in the db, but not on cb. Probably settled
      fullSyncOrders.ordersToCheck = await orderElimination(fullSyncOrders.dbOrders, fullSyncOrders.cbOrders);

      resolve(fullSyncOrders);
    } catch (err) {
      reject(err)
    }
  });
}

async function quickSync(userID, botSettings) {
  // IF QUICK SYNC, only get fills
  return new Promise(async (resolve, reject) => {
    try {
      // initiate empty array to hold orders that need to be checked for settlement
      let toCheck = [];
      // get the 500 most recent fills for the account
      const fills = await coinbaseClient.getLimitedFills(userID, 500);
      // look at each fill and find the order in the db associated with it
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        // get order from db
        const singleDbOrder = await databaseClient.getSingleTrade(fill.order_id);
        // only need to check it if there is an order in the db. Otherwise it might be a basic trade
        if (singleDbOrder) {
          // check if the order has already been settled in the db
          if (singleDbOrder && !singleDbOrder?.settled) {
            // if it has not been settled in the db, it needs to be checked with coinbase if it settled
            // push it into the array
            toCheck.push(singleDbOrder);
          } else {
            // if it has been settled, we can stop looping because we will have already check all previous fills
            i += fills.length;
          }
        }
      }
      // this will check the specified number of trades to sync on either side to see if any 
      // need to be reordered. It will only find them on a loop after a loop where trades have been placed
      // This could be faster? But still currently faster than waiting for a full sync
      // todo - maybe this should go after the settleMultipleOrders function so it will fire on same loop
      const reorders = await databaseClient.getReorders(userID, botSettings.orders_to_sync)
      if (reorders.length >= 1) {
        // console.log('!!!!! reordering reorders in quick sync robot.js quick sync function', reorders);
        reorders.forEach(order => toCheck.push(order))
      }
      resolve(toCheck);
    } catch (err) {
      reject(err)
    }
  });
}

async function deleteMarkedOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "orders" WHERE "will_cancel"=true AND "userID"=$1;`;
      let result = await pool.query(queryText, [userID]);
      if (result.rowCount > 0) {
        socketClient.emit('message', {
          message: `orders marked for cancel were deleted from db`,
          orderUpdate: true,
          userID: Number(userID)
        });
      }
      resolve(result);
    } catch (err) {
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
        let tradeDetails = flipTrade(dbOrder, user, tradeList, i);
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
            console.log(err.response, 'Insufficient funds! from processOrders');
            socketClient.emit('message', {
              error: `Insufficient funds in processOrders!`,
              userID: Number(dbOrder.userID)
            });
            // todo - check funds to make sure there is enough for 
            // all of them to be replaced, and balance if needed
          } else {
            console.log(err, 'unknown error in processOrders');
          }
        }
        // avoid rate limiting and give orders time to settle before checking again
        await sleep(150)
      }
    } else {
      resolve();
    }
    resolve();
  });
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
function flipTrade(dbOrder, user, allFlips, iteration) {
  const reinvestRatio = user.reinvest_ratio / 100;
  const postMaxReinvestRatio = user.post_max_reinvest_ratio / 100;
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
      console.log('all flips', allFlips);
      console.log('user will reinvest. available:', user.actualavailable_usd, 'order:', dbOrder.executed_value);
      const orderSize = Number(dbOrder.size);

      const BTCprofit = calculateProfitBTC(dbOrder);
      // console.log('testing calculateProfitBTC', BTCprofit);

      let amountToReinvest = BTCprofit * reinvestRatio;
      if (amountToReinvest <= 0) {
        console.log('negative profit');
        amountToReinvest = 0;
      }
      // console.log('to reinvest', amountToReinvest);

      const newSize = Math.floor((orderSize + amountToReinvest) * 100000000) / 100000000;

      const buyPrice = dbOrder.original_buy_price;
      const maxSizeBTC = Number((maxTradeSize / buyPrice).toFixed(8));

      if ((newSize > maxSizeBTC) && (maxTradeSize > 0)) {



        // add up all values of trades that just settled and subtract that from "actualavailable_usd"
        let allFlipsValue = 0;
        allFlips.forEach(trade => {
          if (trade.side === "sell") {
            console.log('adding sell value to all flips total', user);
            allFlipsValue += (maxSizeBTC * trade.original_buy_price)
          }
        });

        // calculate what funds will be leftover after all pending flips go through
        const leftoverFunds = (Number(user.actualavailable_usd) - (allFlipsValue * (1 + Number(user.maker_fee))));




        // only set the new size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          console.log('there is enough money left to reinvest IN MAX SIZE ADJUSTED FLIP');
          // tradeDetails.size = newSize.toFixed(8);
          // if the new size is bigger than the user set max, just use the user set max instead
          tradeDetails.size = maxSizeBTC;
        } else {
          console.log('there is NOT enough money left to reinvest IN MAX SIZE ADJUSTED FLIP');
        }



        if ((orderSize >= maxSizeBTC) && (postMaxReinvestRatio > 0)) {
          // console.log('the old size is the same as or bigger than the max!');
          // at this point, the post max ratio should be used
          const postMaxAmountToReinvest = BTCprofit * postMaxReinvestRatio;
          // console.log('postMaxAmountToReinvest', postMaxAmountToReinvest);
          const postMaxNewSize = Math.floor((orderSize + postMaxAmountToReinvest) * 100000000) / 100000000;
          // console.log('postMaxNewSize', postMaxNewSize);
          tradeDetails.size = postMaxNewSize;
        }
      } else if (newSize < 0.000016) {
        // need to stay above minimum order size
        tradeDetails.size = 0.000016;
      } else {
        // add up all values of trades that just settled and subtract that from "actualavailable_usd"
        let allFlipsValue = 0;
        allFlips.forEach(trade => {
          if (trade.side === "sell") {
            console.log('adding sell value to all flips total', user);
            allFlipsValue += (trade.size * trade.original_buy_price)
          }
        });

        // calculate what funds will be leftover after all pending flips go through
        const leftoverFunds = (Number(user.actualavailable_usd) - (allFlipsValue * (1 + Number(user.maker_fee))));

        // only set the new size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          console.log('there is enough money left to reinvest');
          tradeDetails.size = newSize.toFixed(8);
        } else {
          console.log('there is NOT enough money left to reinvest');
        }
      }

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

function calculateProfitBTC(dbOrder) {

  let margin = (dbOrder.original_sell_price - dbOrder.original_buy_price)
  let grossProfit = Number(margin * dbOrder.size)
  let profit = Number(grossProfit - (Number(dbOrder.fill_fees) + Number(dbOrder.previous_fill_fees)))
  let profitBTC = Number((Math.floor((profit / dbOrder.price) * 100000000) / 100000000))

  return profitBTC;
}


// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function settleMultipleOrders(ordersArray, userID) {
  return new Promise(async (resolve, reject) => {
    if (ordersArray.length > 0) {
      socketClient.emit('message', {
        message: `There are ${ordersArray.length} orders that need to be synced`,
        userID: Number(userID)
      });
      // loop over the array and flip each trade
      for (let i = 0; i < ordersArray.length; i++) {
        const orderToCheck = ordersArray[i];


        let reorderTimer = true;
        setTimeout(() => {
          reorderTimer = false;
        }, 80);
        // send heartbeat for each loop
        socketClient.emit('message', {
          heartbeat: true,
          userID: Number(userID)
        });
        try {
          // get all the order details from cb
          // console.log('ORDER TO CHECK:', orderToCheck);
          // await sleep(80); // avoid rate limiting
          // console.log('checking order:', orderToCheck);
          let fullSettledDetails = await coinbaseClient.getOrder(orderToCheck.id, userID);
          // console.log('full details:', fullSettledDetails);
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
          // console.log(err);
          // handle not found order
          if (err.response?.status === 404) {
            // if the order was supposed to be canceled, cancel it
            if (orderToCheck.will_cancel) {
              // delete the trade from the db
              await databaseClient.deleteTrade(orderToCheck.id);
            }
            // if the order was not supposed to be canceled, reorder it
            else {
              try {
                await reorder(orderToCheck, userID);
              } catch (err) {
                console.log(err, 'error reordering trade');
              }
            } // end reorder
          } // end not found
          else {
            console.log(err, 'error in settleMultipleOrders loop');
          }
        } // end catch
        while (reorderTimer) {
          await sleep(10);
          // console.log('not 100ms reorder timer yet!');
        }
        // console.log('======reorder timer is up');
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
    let upToDateDbOrder;
    try {
      const userID = orderToReorder.userID;
      upToDateDbOrder = await databaseClient.getSingleTrade(orderToReorder.id);

      // if the order is marked for reordering, it was deleted already and there is no need to wait to double check
      if (upToDateDbOrder.reorder) {
        // also need to ensure that the order was not supposed to be canceled 
        if (!upToDateDbOrder.will_cancel) {
          try {
            const tradeDetails = {
              original_sell_price: upToDateDbOrder.original_sell_price,
              original_buy_price: upToDateDbOrder.original_buy_price,
              side: upToDateDbOrder.side,
              price: upToDateDbOrder.price, // USD
              size: upToDateDbOrder.size, // BTC
              product_id: upToDateDbOrder.product_id,
              trade_pair_ratio: upToDateDbOrder.trade_pair_ratio,
              stp: 'cn',
              userID: upToDateDbOrder.userID,
            };
            // send the new order with the trade details
            let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
            // because the storeDetails function will see the tradeDetails as the "old order", need to store previous_fill_fees as just fill_fees
            tradeDetails.fill_fees = upToDateDbOrder.previous_fill_fees;
            // store the new trade in the db. the trade details are also sent to store trade position prices
            let results = await databaseClient.storeTrade(pendingTrade, tradeDetails);

            // delete the old order from the db
            const queryText = `DELETE from "orders" WHERE "id"=$1;`;
            await pool.query(queryText, [orderToReorder.id]);
            // tell the DOM to update
            socketClient.emit('message', {
              message: `trade was reordered`,
              orderUpdate: true,
              userID: Number(upToDateDbOrder.userID)
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
            console.log(err, 'error in reorder function in robot.js');
            reject(err)
          }
        }
      } else {
        await sleep(1000);
        // check again. if it finds it, don't do anything. If not found, error handling will reorder
        console.log('checking again before reordering', orderToReorder);
        let fullSettledDetails = await coinbaseClient.getOrder(orderToReorder.id, orderToReorder.userID);
      }
    } catch (err) {
      let cancelling = await databaseClient.checkIfCancelling(orderToReorder.id);
      if ((err.response?.status === 404) && (!cancelling)) {
        console.log('reordering', upToDateDbOrder);
        try {
          const tradeDetails = {
            original_sell_price: upToDateDbOrder.original_sell_price,
            original_buy_price: upToDateDbOrder.original_buy_price,
            side: upToDateDbOrder.side,
            price: upToDateDbOrder.price, // USD
            size: upToDateDbOrder.size, // BTC
            product_id: upToDateDbOrder.product_id,
            trade_pair_ratio: upToDateDbOrder.trade_pair_ratio,
            stp: 'cn',
            userID: orderToReorder.userID,
          };
          // send the new order with the trade details
          let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
          // because the storeDetails function will see the tradeDetails as the "old order", need to store previous_fill_fees as just fill_fees
          tradeDetails.fill_fees = upToDateDbOrder.previous_fill_fees;
          // store the new trade in the db. the trade details are also sent to store trade position prices
          let results = await databaseClient.storeTrade(pendingTrade, tradeDetails);

          // delete the old order from the db
          const queryText = `DELETE from "orders" WHERE "id"=$1;`;
          await pool.query(queryText, [orderToReorder.id]);
          // tell the DOM to update
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
    // console.log('ordersArray', ordersArray);
    if (ordersArray.length > 0) {
      // need to wait and double check db before deleting because they take time to store and show up on cb first
      // only need to wait once because as the loop runs nothing will be added to it. Only wait for most recent order
      await sleep(2000);

      for (let i = 0; i < ordersArray.length; i++) {
        const orderToCancel = ordersArray[i];
        try {
          // check to make sure it really isn't in the db
          let doubleCheck = await databaseClient.getSingleTrade(orderToCancel.id);
          // console.log('double check', doubleCheck);
          if (doubleCheck) {
            // if it is in the db, it should cancel but set it to reorder because it is out of range
            // that way it will reorder faster when it moves back in range
            // console.log('canceling order', orderToCancel);
            await coinbaseClient.cancelOrder(orderToCancel.id, userID);
            await databaseClient.setSingleReorder(orderToCancel.id);
            // console.log('old trade was set to reorder when back in range');
            quantity++;
          } else {
            // cancel the order if nothing comes back from db
            await coinbaseClient.cancelOrder(orderToCancel.id, userID);
            quantity++;
          }
        } catch (err) {
          if (err.response?.status === 404) {
            // console.log(err.response.data, 'order not found when cancelling');
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
            console.log(err, 'unknown error in cancelMultipleOrders for loop');
          }
        }
        // wait to prevent rate limiting
        await sleep(80);
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
  const orderCounts = await databaseClient.getUnsettledTradeCounts(user.id);
  const unsettledCounts = Number(orderCounts.totalOpenOrders.count);
  const userAndSettings = await databaseClient.getUserAndSettings(user.id);
  console.log('userAndSettings', userAndSettings.actualavailable_usd);
  console.log('unsettledCounts', unsettledCounts);
  if ((unsettledCounts >= 10000) || (Number(userAndSettings.actualavailable_usd) <= 0)) {
    console.log('too many trades');
    return;
  }

  // assume size is in btc
  let convertedAmount = parameters.size;

  // if size is in usd, convert it to btc
  if (parameters.sizeType === "USD") {
    // console.log('need to convert to btc!');
    // get the BTC size from the entered USD size
    convertedAmount = Number(Math.floor((parameters.size / parameters.startingValue) * 100000000)) / 100000000;
  }

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

    // update current funds
    await updateFunds(user.id);

    // tell the DOM to update
    socketClient.emit('message', {
      message: `trade was auto-placed`,
      orderUpdate: true,
      userID: Number(user.id)
    });

    await robot.sleep(500);

    // create new parameters 

    const newStartingValue = (Number(parameters.startingValue) + Number(parameters.increment)).toFixed(2);

    const newParameters = {
      startingValue: newStartingValue, // done
      increment: parameters.increment, // done
      trade_pair_ratio: parameters.trade_pair_ratio, // done
      size: parameters.size, // done
      sizeType: parameters.sizeType,
      product_id: parameters.product_id // done
    }


    // call the function again with the new parameters
    setTimeout(() => {
      autoSetup(user, newParameters);
    }, 100);

  } catch (err) {
    if (err.response?.status === 400) {
      console.log(err.response?.data?.message, 'Insufficient funds! Or too small order or some similar problem');
      if (err.response?.data?.message) {
        
        socketClient.emit('message', {
          error: err.response.data.message + " - Auto setup done",
          orderUpdate: true,
          userID: Number(user.id)
        });
      }
    } else if (err.code && err.code === 'ETIMEDOUT') {
      console.log('Timed out!!!!!');
      socketClient.emit('message', {
        error: `Connection timed out - Auto setup done to prevent gaps. You may want to start again.`,
        orderUpdate: true
      });
    } else {
      console.log(err, 'problem in autoSetup');
    }
  }
}

async function getAvailableFunds(userID, userSettings) {
  // console.log('getting available funds');
  return new Promise(async (resolve, reject) => {
    try {
      const makerFee = Number(userSettings.maker_fee) + 1;

      const results = await Promise.all([
        coinbaseClient.getAccounts(userID),
        // funds are withheld in usd when a buy is placed, so the maker fee is needed to subtract fees
        databaseClient.getSpentUSD(userID, makerFee),
        // funds are taken from the sale once settled, so the maker fee is not needed on the buys
        databaseClient.getSpentBTC(userID),
      ]);

      // calculate USD balances
      const [USD] = results[0].filter(account => account.currency === 'USD')
      const availableUSD = USD.available;
      const balanceUSD = USD.balance;
      const spentUSD = results[1].sum;
      // subtract the total amount spent from the total balanc
      const actualAvailableUSD = (balanceUSD - spentUSD).toFixed(16);
      
      // calculate BTC balances
      const [BTC] = results[0].filter(account => account.currency === 'BTC')
      const availableBTC = BTC.available;
      const balanceBTC = BTC.balance;
      const spentBTC = results[2].sum;
      // subtract the total amount spent from the total balanc
      const actualAvailableBTC = Number((balanceBTC - spentBTC).toFixed(16));

      const availableFunds = {
        availableBTC: availableBTC,
        balanceBTC: balanceBTC,
        availableUSD: availableUSD,
        balanceUSD: balanceUSD,
        actualAvailableBTC: actualAvailableBTC,
        actualAvailableUSD: actualAvailableUSD
      }

      resolve(availableFunds)
    } catch (err) { reject(err) }
  })
}

async function updateFunds(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const userSettings = await databaseClient.getUserAndSettings(userID);
      const available = await getAvailableFunds(userID, userSettings);

      await databaseClient.saveFunds(available, userID);

      if (Number(userSettings.actualavailable_usd) !== Number(available.actualAvailableUSD)) {
        // console.log('usd available did change');
        socketClient.emit('message', {
          orderUpdate: true,
          userID: Number(userID)
        });
      }

      resolve()
    } catch (err) { reject(err) }
  })
}


const robot = {
  sleep: sleep,
  flipTrade: flipTrade,
  syncOrders: syncOrders,
  processOrders: processOrders,
  syncEverything: syncEverything,
  startSync: startSync,
  autoSetup: autoSetup,
  getAvailableFunds: getAvailableFunds,
  updateFunds: updateFunds,
}


module.exports = robot;