import { databaseClient } from "./databaseClient.js";
import { botSettings, userStorage, messenger, cbClients } from "./cache.js";
import { startWebsocket } from "./websocket.js";
import { resetAtMidnight } from './push.js';
import { sleep, addProductDecimals } from "./utilities.js";
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { devLog } from "./utilities.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// start a sync loop for each active user
async function startSync() {
  // const settings = botSettings
  try {
    const path = __dirname;
    // fork a child process to import candles
    const candleMaker = fork('./modules/candleMaker.js');
    // load the bot settings
    await botSettings.refresh();
    // get all users from the db
    const userList = await databaseClient.getAllUsers();
    // start the loops for each user
    await userList.forEach(async user => {
      await initializeUserLoops(user);
      // deSyncOrderLoop(user, 0);
      // send the user to the child process to import candles
      candleMaker.send({ type: 'startUser', user });

    });
    resetAtMidnight({ notMidnight: true });
  } catch (err) {
    devLog(err, 'error starting sync');
  }
}

// this is separated from the startSync function so it can be called separately when a new user is created
async function initializeUserLoops(user) {
  // if (!user.active || !user.approved) {
  //   devLog(user, '<- the user');
  //   return
  // }
  const userID = user.id;
  try {
    // set up cache for user
    await userStorage.createNewUser(user);
        // update funds if the user is all of the above except for maintenance
        user = userStorage.getUser(userID);
        // devLog(user, '<- user while init loops')
        await sleep(10000);
        if (user?.active && user?.approved && !botSettings.maintenance) {
          await updateFunds(userID);
          devLog('FUNDS INITED')
          await sleep(5000);
        }
    // start syncing orders over the REST api
    syncOrders(userID);
    // start looking for orders to process
    processingLoop(userID);
    // start websocket connection to coinbase for rapid order updates
    startWebsocket(userID);
  } catch (err) {
    devLog(err, 'error initializing loops');
  }
}

async function processingLoop(userID) {
  // get the user and bot settings from cache;
  const user = userStorage[userID].getUser();
  if (user.deleting) {
    return
  }

  // check that user is active, approved, and unpaused, and that the bot is not under maintenance
  if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {
    // flip orders that are settled in the db
    try {

      await processOrders(userID);
      // will_cancel orders can now be canceled.
      // there is no need to update client after this because it is updated when user clicks the kill button
      await databaseClient.deleteMarkedOrders(userID);
    } catch (err) {
      devLog(err, 'error at the end of the processing loop');
    }
  } else {
    // if the user should not be trading, slow loop
    await sleep(1000);
  }
  heartBeat(userID, 'beat');
  if (user) {
    setTimeout(() => {
      processingLoop(userID);
    }, 100);
  } else {
    devLog(`user ${userID} is NOT THERE, stopping processing loop for user`);
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
  const startTime = performance.now();

  try {
    const loopNumber = userStorage[userID].getLoopNumber();
    // send heartbeat signifying start of new loop
    if (user) {
      heartBeat(userID, 'heart');
    }
    if ((((loopNumber - 1) % (botSettings.full_sync * 10)) === 0) && user?.active && user?.approved && !botSettings.maintenance) {
      // every 10 full syncs, update the products in the database
      await updateProducts(userID);

    }
    // check that user is active, approved, and unpaused, and that the bot is not under maintenance
    if (user?.active && user?.approved && !user.paused && !botSettings.maintenance) {

      // *** WHICH SYNC ***
      if (((loopNumber - 1) % botSettings.full_sync) === 0) {

        // *** FULL SYNC ***
        // full sync compares all trades that should be on CB with DB,
        // and does other less frequent maintenance tasks
        await fullSync(userID);
      } else {

        // *** QUICK SYNC ***
        //  quick sync only checks fills endpoint and has fewer functions for less CPU usage
        await quickSync(userID);
        // desync extra orders
        await deSync(userID)
      } // end which sync

      // *** UPDATE ORDERS IN DATABASE ***
      await updateMultipleOrders(userID);
      // update funds after everything has been processed
      // await updateFunds(userID);

    } else {
      // if the user is not active or is paused, loop every 5 seconds
      await sleep(5000);
    }
    // update funds if the user is all of the above except for maintenance
    if (user?.active && user?.approved && !botSettings.maintenance) {
      await updateFunds(userID);
    }
  } catch (err) {
    MainLoopErrors(userID, err);
  } finally {
    // when everything is done, call the sync again if the user still exists
    if (user) {
      const endTime = performance.now();
      // API is limited to 10/sec, so make sure the bot waits that long between loops
      if (100 - (endTime - startTime) > 0) {
        // adding an extra 200ms because the bot was still getting rate limited
        await sleep(300 - (endTime - startTime));
      }
      // wait however long the admin requires, then start new loop
      setTimeout(() => {
        userStorage[userID].clearStatus();
        syncOrders(userID);
      }, (botSettings.loop_speed * 10));
    } else {
      devLog(`user ${userID} is NOT THERE, stopping main loop for user`);
    }
  }
}


async function updateProducts(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('---- updating products ----');
      const products = await cbClients[userID].getProducts();
      await databaseClient.insertProducts(products.products, userID);
      resolve();
      devLog('---- finished updating products ----');
    } catch (err) {
      devLog(err, 'error updating products');
      reject(err);
    }
  });
}


function MainLoopErrors(userID, err) {
  let errorData;
  let errorText;
  if (err?.response?.data) {
    errorData = err?.response.data;
  }
  if (err?.code === 'ECONNRESET') {
    errorText = 'Connection reset by Coinbase server';
    devLog('Connection reset by Coinbase server. Probably nothing to worry about unless it keeps happening quickly.');
  } else if (err?.response?.status === 500) {
    devLog('internal server error from coinbase');
    errorText = 'Internal server error from coinbase';
  } else if (err?.response?.status === 401) {
    devLog(err?.response?.data, 'Invalid Signature');
    errorText = 'Invalid Signature. Probably nothing to worry about unless it keeps happening quickly.';
  } else if (err?.response?.statusText === 'Bad Gateway') {
    devLog('bad gateway');
    errorText = 'Bad Gateway. Probably nothing to worry about unless it keeps happening quickly.';
  } else if (err?.response?.statusText === 'Gateway Timeout') {
    devLog('Gateway Timeout');
    errorText = 'Gateway Timeout. Nothing to worry about. Coinbase probably lost the connection';
  } else if (err?.code === 'ECONNABORTED') {
    devLog('10 sec timeout');
    errorText = '10 second timeout. Nothing to worry about, Coinbase was just slow to respond.';
  } else if (err?.response?.status === 429) {
    devLog(err, 'too many requests');
    errorText = 'Too many requests. Rate limit exceeded. Nothing to worry about.';
  } else {
    devLog(err, 'unknown error at end of syncOrders');
    errorData = 'Unknown error at end of syncOrders. Who knows WHAT could be wrong???';
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
      // get the user's settings
      const user = userStorage[userID].getUser();
      // devLog(user.sync_quantity, 'desyncing');
      // get the buys and sells that need to desync
      const ordersToDeSync = await Promise.all([
        databaseClient.getDeSyncs(userID, user.sync_quantity, 'buys'),
        databaseClient.getDeSyncs(userID, user.sync_quantity, 'sells')
      ]);
      let buysToDeSync = ordersToDeSync[0];
      let sellsToDeSync = ordersToDeSync[1];

      // push them into the all array
      allToDeSync.push(...buysToDeSync);
      allToDeSync.push(...sellsToDeSync);


      // cancel them all
      await cancelAndReorder(allToDeSync, userID);

      resolve();
    } catch (err) {
      devLog('desync error');
      reject(err)
    }
  });
}


// FULL SYNC, will compare all trades that should be on CB, and do other less frequent maintenance tasks
async function fullSync(userID) {
  userStorage[userID].updateStatus('begin full sync');
  return new Promise(async (resolve, reject) => {
    try {
      const user = userStorage[userID].getUser();
      // devLog(user.sync_quantity, 'desyncing');
      // get lists of trades to compare which have been settled
      const results = await Promise.all([
        // get all open orders from db and cb
        databaseClient.getLimitedUnsettledTrades(userID, user.sync_quantity),
        // get open orders
        cbClients[userID].getOrders({ order_status: 'OPEN' }),
        // get fees
        cbClients[userID].getTransactionSummary({ user_native_currency: 'USD' })
      ]);
      // store the lists of orders in the corresponding constants so they can be compared
      const dbOrders = results[0];
      const allCbOrders = results[1].orders;
      const fees = results[2];


      // need to save the fees for more accurate Available funds reporting
      // fees don't change frequently so only need to do this during full sync
      await databaseClient.saveFees(fees, userID);

      // remove any orders from cbOrders that have a product id that is not active for the user
      // first get the list of active products
      const activeProducts = await databaseClient.getActiveProductIDs(userID);

      // then filter out any orders that are not in the active products list
      const cbOrders = allCbOrders.filter(order => activeProducts.includes(order.product_id));
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
      devLog('error in full sync');
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



      const user = userStorage[userID].getUser();
      // devLog(user.sync_quantity, 'desyncing');
      // after checking fills, store the most recent so don't need to check it later
      // this will check the specified number of trades to sync on either side to see if any 
      // need to be reordered. It will only find them on a loop after a loop where trades have been placed
      // todo - maybe this should go after the updateMultipleOrders function so it will fire on same loop
      const reorders = await databaseClient.getReorders(userID, user.sync_quantity)
      // combine the arrays
      const toCheck = unsettledFills.concat(reorders);
      // set orders to check so the next process can access them without needing to pass params through
      userStorage[userID].addToCheck(toCheck);
      resolve(toCheck);
    } catch (err) {
      devLog('error in quick sync');
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
          let tradeDetails = flipTrade(dbOrder, user, tradeList);
          // ...send the new trade
          try {

            // check if the trade should be canceled. This is the point of no return
            const willCancel = userStorage[userID].checkCancel(dbOrder.order_id);
            if (!willCancel) {
              // place the new trade on coinbase
              // devLog(tradeDetails, '<- tradeDetails before placing the flipped order')
              let cbOrder = await cbClients[userID].placeOrder(tradeDetails);
              // let cbOrder = false
              // if the new trade was successfully placed...
              // devLog(cbOrder, 'cbOrder before checking success')
              if (cbOrder.success) {
                // ...get the new order from coinbase since not all details are returned when placing
                const newOrder = await cbClients[userID].getOrder(cbOrder.success_response.order_id);
                // ...store the new trade
                // take the time the new order was created, and use it as the flipped_at value
                const flipped_at = newOrder.order.created_time
                // devLog('storing trade', newOrder.order)
                await databaseClient.storeTrade(newOrder.order, dbOrder, flipped_at);
                // await databaseClient.storeTrade(cbOrder, dbOrder, cbOrder.created_at);
                // ...mark the old trade as flipped
                await databaseClient.markAsFlipped(dbOrder.order_id);
                // tell the frontend that an update was made so the DOM can update
                devLog('sending order update from processOrders');
                // userStorage[userID].orderUpdate();
                messenger[userID].orderUpdate();
              } else {
                devLog(dbOrder, userID, 'new trade failed!!!');
                messenger[userID].newError({
                  errorData: dbOrder,
                  errorText: 'Something went wrong while flipping an order'
                })
              }
            }

          } catch (err) {
            let errorText;
            if (err.code && err.code === 'ETIMEDOUT') {
              devLog('Timed out!!!!! from processOrders');
              errorText = 'Coinbase timed out while flipping an order';
            } else if (err.response?.status === 400) {
              devLog(err.response, 'Bad Request! from processOrders');
              errorText = 'Bad request while trying to flip a trade! After the flip function';
              // todo - check funds to make sure there is enough for 
              // all of them to be replaced, and balance if needed
            } else {
              devLog(err, 'unknown error in processOrders');
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
      devLog(err, '!!!!!!!!!!!!!!!!!error at end of processOrders');
      reject(err);
    }
  });
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
function flipTrade(dbOrder, user, allFlips, simulation) {
  const userID = user.id
  !simulation && userStorage[userID].updateStatus('start flip trade');
  const reinvestRatio = user.reinvest_ratio / 100;
  const postMaxReinvestRatio = user.post_max_reinvest_ratio / 100;
  const maxTradeSize = user.max_trade_size;
  // create post_only const which is only true if the product_id is USDT-USD
  const post_only = dbOrder.product_id === 'USDT-USD' ? true : false;
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
    post_only: post_only,
  };

  const avail = userStorage[userID].getAvailableFunds();
  const prodFunds = avail[tradeDetails.product_id]
  // devLog(dbOrder, '<- dbOrder... needs to flip. Price is too many decimals?', prodFunds, '<- prodfunds', avail, '<- avail')

  // get decimals after .
  const base_increment_decimals = prodFunds.base_increment.split('.')[1]?.split('').findIndex((char) => char !== '0') + 1;
  // devLog(base_increment_decimals, 'base inc dec')
  const quote_increment_decimals = prodFunds.quote_increment.split('.')[1]?.split('').findIndex((char) => char !== '0') + 1;

  // add buy/sell requirement and price
  if (dbOrder.side === "BUY") {
    // if it was a BUY, sell for more. multiply old price
    tradeDetails.side = "SELL"
    tradeDetails.limit_price = Number(dbOrder.original_sell_price).toFixed(quote_increment_decimals || 16);
    !simulation && messenger[userID].newMessage({
      type: 'general',
      text: `Selling for $${Number(tradeDetails.limit_price)}`
    });
  } else {
    // if it is a sell turning into a buy, check if user wants to reinvest the funds
    if (user.reinvest) {
      const orderSize = Number(dbOrder.base_size);


      // get available funds from userStorage
      const availableFunds = !simulation
        ? userStorage[userID].getAvailableFunds()
        : user.availableFunds;
      const productID = dbOrder.product_id;

      // get the available USD funds for the product_id
      const availableUSD = !simulation
        ? availableFunds[productID]?.quote_available
        : user.availableQuote;

      // find out how much profit there was
      const BTCprofit = calculateProfitBTC(dbOrder);

      let amountToReinvest = BTCprofit * reinvestRatio;
      devLog(amountToReinvest, 'amountToReinvest');
      if (amountToReinvest <= 0) {
        amountToReinvest = 0;
        !simulation && messenger[userID].newError({
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

      devLog(maxSizeBTC, 'maxSizeBTC', maxTradeSize, 'maxTradeSize');

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
        const leftoverFunds = (Number(availableUSD) - (allFlipsValue * (1 + Number(user.maker_fee))));

        // only set the new base_size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          // if there is enough money left in the account to reinvest, set the base_size to the max base_size
          tradeDetails.base_size = maxSizeBTC;
        }

        // check if the new base_size has already surpassed the user set max. If it has, reinvest based on the user set post-max settings
        if ((orderSize >= maxSizeBTC) && (postMaxReinvestRatio > 0)) {
          // at this point, the post max ratio should be used
          const postMaxAmountToReinvest = BTCprofit * postMaxReinvestRatio;
          const postMaxNewSize = Math.floor((orderSize + postMaxAmountToReinvest) * 100000000) / 100000000;
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
        const leftoverFunds = (Number(availableUSD) - (allFlipsValue * (1 + Number(user.maker_fee))));

        // only set the new base_size if it will stay above the reserve
        if (leftoverFunds > user.reserve) {
          tradeDetails.base_size = newSize.toFixed(8);
        }
      }

    }
    // if it was a sell, buy for less. divide old price
    tradeDetails.side = "BUY"
    tradeDetails.limit_price = Number(dbOrder.original_buy_price).toFixed(quote_increment_decimals || 16);
    !simulation && messenger[userID].newMessage({
      type: 'general',
      text: `Buying for $${Number(tradeDetails.limit_price)}`
    });
  }

  tradeDetails.base_size = Number(tradeDetails.base_size).toFixed(base_increment_decimals || 16);

  // make sure all properties of tradeDetails are strings unless they are boolean
  for (let key in tradeDetails) {
    if (typeof tradeDetails[key] !== 'boolean') {
      tradeDetails[key] = String(tradeDetails[key]);
    }
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


// this should just update the status of each trade in the ordersToCheck cached array
async function updateMultipleOrders(userID, params) {
  return new Promise(async (resolve, reject) => {
    userStorage[userID].updateStatus('start updateMultipleOrders (UMO)');
    // get the orders that need processing. This will have been taken directly from the db and include all details
    const ordersArray = params?.ordersArray
      ? params.ordersArray
      : userStorage[userID].getToCheck();

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
      const startTime = performance.now();
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
          // devLog(orderToCheck, 'order to check BIG PROBLEM');
          let updatedOrder = await cbClients[userID].getOrder(orderToCheck.order_id);
          // if it was cancelled, set it for reorder
          if (updatedOrder.order.status === 'CANCELLED') {
            devLog('was canceled but should not have been!')
            updatedOrder.order.reorder = true;
          } else if (updatedOrder.order.status === 'FAILED') {
            devLog('original order failed! reordering')
            updatedOrder.order.reorder = true;
          }
          // then update db with current status
          await databaseClient.updateTrade(updatedOrder.order);
        }
      } catch (err) {
        devLog(err, 'error in updateMultipleOrders loop');
        await sleep(1000);
        let errorText = `Error updating order details`
        if (err?.error_response?.message) {
          errorText = errorText + '. Reason: ' + err.error_response.message
        }
        messenger[userID].newError({
          errorData: orderToCheck,
          errorText: errorText
        })
      } // end catch
      const endTime = performance.now();
      // API is limited to 10/sec, so make sure the bot waits that long between loops
      if (100 - (endTime - startTime) > 0) {
        await sleep(100 - (endTime - startTime));
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
      // get the product from the db
      const product = await databaseClient.getProduct(upToDateDbOrder.product_id, userID);
      devLog(product, 'product in reorder');
      // get the number of decimals for the base_increment of the product. This is used to round the base_size
      const decimals = addProductDecimals(product);

      // make new tradeDetails so client id is not passed from old order
      const tradeDetails = {
        side: upToDateDbOrder.side,
        limit_price: Number(upToDateDbOrder.limit_price).toFixed(decimals.quote_increment_decimals), // quote currency
        base_size: Number(upToDateDbOrder.base_size).toFixed(decimals.base_increment_decimals), // base currency
        product_id: upToDateDbOrder.product_id,
      };
      // send the new order with the trade details
      let pendingTrade = await cbClients[userID].placeOrder(tradeDetails);
      if (pendingTrade.success) {
        // devLog(pendingTrade, '<- pendingTrade, should be a success and we need the id')
        let newTrade = await cbClients[userID].getOrder(pendingTrade.success_response.order_id)
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
        devLog(pendingTrade, 'success false error in reorder function in robot.js');
        reject(pendingTrade);
      }
    } catch (err) {
      devLog(err, 'error in reorder function in robot.js');
      await sleep(1000);
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
        devLog('error cancelling multiple orders');
        reject(err);
      }

      // if all goes well, send message to user and resolve promise with success message
      devLog('sending order update from cancelAndReorder');
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
  userStorage[userID].updateStatus('get available funds');
  return new Promise(async (resolve, reject) => {
    try {
      // devLog('get available funds');
      if (!userSettings?.active) {
        devLog('not active!');
        reject('user is not active')
        return;
      }
      const takerFee = Number(userSettings.taker_fee) + 1;

      const results = await Promise.all([
        cbClients[userID].getAllAccounts(),
        // funds are withheld in usd when a buy is placed, so the maker fee is needed to subtract fees
        // databaseClient.getSpentUSD(userID, takerFee),
        // funds are taken from the sale once settled, so the maker fee is not needed on the buys
        // databaseClient.getSpentBTC(userID),
        // get a list of products that the user has active
        databaseClient.getActiveProducts(userID),
      ]);
      const accounts = results[0].accounts;

      // devLog(accounts.length, 'accounts in getAvailableFunds');

      const activeProducts = results[1];

      // get the amount spent for the base and quote currencies for each product
      // and add them to an array of currency objects with the currency id and amount spent
      // if the currency already exists in the array, add the amount spent to the amount spent for that currency
      const currencyArray = [];
      for (let i = 0; i < activeProducts.length; i++) {
        const product = activeProducts[i];
        const baseCurrency = product.base_currency_id;
        const quoteCurrency = product.quote_currency_id;
        const baseSpent = await databaseClient.getSpentBase(userID, product.product_id);
        const quoteSpent = await databaseClient.getSpentQuote(userID, takerFee, product.product_id);

        // if the base currency is already in the array, add the amount spent to the existing amount spent
        if (currencyArray.some(currency => currency.currency_id === baseCurrency)) {
          const index = currencyArray.findIndex(currency => currency.currency_id === baseCurrency);
          currencyArray[index].amount_spent += baseSpent;
        } else {
          // if the base currency is not in the array, add it
          currencyArray.push({ currency_id: baseCurrency, amount_spent: baseSpent, quoteSpentOnProduct: quoteSpent })
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
      // calculate the available funds for each currency rounded to 16 decimal places
      const availableFundsNew = [];
      for (let i = 0; i < currencyArray.length; i++) {
        const currency = currencyArray[i];
        // get the currency from the accounts
        const [account] = accounts.filter(account => account.currency === currency.currency_id);

        // devLog(account, 'account in getAvailableFunds');
        // calculate the available funds
        const available = Number(account?.available_balance?.value || 0) + Number(account?.hold?.value || 0) - currency.amount_spent;
        // round to 16 decimal places
        const availableRounded = available.toFixed(16);
        // add the currency and available funds to the array
        availableFundsNew.push({ currency_id: currency.currency_id, available: availableRounded, spent: currency.amount_spent, quote_spent_on_product: currency.quoteSpentOnProduct })
      }

      // make an object with an object for each user's product with the product id as the key for each nested object 
      // each nested object has the available funds for the base and quote currencies, along with the name of the currency
      // oh no
      // this is bad
      // what was I thinking
      // there are so many objects being turned into other objects and arrays and back again and beyond
      const availableFundsObject = {};
      for (let i = 0; i < activeProducts.length; i++) {
        const product = activeProducts[i];
        const baseCurrency = product.base_currency_id;
        const quoteCurrency = product.quote_currency_id;
        const baseAvailable = availableFundsNew.find(currency => currency.currency_id === baseCurrency).available;
        const quoteAvailable = availableFundsNew.find(currency => currency.currency_id === quoteCurrency).available;
        const baseSpent = availableFundsNew.find(currency => currency.currency_id === baseCurrency).spent;
        const quoteSpent = availableFundsNew.find(currency => currency.currency_id === quoteCurrency).spent;
        const quoteSpentOnProduct = availableFundsNew.find(currency => currency.currency_id === baseCurrency).quote_spent_on_product;

        availableFundsObject[product.product_id] = {
          base_currency: baseCurrency,
          base_available: baseAvailable,
          base_increment: product.base_increment,
          quote_currency: quoteCurrency,
          quote_available: quoteAvailable,
          quote_increment: product.quote_increment,
          base_spent: baseSpent,
          quote_spent: quoteSpent,
          quote_spent_on_product: quoteSpentOnProduct,
        }
      }

      resolve(availableFundsObject)
    } catch (err) {
      messenger[userID].newError({
        errorText: 'error getting available funds',
        data: err
      })
      reject(err)
    }
  })
}

async function updateFunds(userID, identifier) {
  userStorage[userID].updateStatus('begin update funds');
  return new Promise(async (resolve, reject) => {
    try {
      const userSettings = await databaseClient.getUserAndSettings(userID);
      const available = await getAvailableFunds(userID, userSettings);
      const previousAvailable = userStorage[userID].getAvailableFunds();

      // update the user's available funds in the userStorage
      userStorage[userID].updateAvailableFunds(available);

      // compare the previous available funds to the new available funds
      const availableFundsChanged = compareAvailableFunds(previousAvailable, available);

      // if the available funds have changed, update the DOM
      if (availableFundsChanged) {
        devLog('sending order update from updateFunds after available funds changed');
        messenger[userID].userUpdate(identifier);
      }
      resolve()
    } catch (err) {
      messenger[userID].newError({
        errorText: 'error getting available funds',
        data: err
      })
      reject(err)
    }
  })
}

function compareAvailableFunds(previousAvailable, availableFunds) {
  // return true if the available funds have changed or if there are no previous available, false if they have not changed
  for (let product in availableFunds) {
    if (!previousAvailable[product]) {
      return true;
    }
    if (previousAvailable[product].base_available !== availableFunds[product].base_available) {
      return true;
    }
    if (previousAvailable[product].quote_available !== availableFunds[product].quote_available) {
      return true;
    }
  }
  return false;
}

async function alertAllUsers(alertMessage) {
  try {
    const userList = await databaseClient.getAllUsers();
    userList.forEach(user => {
      messenger[user.id].newMessage({
        type: 'general',
        text: alertMessage,
        userUpdate: true
      });
    });
  } catch (err) {
    devLog(err, 'error while alerting all users of change');
  }
}

function heartBeat(userID, side) {
  messenger[userID].heartBeat(side);
}


const robot = {
  flipTrade: flipTrade,
  syncOrders: syncOrders,
  processOrders: processOrders,
  updateMultipleOrders: updateMultipleOrders,
  startSync: startSync,
  initializeUserLoops: initializeUserLoops,
  getAvailableFunds: getAvailableFunds,
  updateFunds: updateFunds,
  alertAllUsers: alertAllUsers,
}


export { robot, flipTrade };