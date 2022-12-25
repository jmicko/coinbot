// importing this way makes it easier to see when you are accessing the database or coinbase
const databaseClient = require("./databaseClient");
const { cache, botSettings, userStorage, apiStorage, messenger, cbClients } = require("./cache");
// const botSettings = botSettings;
const { startWebsocket } = require("./websocket");

// start a sync loop for each active user
async function startSync() {
  // const settings = botSettings
  try {
    // load the bot settings
    await botSettings.refresh();
    // get all users from the db
    const userList = await databaseClient.getAllUsers();
    // start the loops for each user
    // console.log(userList, 'user list user list000000000000000000000');
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
  // if (!user.active || !user.approved) {
  //   console.log(user, '<- the user');
  //   return
  // }
  const userID = user.id;
  try {
    // set up cache for user
    await userStorage.createNewUser(user);
    // start syncing orders over the REST api
    syncOrders(userID);
    // start looking for orders to process
    processingLoop(userID);
    // start websocket connection to coinbase for rapid order updates
    startWebsocket(userID);
  } catch (err) {
    console.log(err, 'error initializing loops');
  }
}

async function processingLoop(userID) {
  // get the user and bot settings from cache;
  const user = userStorage.getUser(userID);
  if (user.deleting) {
    return
  }

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
  const user = userStorage.getUser(userID)
  if (user.deleting) {
    return
  }
  // increase the loop number tracker at the beginning of the loop
  userStorage[userID].increaseLoopNumber();
  userStorage[userID].updateStatus('begin main loop');

  // get the user settings from cache;

  // keep track of how long the loop takes. Helps prevent rate limiting
  const t0 = performance.now();

  try {
    const loopNumber = userStorage[userID].getLoopNumber();
    // console.log(loopNumber, '<-loop number', (loopNumber - 1) % botSettings.full_sync, '<-shrek', botSettings.full_sync);
    // send heartbeat signifying start of new loop
    if (user) {
      heartBeat(userID, 'heart');
    }
    // check that user is active, approved, and unpaused, and that the bot is not under maintenance
    if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {

      // *** WHICH SYNC ***
      if (((loopNumber - 1) % botSettings.full_sync) === 0) {
        // console.log(user,'full sync');

        // *** FULL SYNC ***
        // full sync compares all trades that should be on CB with DB,
        // and does other less frequent maintenance tasks
        await fullSync(userID);
      } else {

        // *** QUICK SYNC ***
        // console.log('quick sync');
        //  quick sync only checks fills endpoint and has fewer functions for less CPU usage
        await quickSync(userID);
        // desync extra orders
        await deSync(userID)
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
        userStorage[userID].clearStatus();
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
  messenger[userID].newError({
    errorData: errorData,
    errorText: errorText
  });
}

async function deSync(userID) {
  userStorage[userID].updateStatus('begin desync');

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

      resolve();
    } catch (err) {
      console.log('desync error');
      reject(err)
    }
  });
}


// FULL SYNC, will compare all trades that should be on CB, and do other less frequent maintenance tasks
async function fullSync(userID) {
  userStorage[userID].updateStatus('begin full sync');
  return new Promise(async (resolve, reject) => {
    try {
      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb
        databaseClient.getLimitedUnsettledTrades(userID, botSettings.orders_to_sync),
        // get open orders
        cbClients[userID].getOrders({ order_status: 'OPEN' }),
        // get fees
        cbClients[userID].getTransactionSummary({ user_native_currency: 'USD' })
      ]);
      // store the lists of orders in the corresponding consts so they can be compared
      const dbOrders = results[0];
      const cbOrders = results[1].orders;
      const fees = results[2];
      // need to get the fees for more accurate Available funds reporting
      // fees don't change frequently so only need to do this during full sync
      await databaseClient.saveFees(fees, userID);
      // compare the arrays and remove any where the ids match in both,
      // leaving a list of orders that are open in the db, but not on cb. Probably settled, possibly canceled
      let toCheck = await orderElimination(dbOrders, cbOrders);
      // also get a list of orders that are open on cb, but not in the db. Need to cancel them
      let toCancel = await orderElimination(cbOrders, dbOrders);
      // *** CANCEL EXTRA ORDERS ON COINBASE THAT ARE NOT OPEN IN DATABASE ***
      await cancelAndReorder(toCancel, userID);
      // save the orders that need to be individually checked against CB
      userStorage[userID].addToCheck(toCheck);
      resolve();
    } catch (err) {
      console.log('error in full sync');
      reject(err)
    }
  });
}

async function quickSync(userID) {
  userStorage[userID].updateStatus('begin quick sync');
  // IF QUICK SYNC, only get fills
  return new Promise(async (resolve, reject) => {
    try {
      // get the 100 most recent fills for the account
      const response = await cbClients[userID].getFills({ limit: 100 });
      const fills = response.fills; //this is the same as allFills
      // console.log(fillResponse);
      // get an array of just the IDs
      const fillsIds = []
      fills.forEach(fill => fillsIds.push(fill.order_id))
      // find unsettled orders in the db based on the IDs array
      const unsettledFills = await databaseClient.getUnsettledTradesByIDs(userID, fillsIds);



      // get any fills that are not filled but are settled in the db. This will likely be from the previous loop
      const unfilled = await databaseClient.getUnfilledTradesByIDs(userID, fillsIds);

      unfilled.forEach(async trade => {

        const unfilledFill = fills.filter(fill => fill.order_id === trade.order_id)[0];

        // make a small order to update the order with. 
        // this will prevent accidents if coinbase adds values that match the limit_orders table in the future
        const newFill = {
          order_id: unfilledFill.order_id,
          filled_at: unfilledFill.trade_time
        }

        // update the trade in the db with the new data
        await databaseClient.updateTrade(newFill);

      });




      // after checking fills, store the most recent so don't need to check it later
      // this will check the specified number of trades to sync on either side to see if any 
      // need to be reordered. It will only find them on a loop after a loop where trades have been placed
      // todo - maybe this should go after the updateMultipleOrders function so it will fire on same loop
      const reorders = await databaseClient.getReorders(userID, botSettings.orders_to_sync)
      // combine the arrays
      toCheck = unsettledFills.concat(reorders);
      // set orders to check so the next process can access them without needing to pass params through
      userStorage[userID].addToCheck(toCheck);
      resolve(toCheck);
    } catch (err) {
      console.log('error in quick sync');
      reject(err)
    }
  });
}


// process orders that have been settled
async function processOrders(userID) {
  userStorage[userID].updateStatus('start process orders');
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
      const tradeList = await databaseClient.getSettledTrades(userID);
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



            const willCancel = userStorage[userID].checkCancel(dbOrder.order_id);
            if (!willCancel) {
              // console.log(tradeDetails,'trade details');
              let cbOrder = await cbClients[userID].placeOrder(tradeDetails);
              // console.log(cbOrder, 'cbOrder');
              if (cbOrder.success) {
                const newOrder = await cbClients[userID].getOrder(cbOrder.order_id);
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
              userStorage[userID].orderUpdate();
            }




          } catch (err) {
            let errorText;
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
            messenger[userID].newError({
              errorData: dbOrder,
              errorText: errorText
            })
          }
          // avoid rate limiting and give orders time to settle before checking again
          await sleep(100)
        } // end for loop
      } else {
        resolve();
      }
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
  userStorage[userID].updateStatus('start flip trade');
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
    messenger[userID].newMessage({
      type: 'general',
      text: `Selling for $${Number(tradeDetails.limit_price)}`
    });
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
        messenger[userID].newE({
          type: 'error',
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
    messenger[userID].newMessage({
      type: 'general',
      text: `Buying for $${Number(tradeDetails.limit_price)}`
    });
  }

  // return the tradeDetails object
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

// this should just update the status of each trade in the ordersToCheck cached array
async function updateMultipleOrders(userID, params) {
  return new Promise(async (resolve, reject) => {
    userStorage[userID].updateStatus('start updateMultipleOrders (UMO)');
    // get the orders that need processing. This will have been taken directly from the db and include all details
    const ordersArray = params?.ordersArray
      ? params.ordersArray
      : userStorage[userID].getToCheck();;
    // console.log(ordersArray, 'orders array');

    if (ordersArray?.length > 0) {
      messenger[userID].newMessage({
        type: 'general',
        text: `There are ${ordersArray.length} orders that need to be synced`
      });
    } else {
      resolve()
      return
    }
    // loop over the array and update each trade
    for (let i = 0; i < ordersArray.length; i++) {
      // keep track of how long each loop takes. Helps prevent rate limiting
      const t0 = performance.now();
      messenger[userID].newMessage({
        type: 'general',
        text: `Syncing ${i + 1} of ${ordersArray.length} orders that need to be synced`
      });
      // set up loop
      const orderToCheck = ordersArray[i];
      // set up loop DONE
      try {
        if (orderToCheck.reorder && !orderToCheck.will_cancel) {
          // if it should be reordered and is not being canceled by the user, reorder it
          await reorder(orderToCheck);
        } else {
          // if not a reorder, look up the full details on CB
          let updatedOrder = await cbClients[userID].getOrder(orderToCheck.order_id);
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
        let errorText = `Error updating order details`
        if (err?.error_response?.message) {
          errorText = errorText + '. Reason: ' + err.error_response.message
        }
        messenger[userID].newError({
          errorData: orderToCheck,
          errorText: errorText
        })
      } // end catch
      const t1 = performance.now();
      // API is limited to 10/sec, so make sure the bot waits that long between loops
      if (100 - (t1 - t0) > 0) {
        await sleep(100 - (t1 - t0));
      }
    } // end for loop
    // delete orders to check since they have now been checked
    userStorage[userID].clearToCheck();
    resolve();
  })
}

// Reorder a trade and delete the old from the db
async function reorder(orderToReorder) {
  return new Promise(async (resolve, reject) => {
    const userID = orderToReorder.userID;
    userStorage[userID].updateStatus('begin reorder');
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
      let pendingTrade = await cbClients[userID].placeOrder(tradeDetails);
      // console.log(pendingTrade, 'pending trade');
      if (pendingTrade.success) {
        let newTrade = await cbClients[userID].getOrder(pendingTrade.order_id)
        // console.log(newTrade, 'newTrade');
        // because the storeDetails function will see the upToDateDbOrder as the "old order", need to store previous_total_fees as just total_fees
        upToDateDbOrder.total_fees = upToDateDbOrder.previous_total_fees;
        // store the new trade in the db. the trade details are also sent to store trade position prices
        // when reordering a trade, bring the old flipped_at value through so it doesn't change the "Time" on screen
        let results = await databaseClient.storeTrade(newTrade.order, upToDateDbOrder, upToDateDbOrder.flipped_at);

        // delete the old order from the db
        await databaseClient.deleteTrade(orderToReorder.order_id);
        // tell the DOM to update
        messenger[userID].newMessage({
          type: 'general',
          text: `trade was reordered`,
          orderUpdate: true,
        });
        resolve({ results: results })
      } else {
        console.log(pendingTrade, 'error in reorder function in robot.js');
        reject(pendingTrade);
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
    userStorage[userID].updateStatus('begin cancelAndReorder (CMO)');
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
        await cbClients[userID].cancelOrders(idArray);
        // update funds now that everything should be up to date
      } catch (err) {
        console.log('error cancelling multiple orders');
        reject(err);
      }

      // if all goes well, send message to user and resolve promise with success message
      userStorage[userID].orderUpdate();
      resolve({ success: true })
    } else {
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


async function getAvailableFunds(userID, userSettings) {
  // console.log('getting available funds');
  userStorage[userID].updateStatus('get available funds');
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

      const results = await Promise.all([
        cbClients[userID].getAccounts({ limit: 250 }),
        // funds are withheld in usd when a buy is placed, so the maker fee is needed to subtract fees
        databaseClient.getSpentUSD(userID, takerFee),
        // funds are taken from the sale once settled, so the maker fee is not needed on the buys
        databaseClient.getSpentBTC(userID),
        // get a list of products from coinbase
        cbClients[userID].getProducts(),
        // get user products from db
        databaseClient.getUserProducts(userID),
      ]);
      const accounts = results[0].accounts
      // console.log(accounts, 'accounts');
      const cbProducts = results[3].products;
      // console.log(cbProducts, 'cbProducts');
      const dbProducts = results[4];
      // console.log(dbProducts, 'dbProducts');

      // filter out products that are not in the user's list
      const filteredProducts = cbProducts.filter(product => {
        return dbProducts.some(dbProduct => {
          return dbProduct.product_id === product.product_id
        })
      })
      console.log(filteredProducts, 'filteredProducts');

      // get the amount spent for the base and quote currencies for each product
      // and add them to an array of currency objects with the currency id and amount spent
      // if the currency already exists in the array, add the amount spent to the amount spent for that currency
      const currencyArray = [];
      for (let i = 0; i < filteredProducts.length; i++) {
        const product = filteredProducts[i];
        const baseCurrency = product.base_currency_id;
        const quoteCurrency = product.quote_currency_id;
        const baseSpent = await databaseClient.getSpentBase(userID, product.product_id);
        const quoteSpent = await databaseClient.getSpentQuote(userID, takerFee, product.product_id);
        // console.log(baseSpent, 'baseSpent');
        // console.log(quoteSpent, 'quoteSpent');

        // if the base currency is already in the array, add the amount spent to the existing amount spent
        if (currencyArray.some(currency => currency.currency_id === baseCurrency)) {
          const index = currencyArray.findIndex(currency => currency.currency_id === baseCurrency);
          currencyArray[index].amount_spent += baseSpent;
        } else {
          // if the base currency is not in the array, add it
          currencyArray.push({ currency_id: baseCurrency, amount_spent: baseSpent })
        }

        // if the quote currency is already in the array, add the amount spent to the existing amount spent
        if (currencyArray.some(currency => currency.currency_id === quoteCurrency)) {
          const index = currencyArray.findIndex(currency => currency.currency_id === quoteCurrency);
          currencyArray[index].amount_spent += quoteSpent;
        } else {
          // if the quote currency is not in the array, add it
          currencyArray.push({ currency_id: quoteCurrency, amount_spent: quoteSpent })
        }
      }
      // console.log(currencyArray, 'currencyArray');

      // calculate the available funds for each currency rounded to 16 decimal places
      const availableFundsNew = [];
      for (let i = 0; i < currencyArray.length; i++) {
        const currency = currencyArray[i];
        // get the currency from the accounts
        const [account] = accounts.filter(account => account.currency === currency.currency_id);
        // console.log(account, 'account');
        // calculate the available funds
        const available = Number(account.available_balance.value) + Number(account.hold.value) - currency.amount_spent;
        // console.log(available, 'available');
        // round to 16 decimal places
        const availableRounded = available.toFixed(16);
        // console.log(availableRounded, 'availableRounded');
        // add the currency and available funds to the array
        availableFundsNew.push({ currency_id: currency.currency_id, available: availableRounded })
      }
      // console.log(availableFundsNew, 'availableFundsNew', '\n', filteredProducts, 'filteredProducts');

      // make an object with an object for each user's product with the product id as the key for each nested object 
      // each nested object has the available funds for the base and quote currencies, along with the name of the currency
      const availableFundsObject = {};
      for (let i = 0; i < filteredProducts.length; i++) {
        const product = filteredProducts[i];
        const baseCurrency = product.base_currency_id;
        const quoteCurrency = product.quote_currency_id;
        const baseAvailable = availableFundsNew.find(currency => currency.currency_id === baseCurrency).available;
        const quoteAvailable = availableFundsNew.find(currency => currency.currency_id === quoteCurrency).available;
        availableFundsObject[product.product_id] = {
          base_currency: baseCurrency,
          base_available: baseAvailable,
          quote_currency: quoteCurrency,
          quote_available: quoteAvailable,
        }
      }
      // console.log(availableFundsObject, 'availableFundsObject');






      // calculate USD balances
      const [USD] = accounts.filter(account => account.currency === 'USD')
      // const availableUSD = USD.available;
      const availableUSD = USD.available_balance.value;
      // const balanceUSD = USD.balance;
      const balanceUSD = Number(availableUSD) + Number(USD.hold.value);
      const spentUSD = results[1].sum;
      // console.log('spent usd', spentUSD);
      // subtract the total amount spent from the total balance
      const actualAvailableUSD = (balanceUSD - spentUSD).toFixed(16);

      // calculate BTC balances
      const [BTC] = accounts.filter(account => account.currency === 'BTC')
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

      resolve(availableFunds)
    } catch (err) {
      messenger[userID].newError({
        text: 'error getting available funds',
        data: err
      })
      reject(err)
    }
  })
}

async function updateFunds(userID) {
  userStorage[userID].updateStatus('begin update funds');
  return new Promise(async (resolve, reject) => {
    try {
      const userSettings = await databaseClient.getUserAndSettings(userID);
      const available = await getAvailableFunds(userID, userSettings);

      await databaseClient.saveFunds(available, userID);

      // check if the funds have changed and update the DOM if needed
      if (Number(userSettings.actualavailable_usd) !== Number(available.actualAvailableUSD)) {
        messenger[userID].orderUpdate();
      }
      resolve()
    } catch (err) {
      messenger[userID].newError(userID, {
        text: 'error getting available funds',
        data: err
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
      messenger[user.id].newMessage({
        type: 'general',
        text: alertMessage,
        orderUpdate: true
      });
    });
  } catch (err) {
    console.log(err, 'error while alerting all users of change');
  }
}

function heartBeat(userID, side) {
  messenger[userID].heartBeat(side);
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