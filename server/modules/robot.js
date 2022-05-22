const coinbaseClient = require("./coinbaseClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const socketClient = require("./socketClient");
const cache = require("./cache")

// const startTime = performance.now();
// const endTime = performance.now();
// console.log(`getFees redis took ${endTime - startTime} milliseconds`)

// runAtStart()
function runAtStart(userID) {
  console.log('first');
  const many = countMany(1000000000)
  console.log(many)
  console.log('third');
  cache.setKey(userID, 'name', 'thomas');
  cache.setKey(userID, 'name', 'dan');
  cache.setKey(userID, 'age', 23);
  cache.setKey(userID, 'friends', ['jane', 'mark', 'julia']);
  const name = cache.getKey(userID, 'name')
  console.log('stored name is:', name);
}

function countMany(num) {
  // return new Promise((resolve, reject) => {
  let count = 0;
  while (count < num) {
    count++;
  }
  return 'second'
  // resolve('second');
  // })
}

// this will keep track of and update general bot settings
async function botLoop() {
  userID = 0
  // console.log('botLoop');
  try {
    botSettings = await databaseClient.getBotSettings();
    // console.log(botSettings);
    cache.setKey(userID, 'botSettings', botSettings);
    // console.log(cache.getKey(0, 'botSettings'));
  } catch (err) {
    console.log(err, 'error in botLoop');
  } finally {
    setTimeout(() => {
      botLoop();
    }, 5000);
  }
}

// start a sync loop for each active user
async function startSync() {
  robotUser = {
    // user table starts at 1 so bot can be user 0 since storage array starts at 0
    id: 0
  }
  cache.newUser(robotUser);
  await botLoop();
  // get all users from the db
  const userList = await databaseClient.getAllUsers();
  userList.forEach(async user => {
    const userID = user.id
    // set up cache for user
    await cache.newUser(user);
    // start the loop
    syncOrders(userID, 0);
    // deSyncOrderLoop(user, 0);
  });
}

// REST protocol to find orders that have settled on coinbase
async function syncOrders(userID, count) {
  // console.log('cache for user', userID, cache.storage[userID]);
  // console.log('loop number', cache.getLoopNumber(userID))
  cache.increaseLoopNumber(userID);
  cache.updateStatus(userID, 'begin main loop');
  let timer = true;
  setTimeout(() => {
    timer = false;
  }, 100);
  let user;
  // store user API separate from user so it is not accidentally sent outside the server
  const userAPI = cache.getAPI(userID);
  // console.log('user API', userAPI);
  const botSettings = cache.getKey(0, 'botSettings');
  try {
    cache.updateStatus(userID, 'getting settings');
    user = await databaseClient.getUserAndSettings(userID);
    const loopNumber = cache.getLoopNumber(userID);

    if (loopNumber === 1 && user.admin) {
      runAtStart(userID);
    }


    if (count > botSettings.full_sync - 1) {
      count = 0
    }
    if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {


      // *** GET ORDERS THAT NEED PROCESSING ***

      let ordersToCheck = [];

      if (count === 0) {
        // *** FULL SYNC ***
        const full = await Promise.all([
          // full sync compares all trades that should be on CB with DB, and does other less frequent maintenance tasks
          // API ENDPOINTS USED: orders, fees
          fullSync(userID),
          // these two can run at the same time because they are mutually exclusive based on the will_cancel column
          // PROCESS ALL ORDERS THAT HAVE BEEN CHANGED
          processOrders(userID)
        ]);
        const fullSyncOrders = full[0]
        ordersToCheck = fullSyncOrders.ordersToCheck;

      } else {
        // *** QUICK SYNC ***
        cache.updateStatus(userID, 'start all quick sync')

        // can run all three of these at the same time. 
        // Process orders looks for orders that are settled and not flipped,
        // and quickSync check if they are settled before acting on them
        // so processOrders will flip trades from the previous cycle while quickSync gets new ones
        const quick = await Promise.all([
          //  quick sync only checks fills endpoint and has fewer functions for less CPU usage
          // API ENDPOINTS USED: fills
          quickSync(userID),
          // these two can run at the same time because they are mutually exclusive based on the will_cancel column
          // PROCESS ALL ORDERS THAT HAVE BEEN CHANGED
          processOrders(userID),
          // desync extra orders
          deSync(userID)
          // DELETE ALL ORDERS MARKED FOR DELETE
          // deleteMarkedOrders(userID)
        ]);
        cache.updateStatus(userID, 'end all quick sync');

        ordersToCheck = quick[0];

      }

      if (ordersToCheck.length) {
        console.log('orders to check cache:', cache.getKey(userID, 'ordersToCheck'));
        console.log('orders to check robot:', ordersToCheck);
      }

      // *** SETTLE ORDERS IN DATABASE THAT ARE SETTLED ON COINBASE ***
      // if (ordersToCheck.length) {
      cache.updateStatus(userID, 'start SMO from main loop');
      // API ENDPOINTS USED: orders
      await settleMultipleOrders(ordersToCheck, userID);
      cache.updateStatus(userID, 'end settle multiple orders, in main loop');
      // console.log('updating funds');
      await updateFunds(userID);


      // move this back down here because orders need to stay in the db even if canceled until processOrders is done
      // the problem being that it might replace the order based on something stored in an array
      cache.updateStatus(userID, 'main loop - delete marked orders');
      await deleteMarkedOrders(userID);
      cache.updateStatus(userID, 'end delete marked orders');

    } else {
      // if the user is not active or is paused, loop every 5 seconds
      await sleep(5000);
    }
  } catch (err) {
    let errorData;
    let errorText;
    if (err.response?.data) {
      errorData = err.response.data
    }
    cache.updateStatus(userID, 'error in the main loop');
    if (err.code === 'ECONNRESET') {
      errorText = 'Connection reset by Coinbase server';
      console.log('Connection reset by Coinbase server');
    } else if (err.response?.status === 500) {
      console.log('internal server error from coinbase');
      errorText = 'internal server error from coinbase';
      socketClient.emit('message', {
        error: `Internal server error from coinbase! Is the Coinbase Pro website down?`,
        orderUpdate: true,
        userID: Number(userID)
      });
    } else if (err.response?.status === 401) {
      console.log('Invalid Signature');
      errorText = 'Invalid Signature';
      socketClient.emit('message', {
        error: `Invalid Signature end of syncOrders!`,
        orderUpdate: false,
        userID: Number(userID)
      });
    } else if (err.response?.statusText === 'Bad Gateway') {
      console.log('bad gateway');
      errorText = 'Bad Gateway';
    } else if (err.response?.statusText === 'Gateway Timeout') {
      console.log('Gateway Timeout');
      errorText = 'Gateway Timeout';
    } else if (err.code === 'ECONNABORTED') {
      console.log('10 sec timeout');
      errorText = '10 second timeout';
    } else {
      console.log(err, 'unknown error at end of syncOrders');
      errorText = 'Unknown error at end of syncOrders';
    }
    cache.storeError(userID, {
      errorData: errorData,
      errorText: errorText
    })
  } finally {
    heartBeat(userID, botSettings, true);
    cache.updateStatus(userID, 'end main loop finally');
    cache.deleteKey(userID, 'ordersToCheck');

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
      // console.log('cache', userID, cache.storage);
      setTimeout(() => {
        cache.clearStatus(userID);
        syncOrders(userID, count + 1);
      }, (botSettings.loop_speed * 10));
    } else {
      console.log('user is NOT THERE, stopping loop for user');
    }
  }
}


async function deSync(userID) {
  cache.updateStatus(userID, 'begin desync');

  const userAPI = cache.getAPI(userID);
  const botSettings = cache.getKey(0, 'botSettings');

  return new Promise(async (resolve, reject) => {
    try {
      let allToDeSync = [];
      // get the buys and sells that need to desync
      const ordersToDeSync = await Promise.all([
        databaseClient.getDeSyncs(userID, botSettings.orders_to_sync, 'buys'),
        databaseClient.getDeSyncs(userID, botSettings.orders_to_sync, 'sells')
      ]);
      let buysToDeSync = ordersToDeSync[0];
      let sellsToDeSync = ordersToDeSync[1];

      // push them into the all array
      allToDeSync.push(...buysToDeSync);
      allToDeSync.push(...sellsToDeSync);

      // cancel them all
      await cancelMultipleOrders(allToDeSync, userID, true, userAPI);

      cache.updateStatus(userID, 'end desync');
      resolve();
    } catch (err) {
      cache.updateStatus(userID, 'error in desync');
      reject(err)
    }
  });
}


async function fullSync(userID) {
  cache.updateStatus(userID, 'begin full sync');

  const userAPI = cache.getAPI(userID);
  const botSettings = cache.getKey(0, 'botSettings');
  // IF FULL SYNC, compare all trades that should be on CB, and do other less frequent maintenance tasks
  return new Promise(async (resolve, reject) => {
    try {
      // initiate empty object to hold arrays that will be returned to the sync loop
      let fullSyncOrders = {
        dbOrders: [],
        cbOrders: [],
        ordersToCheck: [],
        ordersToCancel: []
      };
      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb

        // databaseClient.getLimitedTrades(userID, botSettings.orders_to_sync),
        // not sure this should be getting trades whether or not they are settled. Made new db function where settled=false
        databaseClient.getLimitedUnsettledTrades(userID, botSettings.orders_to_sync),
        coinbaseClient.getOpenOrders(userID, userAPI),
        // get fees
        coinbaseClient.getFees(userID, userAPI)
      ]);
      cache.updateStatus(userID, 'done getting trades to compare');
      // store the lists of orders in the corresponding arrays so they can be compared
      fullSyncOrders.dbOrders = results[0];
      fullSyncOrders.cbOrders = results[1];
      const fees = results[2];

      await updateFunds(userID);
      cache.updateStatus(userID, 'done updating funds full sync');

      // need to get the fees for more accurate Available funds reporting
      // fees don't change frequently so only need to do this during full sync
      await databaseClient.saveFees(fees, userID);

      // compare the arrays and remove any where the ids match in both,
      // leaving a list of orders that are open in the db, but not on cb. Probably settled
      fullSyncOrders.ordersToCheck = await orderElimination(fullSyncOrders.dbOrders, fullSyncOrders.cbOrders);
      // also get a list of orders that are open on cb, but not in the db. Need to cancel them
      fullSyncOrders.ordersToCancel = await orderElimination(fullSyncOrders.cbOrders, fullSyncOrders.dbOrders);

      // *** CANCEL EXTRA ORDERS ON COINBASE THAT ARE NOT OPEN IN DATABASE ***
      if (fullSyncOrders.ordersToCancel.length) {
        // the 'false' in the third param is telling the function to sleep for a little bit.
        // this is needed during full sync because full sync deletes all orders on CB that are not in DB,
        // but they show up on cb first and the bot may detect and accidentally cancel them if it doesn't wait for the db
        // console.log('canceling extra orders in fullSync', fullSyncOrders.ordersToCancel);
        // API ENDPOINTS USED: orders, accounts
        cache.updateStatus(userID, 'will cancel multiple orders');
        await cancelMultipleOrders(fullSyncOrders.ordersToCancel, userID, false, userAPI);
        cache.updateStatus(userID, 'done canceling multiple orders');

        // wait for a second to allow cancels to go through so bot doesn't cancel twice
        await sleep(1000);
      }
      cache.updateStatus(userID, 'will resolve full sync');

      cache.setKey(userID, 'ordersToCheck', fullSyncOrders.ordersToCheck);
      resolve(fullSyncOrders);
    } catch (err) {
      cache.updateStatus(userID, 'error in full sync');
      reject(err)
    } finally {
      cache.updateStatus(userID, 'done full sync');
    }
  });
}

async function quickSync(userID) {
  cache.updateStatus(userID, 'begin quick sync');

  const userAPI = cache.getAPI(userID);
  const botSettings = cache.getKey(0, 'botSettings');
  // IF QUICK SYNC, only get fills
  return new Promise(async (resolve, reject) => {
    try {
      // initiate empty array to hold orders that need to be checked for settlement
      let toCheck = [];
      // get the 500 most recent fills for the account
      const fills = await coinbaseClient.getLimitedFills(userID, 500, userAPI);
      cache.updateStatus(userID, 'done getting quick sync fills');
      // look at each fill and find the order in the db associated with it
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        const recentFill = cache.getKey(userID, 'recentFill')
        // console.log('recent fill', recentFill);
        // get order from db
        if (fill.settled) {
          if (recentFill != fill.order_id) {
            console.log('they are NOT the same')

            const singleDbOrder = await databaseClient.getSingleTrade(fill.order_id);
            console.log('SINGLE ORDER', fill.order_id);

            // only need to check it if there is an order in the db. Otherwise it might be a basic trade
            if (singleDbOrder) {
              // check if the order has already been settled in the db
              console.log('SINGLE ORDER', fill.settled);
              // if (!fill.settled) {

              // }
              if (singleDbOrder && !singleDbOrder?.settled) {
                // if it has not been settled in the db, it needs to be checked with coinbase if it settled
                // push it into the array
                toCheck.push(singleDbOrder);
              } else {
                // if it has been settled, we can stop looping because we will have already check all previous fills
                // i += fills.length;
                break;
              }
            }
          } else {
            break;
          }
        } // end if (fill.settled)
      } // end for loop
      // console.log('HERE IS THE FILL', fills[0]);
      // after checking fills, store the most recent so don't need to check it later
      cache.setKey(userID, 'recentFill', fills[0].order_id);

      cache.updateStatus(userID, 'done checking fills');
      // this will check the specified number of trades to sync on either side to see if any 
      // need to be reordered. It will only find them on a loop after a loop where trades have been placed
      // This could be faster? But still currently faster than waiting for a full sync
      // todo - maybe this should go after the settleMultipleOrders function so it will fire on same loop
      const reorders = await databaseClient.getReorders(userID, botSettings.orders_to_sync)
      if (reorders.length >= 1) {
        reorders.forEach(order => toCheck.push(order))
      }
      cache.updateStatus(userID, 'will resolve quick sync');

      cache.setKey(userID, 'ordersToCheck', toCheck);
      resolve(toCheck);
    } catch (err) {
      cache.updateStatus(userID, 'error in quick sync');
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
  cache.updateStatus(userID, 'start process orders');
  const userAPI = cache.getAPI(userID);
  return new Promise(async (resolve, reject) => {
    // check all trades in db that are both settled and NOT flipped
    sqlText = `SELECT * FROM "orders" WHERE "settled"=true AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;
    // store the trades in an object
    const result = await pool.query(sqlText, [userID]);
    const tradeList = result.rows;
    cache.updateStatus(userID, 'got all orders to process');
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
            let cbOrder = await coinbaseClient.placeOrder(tradeDetails, userAPI);
            // ...store the new trade
            // take the time the new order was created, and use it as the flipped_at value
            await databaseClient.storeTrade(cbOrder, dbOrder, cbOrder.created_at);
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
          cache.updateStatus(userID, 'error in process orders loop');
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
      } // end for loop
    } else {
      cache.updateStatus(userID, 'end resolve processOrders');
      resolve();
    }
    cache.updateStatus(userID, 'end resolve processOrders');
    resolve();
  });
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
function flipTrade(dbOrder, user, allFlips, iteration) {
  const userID = user.id
  cache.updateStatus(userID, 'start flip trade');
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
      const orderSize = Number(dbOrder.size);

      // find out how much profit there was
      const BTCprofit = calculateProfitBTC(dbOrder);

      let amountToReinvest = BTCprofit * reinvestRatio;
      if (amountToReinvest <= 0) {
        console.log('negative profit');
        amountToReinvest = 0;
        socketClient.emit('message', {
          error: `Just saw a negative profit! Maybe increase your trade-pair ratio? 
          This may also be due to fees that were charged during setup or at a different fee tier.`,
          orderUpdate: false,
          userID: Number(dbOrder.userID)
        });
      }

      // safer to round down the investment amount. 
      // If user invest 100%, it should not round up and potentially take their balance negative
      const newSize = Math.floor((orderSize + amountToReinvest) * 100000000) / 100000000;

      const buyPrice = dbOrder.original_buy_price;
      const maxSizeBTC = Number((maxTradeSize / buyPrice).toFixed(8));

      // now check if the new size after reinvesting is higher than the user set max
      if ((newSize > maxSizeBTC) && (maxTradeSize > 0)) {
        // add up all values of trades that just settled and subtract that from "actualavailable_usd"
        let allFlipsValue = 0;
        allFlips.forEach(trade => {
          if (trade.side === "sell") {
            allFlipsValue += (maxSizeBTC * trade.original_buy_price)
          }
        });

        // calculate what funds will be leftover after all pending flips go through
        const leftoverFunds = (Number(user.actualavailable_usd) - (allFlipsValue * (1 + Number(user.maker_fee))));

        // only set the new size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          // if there is enough money left in the account to reinvest, set the size to the max size
          tradeDetails.size = maxSizeBTC;
        }

        // check if the new size has already surpassed the user set max. If it has, reinvest based on the user set post-max settings
        if ((orderSize >= maxSizeBTC) && (postMaxReinvestRatio > 0)) {
          // at this point, the post max ratio should be used
          const postMaxAmountToReinvest = BTCprofit * postMaxReinvestRatio;
          // console.log('postMaxAmountToReinvest', postMaxAmountToReinvest);
          const postMaxNewSize = Math.floor((orderSize + postMaxAmountToReinvest) * 100000000) / 100000000;
          // console.log('postMaxNewSize', postMaxNewSize);
          tradeDetails.size = postMaxNewSize;
        }
      } else if (newSize < 0.000016) {
        // todo - this should maybe not be in an else if statement.
        // the user could potentially set a max size in USD that is smaller than 0.000016, and the bot would skip this check
        // or maybe switch the order so this comes first? or maybe put it last as a regular if statement?
        // need to stay above minimum order size
        tradeDetails.size = 0.000016;
      } else {
        // add up all values of trades that just settled and subtract that from "actualavailable_usd"
        let allFlipsValue = 0;
        allFlips.forEach(trade => {
          if (trade.side === "sell") {
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
  cache.updateStatus(userID, 'end flip trade');
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
  cache.updateStatus(userID, 'start settleMultipleOrders (SMO)');
  const userAPI = cache.getAPI(userID);

  return new Promise(async (resolve, reject) => {
    if (ordersArray.length > 0) {
      socketClient.emit('message', {
        message: `There are ${ordersArray.length} orders that need to be synced`,
        userID: Number(userID)
      });
      // loop over the array and flip each trade
      for (let i = 0; i < ordersArray.length; i++) {
        cache.updateStatus(userID, `SMO loop number: ${i}`);
        const orderToCheck = ordersArray[i];
        // this timer will serve to prevent rate limiting
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
          // get all the order details from cb unless it is supposed to be reordered
          if (!orderToCheck.reorder) {
            cache.updateStatus(userID, 'SMO loop get order');
            let fullSettledDetails = await coinbaseClient.getOrder(orderToCheck.id, userID, userAPI);
            // console.log('fully settled:', fullSettledDetails);
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
          } else {
            cache.updateStatus(userID, 'SMO loop reorder');
            await reorder(orderToCheck, userAPI);
          }
        } catch (err) {
          cache.updateStatus(userID, 'error in SMO loop');
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
                await reorder(orderToCheck, userAPI);
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
        }
      } // end for loop
      cache.updateStatus(userID, 'SMO all done');
      // if all goes well, resolve promise with success message
      resolve({
        message: "All settled orders were flipped successfully",
        ordersSettled: true
      });
    } else {
      cache.updateStatus(userID, 'SMO all done');
      // if no orders to settle, resolve
      resolve({
        message: "No orders to settle",
        ordersSettled: false
      });
    }
  })
}

async function reorder(orderToReorder, userAPI) {
  const userID = orderToReorder.userID;
  cache.updateStatus(userID, 'begin reorder');
  return new Promise(async (resolve, reject) => {
    let upToDateDbOrder;
    try {
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
            let pendingTrade = await coinbaseClient.placeOrder(tradeDetails, userAPI);
            // because the storeDetails function will see the tradeDetails as the "old order", need to store previous_fill_fees as just fill_fees
            tradeDetails.fill_fees = upToDateDbOrder.previous_fill_fees;
            // store the new trade in the db. the trade details are also sent to store trade position prices
            // when reordering a trade, bring the old flipped_at value through so it doesn't change the "Time" on screen
            let results = await databaseClient.storeTrade(pendingTrade, tradeDetails, upToDateDbOrder.flipped_at);

            // delete the old order from the db
            await databaseClient.deleteTrade(orderToReorder.id);
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
        let fullSettledDetails = await coinbaseClient.getOrder(orderToReorder.id, orderToReorder.userID, userAPI);
      }
    } catch (err) {
      let cancelling = await databaseClient.checkIfCancelling(orderToReorder.id);
      if ((err.response?.status === 404) && (!cancelling)) {
        // console.log('reordering', upToDateDbOrder);
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
          let pendingTrade = await coinbaseClient.placeOrder(tradeDetails, userAPI);
          // because the storeDetails function will see the tradeDetails as the "old order", need to store previous_fill_fees as just fill_fees
          tradeDetails.fill_fees = upToDateDbOrder.previous_fill_fees;
          // store the new trade in the db. the trade details are also sent to store trade position prices
          // when reordering a trade, bring the old flipped_at value through so it doesn't change the "Time" on screen
          let results = await databaseClient.storeTrade(pendingTrade, tradeDetails, upToDateDbOrder.flipped_at);

          // delete the old order from the db
          await databaseClient.deleteTrade(orderToReorder.id);
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



async function cancelMultipleOrders(ordersArray, userID, ignoreSleep, userAPI) {
  return new Promise(async (resolve, reject) => {
    cache.updateStatus(userID, 'begin cancelMultipleOrders (CMO)');
    // set variable to track how many orders were actually canceled
    let quantity = 0;
    // console.log('ordersArray', ordersArray);
    if (ordersArray.length > 0) {
      if (!ignoreSleep) {
        // console.log('need to sleep');
        // need to wait and double check db before deleting because they take time to store and show up on cb first
        // only need to wait once because as the loop runs nothing will be added to it. Only wait for most recent order
        await sleep(500);
      }
      for (let i = 0; i < ordersArray.length; i++) {
        cache.updateStatus(userID, `CMO loop number: ${i}`);
        const orderToCancel = ordersArray[i];
        try {
          // check to make sure it really isn't in the db
          let doubleCheck = await databaseClient.getSingleTrade(orderToCancel.id);
          // console.log('double check', doubleCheck);
          if (doubleCheck) {
            // if it is in the db, it should cancel but set it to reorder because it is out of range
            // that way it will reorder faster when it moves back in range
            // console.log('canceling order', orderToCancel);
            await Promise.all([
              coinbaseClient.cancelOrder(orderToCancel.id, userID, userAPI),
              databaseClient.setSingleReorder(orderToCancel.id)
            ]);
            // console.log('old trade was set to reorder when back in range');
            quantity++;
          } else {
            // cancel the order if nothing comes back from db
            await coinbaseClient.cancelOrder(orderToCancel.id, userID, userAPI);
            quantity++;
          }
        } catch (err) {
          // Do not resolve the error because this is in a for loop which needs to continue. If error, handle it here
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
        await updateFunds(userID);
        // wait to prevent rate limiting
        await sleep(80);
      } //end for loop
      // if all goes well, send message to user and resolve promise with success message
      socketClient.emit('message', {
        message: `${quantity} Extra orders were found and canceled`,
        orderUpdate: true,
        userID: Number(userID)
      });

      cache.updateStatus(userID, 'done CMO');
      resolve({
        message: `${quantity} Extra orders were canceled`,
        ordersCanceled: true,
        quantity: quantity
      })
    } else {
      cache.updateStatus(userID, 'done CMO, no orders');
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
// this version of autoSetup will put trades directly into the db and let resync order what it needs
// much less cb calls for orders that will just desync, also much faster
async function autoSetup(user, parameters) {
  // console.log('in new autoSetup function', user, parameters);
  let availableFunds = parameters.availableFunds;
  let loopPrice = parameters.startingValue;
  let tradingPrice = parameters.tradingPrice;
  let btcToBuy = 0;
  let count = 0;
  // array to hold all the orders that will be made
  let orderList = [];

  const sizeType = parameters.sizeType;
  const size = parameters.size;
  const increment = parameters.increment;

  if (sizeType === "USD") {
    // logic for when size is in USD
    // make sure there are enough funds, and don't make more than 10000 orders
    while ((size <= availableFunds) && (count < 10000)) {
      let actualSize = size;
      let convertedAmount = Number(Math.floor((size / loopPrice) * 100000000)) / 100000000;
      let original_sell_price = (Math.round((loopPrice * (Number(parameters.trade_pair_ratio) + 100))) / 100);
      let side = 'buy';
      // if the loop price is higher than the trading price,
      // need to find actual cost of the trade at that volume
      if (loopPrice >= tradingPrice) {
        side = 'sell';
        // if selling, need to add up the total amount of btc that needs to be bought to keep the balances above 0
        btcToBuy += convertedAmount;
        // find cost of BTCSize at current price. Something seems wrong here and it's repetitive but it works so I'm not touching it
        let actualUSDSize = tradingPrice * convertedAmount;
        // set the actual USD size to be the cost of the BTC size at the current trade price
        actualSize = actualUSDSize;
      }

      // set the price based on if it's a buy or sell
      let price = () => {
        if (side === 'buy') {
          return loopPrice
        } else {
          return original_sell_price
        }
      }

      let prevFees = () => {
        if (side === 'buy') {
          return 0
        } else {
          return loopPrice * convertedAmount * user.taker_fee
        }
      }
      // console.log('previous fees', prevFees(), 'loop price', loopPrice, 'convertedAmount', convertedAmount, 'taker fee', user.taker_fee);

      // create a single order object
      const singleOrder = {
        original_sell_price: original_sell_price,
        original_buy_price: loopPrice,
        side: side,
        price: price(),
        sizeUSD: actualSize,
        size: convertedAmount,
        fill_fees: prevFees(),
        product_id: parameters.product_id,
        stp: 'cn',
        userID: user.id,
        trade_pair_ratio: parameters.trade_pair_ratio
      }
      orderList.push(singleOrder);
      // each loop needs to buy BTC with the USD size
      // this will lower the value of available funds by the size
      availableFunds -= actualSize;
      // then it will increase the final price by the increment value
      loopPrice += increment;
      count++;
    }
  } else {
    // logic for when size is in btc
    // need a variable for usd size since it will change
    let USDSize = size * loopPrice;
    while ((USDSize <= availableFunds) && (count < 10000)) {
      let original_sell_price = (Math.round((loopPrice * (Number(parameters.trade_pair_ratio) + 100))) / 100);
      let side = 'buy';
      // if the loop price is higher than the trading price,
      // need to find current cost of the trade at that volume
      if (loopPrice >= tradingPrice) {
        side = 'sell';
        // if selling, need to add up the total amount of btc that needs to be bought to keep the balances above 0
        btcToBuy += size;
        // change to size at trading price. Need this number to subtract from available funds
        USDSize = tradingPrice * size;
      }

      // set the price based on if it's a buy or sell
      let price = () => {
        if (side === 'buy') {
          return loopPrice
        } else {
          return original_sell_price
        }
      }

      let prevFees = () => {
        if (side === 'buy') {
          return 0
        } else {
          return loopPrice * size * user.taker_fee
        }
      }
      // console.log('previous fees', prevFees());
      // console.log('previous fees', prevFees(), 'loop price', loopPrice, 'size', size, 'taker fee', user.taker_fee);

      // create a single order object
      const singleOrder = {
        original_sell_price: original_sell_price,
        original_buy_price: loopPrice,
        side: side,
        price: price(),
        size: size,
        fill_fees: prevFees(),
        product_id: parameters.product_id,
        stp: 'cn',
        userID: user.id,
        trade_pair_ratio: parameters.trade_pair_ratio
      }
      orderList.push(singleOrder);
      // each loop needs to buy BTC with the USD size
      // this will lower the value of available funds by the USD size
      availableFunds -= USDSize;
      // then it will increase the final price by the increment value
      loopPrice += increment;
      USDSize = size * loopPrice;
      count++;
    }
  }
  // need unique IDs for each trade, but need to also get IDs from CB, so DB has no default.
  // store a number that counts up every time autoSetup is used, and increase it before using it in case of error
  // then use it here and increase it by the number of trades being put through this way
  try {
    const number = (Number(user.auto_setup_number) + orderList.length)
    await databaseClient.setAutoSetupNumber(number, user.id);

    // put a market order in for how much BTC need to be purchase for all the sell orders
    if (btcToBuy >= 0.000016) {
      const tradeDetails = {
        side: 'buy',
        size: btcToBuy.toFixed(8), // BTC
        product_id: 'BTC-USD',
        stp: 'cn',
        userID: user.id,
        type: 'market'
      };
      let bigOrder = await coinbaseClient.placeOrder(tradeDetails);
      console.log('big order to balance btc avail', bigOrder.size, 'user', user.taker_fee);
      await robot.updateFunds(user.id);
    }
    // put each trade into the db as a reorder so the sync loop can sync the right amount
    for (let i = 0; i < orderList.length; i++) {
      const order = orderList[i];
      // adding a bunch of 0s allows easy sorting by id in the DB which might be useful later so better to start now
      order.id = '0000000000' + (Number(user.auto_setup_number) + i).toString();
      // use the current time for the created time 
      const time = new Date();
      order.created_at = time;
      // console.log('order', order);
      await databaseClient.storeReorderTrade(order, order, time);
    }
  } catch (err) {
    console.log(err, 'problem in autoSetup ');
  }
}



// auto setup trades until run out of money. Keeping this old version for a while until the new one is well tested
async function oldautoSetup(user, parameters) {
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
    // storing the created_at value in the flipped_at field will fix issues where the time would change when resyncing
    await databaseClient.storeTrade(pendingTrade, tradeDetails, pendingTrade.created_at);

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
  cache.updateStatus(userID, 'get available funds');
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

      cache.updateStatus(userID, 'done getting available funds');
      resolve(availableFunds)
    } catch (err) {
      cache.updateStatus(userID, 'error getting available funds');
      reject(err)
    }
  })
}

async function updateFunds(userID) {
  cache.updateStatus(userID, 'update funds');
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

      cache.updateStatus(userID, 'done updating funds');
      resolve()
    } catch (err) {
      cache.updateStatus(userID, 'error updating funds');
      reject(err)
    }
  })
}

async function alertAllUsers(alertMessage) {
  // console.log('alerting all users of change');
  try {
    const userList = await databaseClient.getAllUsers();
    userList.forEach(user => {
      // console.log(user);
      socketClient.emit('message', {
        message: alertMessage,
        orderUpdate: true,
        userID: Number(user.id)
      });
    });
  } catch (err) {
    console.log(err, 'error while alerting all users of change');
  }
}

function heartBeat(userID, botSettings, mainHeart) {
  const loopNumber = cache.getLoopNumber(userID);
  socketClient.emit('message', {
    heartbeatStatus: true,
    heartbeat: mainHeart,
    userID: Number(userID),
    count: loopNumber % botSettings.full_sync + 1
  });
}


const robot = {
  sleep: sleep,
  flipTrade: flipTrade,
  syncOrders: syncOrders,
  // deSyncOrderLoop: deSyncOrderLoop,
  processOrders: processOrders,
  syncEverything: syncEverything,
  startSync: startSync,
  autoSetup: autoSetup,
  getAvailableFunds: getAvailableFunds,
  updateFunds: updateFunds,
  alertAllUsers: alertAllUsers,
}


module.exports = robot;