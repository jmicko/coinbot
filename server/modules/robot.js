// importing this way makes it easier to see when you are accessing the database or coinbase
const coinbaseClient = require("./coinbaseClient");
const databaseClient = require("./databaseClient");
const cache = require("./cache");
const { startWebsocket } = require("./websocket");


// this will keep track of and update general bot settings
async function botLoop() {
  userID = 0
  // console.log('botLoop');
  try {
    // get fresh settings from db
    botSettings = await databaseClient.getBotSettings();
    // save settings to the cache
    cache.setKey(userID, 'botSettings', botSettings);
  } catch (err) {
    console.log(err, 'error in botLoop');
  }
}

// start a sync loop for each active user
async function startSync() {
  // create a user cache for the bot to store bot settings
  robotUser = {
    // user table starts at 1 so bot can be user 0 since storage array starts at 0
    id: 0
  }
  try {
    cache.newUser(robotUser);
    await botLoop();
    // get all users from the db
    const userList = await databaseClient.getAllUsers();
    userList.forEach(async user => {
      await initializeUserLoops(user);
      // deSyncOrderLoop(user, 0);
    });
  } catch (err) {
    console.log(err, 'error starting sync');
  }
}

// this is separated from the startSync function so it can be called separately when a new user is created
async function initializeUserLoops(user) {
  const userID = user.id;
  // set up cache for user
  await cache.newUser(user);
  // start the loop
  syncOrders(userID, 0);
  processingLoop(userID);

  try {
    const ws = startWebsocket(userID);
    console.log(ws, 'ws success', userID)

  } catch (err) {
    console.log(err, 'error starting websocket');
  }
}

async function processingLoop(userID) {
  // get the user and bot settings from cache;
  const user = cache.getUser(userID);
  const botSettings = cache.getKey(0, 'botSettings');
  // check that user is active, approved, and unpaused, and that the bot is not under maintenance
  if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {
    // flip orders that are settled in the db
    try {

      await processOrders(userID);
      // will_cancel orders can now be canceled.
      await databaseClient.deleteMarkedOrders(userID);
    } catch (err) {
      console.log(err, 'error at the end of the processing loop');
    }
  } else {
    // if the user should not be trading, slow loop
    await sleep(1000);
  }
  heartBeat(userID, 'beat');
  // console.log('orders processed for user:', userID);
  if (user) {
    setTimeout(() => {
      processingLoop(userID);
    }, 100);
  } else {
    console.log(`user ${userID} is NOT THERE, stopping processing loop for user`);
  }
}

// repeating loop to find orders that have settled on coinbase via REST API
async function syncOrders(userID) {
  // increase the loop number tracker at the beginning of the loop
  cache.increaseLoopNumber(userID);
  cache.updateStatus(userID, 'begin main loop');

  // get the user settings from cache;
  const user = cache.getUser(userID);

  // keep track of how long the loop takes. Helps prevent rate limiting
  const t0 = performance.now();
  // get the bot settings
  const botSettings = cache.getKey(0, 'botSettings');
  try {
    cache.updateStatus(userID, 'getting settings');
    const loopNumber = cache.getLoopNumber(userID);
    // console.log(loopNumber, '<-loop number', (loopNumber - 1) % botSettings.full_sync, '<-shrek', botSettings.full_sync);
    // send heartbeat signifying start of new loop
    heartBeat(userID, 'heart');
    // check that user is active, approved, and unpaused, and that the bot is not under maintenance
    if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {

      // *** WHICH SYNC ***
      if (((loopNumber - 1) % botSettings.full_sync) === 0) {
        // console.log('full sync');

        // *** FULL SYNC ***
        // full sync compares all trades that should be on CB with DB,
        // and does other less frequent maintenance tasks
        await fullSync(userID);
      } else {

        // *** QUICK SYNC ***
        // console.log('quick sync');
        cache.updateStatus(userID, 'start all quick sync')
        //  quick sync only checks fills endpoint and has fewer functions for less CPU usage
        await quickSync(userID);
        // desync extra orders
        await deSync(userID)
        cache.updateStatus(userID, 'end all quick sync');
      } // end which sync

      // *** UPDATE ORDERS IN DATABASE ***
      await updateMultipleOrders(userID);
      // console.log('success!!!!!!');
      // update funds after everything has been processed
      await updateFunds(userID);

    } else {
      // if the user is not active or is paused, loop every 5 seconds
      await sleep(5000);
    }
  } catch (err) {
    MainLoopErrors(userID, err);
  } finally {
    cache.updateStatus(userID, 'end main loop finally');
    // when everything is done, call the sync again if the user still exists
    if (user) {
      const t1 = performance.now();
      // API is limited to 10/sec, so make sure the bot waits that long between loops
      if (100 - (t1 - t0) > 0) {
        // console.log(`sync took ${t1 - t0} milliseconds.`, 100 - (t1 - t0));
        await sleep(100 - (t1 - t0));
      }
      // console.log(user?.id, 'user');
      // wait however long the admin requires, then start new loop
      setTimeout(() => {
        cache.clearStatus(userID);
        // cache.increaseLoopNumber(userID);
        syncOrders(userID);
      }, (botSettings.loop_speed * 10));
    } else {
      console.log(`user ${userID} is NOT THERE, stopping main loop for user`);
    }
  }
}



function MainLoopErrors(userID, err) {
  let errorData;
  let errorText;
  if (err?.response?.data) {
    errorData = err?.response.data;
  }
  cache.updateStatus(userID, 'error in the main loop');
  if (err?.code === 'ECONNRESET') {
    errorText = 'Connection reset by Coinbase server';
    console.log('Connection reset by Coinbase server. Probably nothing to worry about unless it keeps happening quickly.');
  } else if (err?.response?.status === 500) {
    console.log('internal server error from coinbase');
    errorText = 'Internal server error from coinbase';
  } else if (err?.response?.status === 401) {
    console.log(err?.response?.data, 'Invalid Signature');
    console.log(err?.response?.data, 'Invalid Signature');
    errorText = 'Invalid Signature. Probably nothing to worry about unless it keeps happening quickly.';
  } else if (err?.response?.statusText === 'Bad Gateway') {
    console.log('bad gateway');
    errorText = 'Bad Gateway. Probably nothing to worry about unless it keeps happening quickly.';
  } else if (err?.response?.statusText === 'Gateway Timeout') {
    console.log('Gateway Timeout');
    errorText = 'Gateway Timeout. Nothing to worry about. Coinbase probably lost the connection';
  } else if (err?.code === 'ECONNABORTED') {
    console.log('10 sec timeout');
    errorText = '10 second timeout. Nothing to worry about, Coinbase was just slow to respond.';
  } else {
    console.log(err, 'unknown error at end of syncOrders');
    errorText = 'Unknown error at end of syncOrders. Who knows WHAT could be wrong???';
  }
  cache.storeError(userID, {
    errorData: errorData,
    errorText: errorText
  });
}

async function deSync(userID) {
  cache.updateStatus(userID, 'begin desync');
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

      // console.log(ordersToDeSync[0], 'all to desync');

      // cancel them all
      await cancelAndReorder(allToDeSync, userID);

      cache.updateStatus(userID, 'end desync');
      resolve();
    } catch (err) {
      cache.updateStatus(userID, 'error in desync');
      reject(err)
    }
  });
}


// FULL SYNC, will compare all trades that should be on CB, and do other less frequent maintenance tasks
async function fullSync(userID) {
  cache.updateStatus(userID, 'begin full sync');
  // get the bot settings
  const botSettings = cache.getKey(0, 'botSettings');
  return new Promise(async (resolve, reject) => {
    try {
      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb
        databaseClient.getLimitedUnsettledTrades(userID, botSettings.orders_to_sync),
        // get open orders
        coinbaseClient.getOpenOrders(userID),
        // get fees
        coinbaseClient.getFees(userID)
      ]);
      // store the lists of orders in the corresponding consts so they can be compared
      const dbOrders = results[0];
      const cbOrders = results[1].orders;
      const fees = results[2];
      cache.updateStatus(userID, 'done updating funds full sync');
      // need to get the fees for more accurate Available funds reporting
      // fees don't change frequently so only need to do this during full sync
      await databaseClient.saveFees(fees, userID);
      // compare the arrays and remove any where the ids match in both,
      // leaving a list of orders that are open in the db, but not on cb. Probably settled, possibly canceled
      let ordersToCheck = await orderElimination(dbOrders, cbOrders);
      // also get a list of orders that are open on cb, but not in the db. Need to cancel them
      let ordersToCancel = await orderElimination(cbOrders, dbOrders);
      // *** CANCEL EXTRA ORDERS ON COINBASE THAT ARE NOT OPEN IN DATABASE ***
      await cancelAndReorder(ordersToCancel, userID);
      // save the orders that need to be individually checked against CB
      cache.setKey(userID, 'ordersToCheck', ordersToCheck);
      resolve();
    } catch (err) {
      cache.updateStatus(userID, 'error in full sync');
      reject(err)
    }
  });
}

async function quickSync(userID) {
  cache.updateStatus(userID, 'begin quick sync');
  const botSettings = cache.getKey(0, 'botSettings');
  // IF QUICK SYNC, only get fills
  return new Promise(async (resolve, reject) => {
    try {
      // get the 500 most recent fills for the account
      const response = await coinbaseClient.getFills(userID, { limit: 100 });
      const fills = response.fills;
      // console.log(fillResponse);
      cache.updateStatus(userID, 'done getting quick sync fills');
      // get an array of just the IDs
      const fillsIds = []
      fills.forEach(fill => fillsIds.push(fill.order_id))
      // find unsettled orders in the db based on the IDs array
      const unsettledFills = await databaseClient.getUnsettledTradesByIDs(userID, fillsIds);
      // after checking fills, store the most recent so don't need to check it later
      cache.updateStatus(userID, 'done checking fills');
      // this will check the specified number of trades to sync on either side to see if any 
      // need to be reordered. It will only find them on a loop after a loop where trades have been placed
      // todo - maybe this should go after the updateMultipleOrders function so it will fire on same loop
      const reorders = await databaseClient.getReorders(userID, botSettings.orders_to_sync)
      // combine the arrays
      toCheck = unsettledFills.concat(reorders);
      // set the 'ordersToCheck' key so the next process can access them without needing to pass params
      cache.setKey(userID, 'ordersToCheck', toCheck);
      cache.updateStatus(userID, 'will resolve quick sync');
      resolve(toCheck);
    } catch (err) {
      cache.updateStatus(userID, 'error in quick sync');
      reject(err)
    }
  });
}


// process orders that have been settled
async function processOrders(userID) {
  cache.updateStatus(userID, 'start process orders');
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
      const tradeList = await databaseClient.getSettledTrades(userID);
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




            const willCancel = cache.checkIfCanceling(userID, dbOrder.order_id);
            if (!willCancel) {
              // console.log(tradeDetails,'trade details');
              let cbOrder = await coinbaseClient.placeOrder(userID, tradeDetails);
              // console.log(cbOrder, 'cbOrder');
              if (cbOrder.success) {
                const newOrder = await coinbaseClient.getOrder(userID, cbOrder.order_id);
                // ...store the new trade
                // take the time the new order was created, and use it as the flipped_at value
                const flipped_at = newOrder.order.created_time
                await databaseClient.storeTrade(newOrder.order, dbOrder, flipped_at);
                // await databaseClient.storeTrade(cbOrder, dbOrder, cbOrder.created_at);
                // ...mark the old trade as flipped
                await databaseClient.markAsFlipped(dbOrder.order_id);
              } else {
                console.log('new trade failed!!!');
              }
              // tell the frontend that an update was made so the DOM can update
              cache.storeMessage(Number(userID), {
                orderUpdate: true
              });
            }




          } catch (err) {
            let errorText;
            cache.updateStatus(userID, 'error in process orders loop');
            if (err.code && err.code === 'ETIMEDOUT') {
              console.log('Timed out!!!!! from processOrders');
              errorText = 'Coinbase timed out while flipping an order';
            } else if (err.response?.status === 400) {
              console.log(err.response, 'Insufficient funds! from processOrders');
              errorText = 'Insufficient funds while trying to flip a trade!';
              // todo - check funds to make sure there is enough for 
              // all of them to be replaced, and balance if needed
            } else {
              console.log(err, 'unknown error in processOrders');
              errorText = 'unknown error while flipping an order';
            }
            cache.storeError(userID, {
              errorData: dbOrder,
              errorText: errorText
            })
          }
          // avoid rate limiting and give orders time to settle before checking again
          await sleep(100)
        } // end for loop
      } else {
        cache.updateStatus(userID, 'end resolve processOrders');
        resolve();
      }
      cache.updateStatus(userID, 'end resolve processOrders');
      resolve();
    } catch (err) {
      console.log(err, '!!!!!!!!!!!!!!!!!error at end of processOrders');
      reject(err);
    }
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
    limit_price: '', // USD
    // when flipping a trade, base_size and product will always be the same
    base_size: dbOrder.base_size, // BTC
    trade_pair_ratio: dbOrder.trade_pair_ratio,
    product_id: dbOrder.product_id,
    client_order_id: dbOrder.next_client_order_id,
    userID: dbOrder.userID,
  };
  // add buy/sell requirement and price


  if (dbOrder.side === "BUY") {
    // if it was a BUY, sell for more. multiply old price
    tradeDetails.side = "SELL"
    tradeDetails.limit_price = dbOrder.original_sell_price;
    cache.storeMessage(userID, { messageText: `Selling for $${Number(tradeDetails.limit_price)}` });
  } else {
    // if it is a sell turning into a buy, check if user wants to reinvest the funds
    if (user.reinvest) {
      const orderSize = Number(dbOrder.base_size);

      // find out how much profit there was
      const BTCprofit = calculateProfitBTC(dbOrder);

      let amountToReinvest = BTCprofit * reinvestRatio;
      if (amountToReinvest <= 0) {
        console.log('negative profit');
        amountToReinvest = 0;
        cache.storeError(userID, {
          errorData: dbOrder,
          errorText: `Just saw a negative profit! Maybe increase your trade-pair ratio? 
          This may also be due to fees that were charged during setup or at a different fee tier.`
        })
      }

      // safer to round down the investment amount. 
      // If user invest 100%, it should not round up and potentially take their balance negative
      const newSize = Math.floor((orderSize + amountToReinvest) * 100000000) / 100000000;

      const buyPrice = dbOrder.original_buy_price;
      const maxSizeBTC = Number((maxTradeSize / buyPrice).toFixed(8));

      // now check if the new base_size after reinvesting is higher than the user set max
      if ((newSize > maxSizeBTC) && (maxTradeSize > 0)) {
        // add up all values of trades that just settled and subtract that from "actualavailable_usd"
        let allFlipsValue = 0;
        allFlips.forEach(trade => {
          if (trade.side === "SELL") {
            allFlipsValue += (maxSizeBTC * trade.original_buy_price)
          }
        });

        // calculate what funds will be leftover after all pending flips go through
        const leftoverFunds = (Number(user.actualavailable_usd) - (allFlipsValue * (1 + Number(user.maker_fee))));

        // only set the new base_size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          // if there is enough money left in the account to reinvest, set the base_size to the max base_size
          tradeDetails.base_size = maxSizeBTC;
        }

        // check if the new base_size has already surpassed the user set max. If it has, reinvest based on the user set post-max settings
        if ((orderSize >= maxSizeBTC) && (postMaxReinvestRatio > 0)) {
          // at this point, the post max ratio should be used
          const postMaxAmountToReinvest = BTCprofit * postMaxReinvestRatio;
          // console.log('postMaxAmountToReinvest', postMaxAmountToReinvest);
          const postMaxNewSize = Math.floor((orderSize + postMaxAmountToReinvest) * 100000000) / 100000000;
          // console.log('postMaxNewSize', postMaxNewSize);
          tradeDetails.base_size = postMaxNewSize;
        }
      } else if (newSize < 0.000016) {
        // todo - this should maybe not be in an else if statement.
        // the user could potentially set a max base_size in USD that is smaller than 0.000016, and the bot would skip this check
        // or maybe switch the order so this comes first? or maybe put it last as a regular if statement?
        // need to stay above minimum order base_size
        tradeDetails.base_size = 0.000016;
      } else {
        // add up all values of trades that just settled and subtract that from "actualavailable_usd"
        let allFlipsValue = 0;
        allFlips.forEach(trade => {
          if (trade.side === "SELL") {
            allFlipsValue += (trade.base_size * trade.original_buy_price)
          }
        });

        // calculate what funds will be leftover after all pending flips go through
        const leftoverFunds = (Number(user.actualavailable_usd) - (allFlipsValue * (1 + Number(user.maker_fee))));

        // only set the new base_size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          console.log('there is enough money left to reinvest');
          tradeDetails.base_size = newSize.toFixed(8);
        } else {
          console.log('there is NOT enough money left to reinvest');
        }
      }

    }
    // if it was a sell, buy for less. divide old price
    tradeDetails.side = "BUY"
    tradeDetails.limit_price = dbOrder.original_buy_price;
    cache.storeMessage(userID, { messageText: `Buying for $${Number(tradeDetails.limit_price)}` });
  }
  // return the tradeDetails object
  cache.updateStatus(userID, 'end flip trade');
  return tradeDetails;
}

function calculateProfitBTC(dbOrder) {

  let margin = (dbOrder.original_sell_price - dbOrder.original_buy_price)
  let grossProfit = Number(margin * dbOrder.base_size)
  let profit = Number(grossProfit - (Number(dbOrder.total_fees) + Number(dbOrder.previous_total_fees)))
  let profitBTC = Number((Math.floor((profit / dbOrder.limit_price) * 100000000) / 100000000))

  return profitBTC;
}


// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// this should just update the status of each trade in the 'ordersToCheck' cached array
async function updateMultipleOrders(userID, params) {
  return new Promise(async (resolve, reject) => {
    cache.updateStatus(userID, 'start updateMultipleOrders (UMO)');
    // get the orders that need processing. This will have been taken directly from the db and include all details
    const ordersArray = params?.ordersArray
      ? params.ordersArray
      : cache.getKey(userID, 'ordersToCheck');
    // console.log(ordersArray, 'orders array');

    if (ordersArray?.length > 0) {
      cache.storeMessage(userID, { messageText: `There are ${ordersArray.length} orders that need to be synced` });
    } else {
      resolve()
      return
    }
    // loop over the array and update each trade
    for (let i = 0; i < ordersArray.length; i++) {
      // keep track of how long each loop takes. Helps prevent rate limiting
      const t0 = performance.now();
      cache.storeMessage(userID, { messageText: `Syncing ${i + 1} of ${ordersArray.length} orders that need to be synced` });
      // set up loop
      const orderToCheck = ordersArray[i];
      // set up loop DONE
      try {
        if (orderToCheck.reorder && !orderToCheck.will_cancel) {
          // if it should be reordered and is not being canceled by the user, reorder it
          await reorder(orderToCheck);
        } else {
          // if not a reorder, look up the full details on CB
          let updatedOrder = await coinbaseClient.getOrder(userID, orderToCheck.order_id);
          // if it was cancelled, set it for reorder
          if (updatedOrder.order.status === 'CANCELLED') {
            console.log('was canceled but should not have been!')
            updatedOrder.order.reorder = true;
          }
          // then update db with current status
          await databaseClient.updateTrade(updatedOrder.order);
        }
      } catch (err) {
        console.log(err, 'error in updateMultipleOrders loop');
        cache.storeError(userID, {
          errorData: orderToCheck,
          errorText: `Error updating order details`
        })
      } // end catch
      const t1 = performance.now();
      // API is limited to 10/sec, so make sure the bot waits that long between loops
      if (100 - (t1 - t0) > 0) {
        await sleep(100 - (t1 - t0));
      }
    } // end for loop
    // delete ordersToCheck since they have now been checked
    cache.deleteKey(userID, 'ordersToCheck');
    resolve();
  })
}

// Reorder a trade and delete the old from the db
async function reorder(orderToReorder) {
  return new Promise(async (resolve, reject) => {
    const userID = orderToReorder.userID;
    cache.updateStatus(userID, 'begin reorder');
    try {
      const upToDateDbOrder = await databaseClient.getSingleTrade(orderToReorder.order_id);
      // make new tradeDetails so client id is not passed from old order
      const tradeDetails = {
        side: upToDateDbOrder.side,
        limit_price: upToDateDbOrder.limit_price, // USD
        base_size: upToDateDbOrder.base_size, // BTC
        product_id: upToDateDbOrder.product_id,
      };
      // send the new order with the trade details
      let pendingTrade = await coinbaseClient.placeOrder(userID, tradeDetails);
      // console.log(pendingTrade, 'pending trade');
      if (pendingTrade.success) {
        let newTrade = await coinbaseClient.getOrder(userID, pendingTrade.order_id)
        // console.log(newTrade, 'newTrade');
        // because the storeDetails function will see the upToDateDbOrder as the "old order", need to store previous_total_fees as just total_fees
        upToDateDbOrder.total_fees = upToDateDbOrder.previous_total_fees;
        // store the new trade in the db. the trade details are also sent to store trade position prices
        // when reordering a trade, bring the old flipped_at value through so it doesn't change the "Time" on screen
        let results = await databaseClient.storeTrade(newTrade.order, upToDateDbOrder, upToDateDbOrder.flipped_at);

        // delete the old order from the db
        await databaseClient.deleteTrade(orderToReorder.order_id);
        // tell the DOM to update
        cache.storeMessage(userID, {
          messageText: `trade was reordered`,
          orderUpdate: true,
        });
        resolve({ results: results })
      }
    } catch (err) {
      console.log(err, 'error in reorder function in robot.js');
      reject(err)
    }
    resolve();
  });
}

// cancels orders on coinbase. If they are in the db, it will set them as reorders.
async function cancelAndReorder(ordersArray, userID) {
  return new Promise(async (resolve, reject) => {
    cache.updateStatus(userID, 'begin cancelAndReorder (CMO)');
    // avoid making calls with empty arrays
    if (ordersArray.length > 0) {
      // build an array of just the IDs that should be set to reorder
      const idArray = [];
      for (let i = 0; i < ordersArray.length; i++) {
        const order = ordersArray[i];
        idArray.push(order.order_id)
      } //end for loop

      try {
        databaseClient.setManyReorders(idArray)
        // cancel the orders in the array
        await coinbaseClient.cancelOrders(userID, idArray);
        // update funds now that everything should be up to date
      } catch (err) {
        console.log('error cancelling multiple orders');
        reject(err);
      }

      // if all goes well, send message to user and resolve promise with success message
      cache.storeMessage(Number(userID), {
        orderUpdate: true
      });
      resolve({ success: true })
    } else {
      cache.updateStatus(userID, 'done CMO, no orders');
      resolve({ success: true })
    }
  });
}

// take in an array and an item to check
function orderElimination(dbOrders, cbOrders) {
  for (let i = 0; i < cbOrders.length; i++) {
    // look at each id of coinbase orders
    const cbOrderID = cbOrders[i].order_id;
    // filter out dbOrders of that order_id
    dbOrders = dbOrders.filter(dbOrder => {
      return (dbOrder.order_id !== cbOrderID)
    })
  }
  // return a list of orders that are settled on cb, but have not yet been handled by the bot
  return dbOrders;
}


// async function autoSetup(user, parameters) {

//   // create an array to hold the new trades to put in
//   const orderList = [];
//   let count = 0;

//   // SHORTEN PARAMS for better readability
//   let availableFunds = parameters.availableFunds;
//   let base_size = parameters.base_size;
//   let startingValue = parameters.startingValue;
//   let buyPrice = startingValue;
//   let endingValue = parameters.endingValue;
//   let tradingPrice = parameters.tradingPrice;
//   let increment = parameters.increment;
//   let incrementType = parameters.incrementType;
//   let trade_pair_ratio = parameters.trade_pair_ratio;
//   let sizeType = parameters.sizeType;
//   let loopDirection = "up";
//   if (endingValue - startingValue < 0) {
//     loopDirection = "down";
//   }

//   let btcToBuy = 0;

//   // loop until one of the stop triggers is hit
//   let stop = false;
//   while (!stop) {
//     count++;

//     buyPrice = Number(buyPrice.toFixed(2));

//     // get the sell price with the same math as is used by the bot when flipping
//     let original_sell_price = (Math.round((buyPrice * (Number(trade_pair_ratio) + 100))) / 100);

//     // figure out if it is going to be a BUY or a sell. Buys will be below current trade price, sells above.
//     let side = 'BUY';
//     if (buyPrice > tradingPrice) {
//       side = 'SELL';
//     }

//     // set the current price based on if it is a BUY or sell
//     let limit_price = buyPrice;
//     if (side === 'SELL') {
//       limit_price = original_sell_price;
//     }

//     // if the base_size is in BTC, it will never change. 
//     let actualSize = base_size;
//     // If it is in USD, need to convert
//     if (sizeType === 'USD') {
//       // use the BUY price and the base_size to get the real base_size
//       actualSize = Number(Math.floor((base_size / buyPrice) * 100000000)) / 100000000;
//     }

//     // count up how much BTC will need to be purchased to reserve for all the sell orders
//     if (side === 'SELL') {
//       btcToBuy += actualSize
//     }

//     // calculate the previous fees on sell orders
//     let prevFees = () => {
//       if (side === 'BUY') {
//         return 0
//       } else {
//         return buyPrice * actualSize * user.taker_fee
//       }
//     }


//     // CREATE ONE ORDER
//     const singleOrder = {
//       original_buy_price: buyPrice,
//       original_sell_price: original_sell_price,
//       side: side,
//       limit_price: limit_price,
//       base_size: actualSize,
//       total_fees: prevFees(),
//       product_id: parameters.product_id,
//       stp: 'cn',
//       userID: user.id,
//       trade_pair_ratio: parameters.trade_pair_ratio,
//     }

//     // push that order into the order list
//     orderList.push(singleOrder);

//     // SETUP FOR NEXT LOOP - do some math to figure out next iteration, and if we should keep looping
//     // subtract the buy base_size USD from the available funds
//     // if sizeType is BTC, then we need to convert
//     if (sizeType === 'BTC') {
//       let USDSize = base_size * buyPrice;
//       availableFunds -= USDSize;
//     } else {
//       console.log('current funds', availableFunds);
//       availableFunds -= base_size;
//     }

//     // increment the buy price
//     // can have either percentage or dollar amount increment
//     if (incrementType === 'dollars') {
//       // if incrementing by dollar amount
//       if (loopDirection === 'up') {
//         buyPrice += increment;
//       } else {
//         buyPrice -= increment;
//       }
//     } else {
//       // if incrementing by percentage
//       if (loopDirection === 'up') {
//         buyPrice = buyPrice * (1 + (increment / 100));
//       } else {
//         buyPrice = buyPrice / (1 + (increment / 100));
//       }
//     }


//     // STOP TRADING IF...

//     // stop if run out of funds unless user specifies to ignore that
//     // console.log('ignore funds:', parameters.ignoreFunds);
//     if (availableFunds < 0 && !parameters.ignoreFunds) {
//       console.log('ran out of funds!', availableFunds);
//       stop = true;
//     }
//     // console.log('available funds is', availableFunds);

//     // stop if the buy price passes the ending value
//     if (loopDirection === 'up' && buyPrice >= endingValue) {
//       stop = true;
//     } else if (loopDirection === 'down' && buyPrice <= endingValue) {
//       stop = true;
//     }
//   }

//   return {
//     orderList: orderList,
//     btcToBuy: btcToBuy,
//   }
// }


async function getAvailableFunds(userID, userSettings) {
  // console.log('getting available funds');
  cache.updateStatus(userID, 'get available funds');
  return new Promise(async (resolve, reject) => {
    try {
      // console.log(userSettings.active);
      if (!userSettings?.active) {
        console.log('not active!');
        reject('user is not active')
        return;
      }
      // console.log('user is active');
      const takerFee = Number(userSettings.taker_fee) + 1;
      // console.log('maker fee', takerFee);

      const results = await Promise.all([
        coinbaseClient.getAccounts(userID),
        // funds are withheld in usd when a buy is placed, so the maker fee is needed to subtract fees
        databaseClient.getSpentUSD(userID, takerFee),
        // funds are taken from the sale once settled, so the maker fee is not needed on the buys
        databaseClient.getSpentBTC(userID),
      ]);

      // todo - figure out how to take unsynced trades and subtract from available balance

      // calculate USD balances
      const [USD] = results[0].filter(account => account.currency === 'USD')
      // const availableUSD = USD.available;
      const availableUSD = USD.available_balance.value;
      // const balanceUSD = USD.balance;
      const balanceUSD = Number(availableUSD) + Number(USD.hold.value);
      const spentUSD = results[1].sum;
      // console.log('spent usd', spentUSD);
      // subtract the total amount spent from the total balance
      const actualAvailableUSD = (balanceUSD - spentUSD).toFixed(16);

      // calculate BTC balances
      const [BTC] = results[0].filter(account => account.currency === 'BTC')
      // const availableBTC = BTC.available;
      const availableBTC = BTC.available_balance.value;
      // const balanceBTC = BTC.balance;
      // console.log(BTC.available_balance);
      const balanceBTC = Number(availableBTC) + Number(BTC.hold.value);
      const spentBTC = results[2].sum;
      // subtract the total amount spent from the total balance
      const actualAvailableBTC = Number((balanceBTC - spentBTC).toFixed(16));

      const availableFunds = {
        availableBTC: availableBTC,
        balanceBTC: balanceBTC,
        availableUSD: availableUSD,
        balanceUSD: balanceUSD,
        actualAvailableBTC: actualAvailableBTC,
        actualAvailableUSD: actualAvailableUSD
      }

      // console.log(availableFunds, 'available funds');

      cache.updateStatus(userID, 'done getting available funds');
      resolve(availableFunds)
    } catch (err) {
      cache.updateStatus(userID, 'error getting available funds');
      cache.storeError(userID, {
        errorText: 'error getting available funds'
      })
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

      // check if the funds have changed and update the DOM if needed
      if (Number(userSettings.actualavailable_usd) !== Number(available.actualAvailableUSD)) {
        cache.storeMessage(Number(userID), {
          orderUpdate: true
        });
      }

      cache.updateStatus(userID, 'done updating funds');
      resolve()
    } catch (err) {
      cache.updateStatus(userID, 'error updating funds');
      cache.storeError(userID, {
        errorText: 'error getting available funds'
      })
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
      cache.storeMessage(Number(user.id), {
        messageText: alertMessage,
        orderUpdate: true
      });
    });
  } catch (err) {
    console.log(err, 'error while alerting all users of change');
  }
}

function heartBeat(userID, side) {
  const loopNumber = cache.getLoopNumber(userID);
  const botSettings = cache.getKey(0, 'botSettings');

  cache.sockets.forEach(socket => {
    // find all open sockets for the user
    if (socket.userID === userID) {
      // console.log(socket.userID, 'equal?', socket.request.session.passport?.user, socket.userID === socket.request.session.passport?.user)

      // console.log(loopNumber, botSettings.full_sync, loopNumber % botSettings.full_sync + 1)
      const msg = {
        type: 'heartbeat',
        side: side,
        count: ((loopNumber - 1) % botSettings.full_sync)
      }
      socket.emit('message', msg);
    }
  })
}



const robot = {
  sleep: sleep,
  flipTrade: flipTrade,
  syncOrders: syncOrders,
  processOrders: processOrders,
  updateMultipleOrders: updateMultipleOrders,
  startSync: startSync,
  initializeUserLoops: initializeUserLoops,
  // autoSetup: autoSetup,
  getAvailableFunds: getAvailableFunds,
  updateFunds: updateFunds,
  alertAllUsers: alertAllUsers,
}


module.exports = robot;