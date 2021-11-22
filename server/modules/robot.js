const coinbaseClient = require("./coinbaseClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const socketClient = require("./socketClient");

// let synching = false;

// better just call this thing theLoop
async function theLoop() {
  // check all trades in db that are both settled and NOT flipped
  sqlText = `SELECT * FROM "orders" WHERE "settled"=true AND "flipped"=false;`;
  // store the trades in an object
  const tradeList = await pool.query(sqlText);
  // if there is at least one trade...
  if (tradeList.rows[0]) {
    // ...take the first trade that needs to be flipped, 
    let dbOrder = tradeList.rows[0];
    // ...flip the trade details
    let tradeDetails = flipTrade(dbOrder);
    // ...send the new trade
    try {
      let cbOrder = await coinbaseClient.placeOrder(tradeDetails);
      // ...store the new trade
      let results = await databaseClient.storeTrade(cbOrder, dbOrder);
      // ...mark the old trade as flipped
      const queryText = `UPDATE "orders" SET "flipped" = true WHERE "id"=$1;`;
      let updatedTrade = await pool.query(queryText, [dbOrder.id]);
      // tell the frontend that an update was made so the DOM can update
      socketClient.emit('message', {
        orderUpdate: true
      });
    } catch (err) {
      if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out!!!!! from the loop');
        await coinbaseClient.cancelAllOrders();
        console.log('synched orders just in case');
      } else if (err.response?.status === 400) {
        console.log('Insufficient funds! from the loop');
        socketClient.emit('message', {
          error: `Insufficient funds in the loop!`,
        });
        // todo - check funds to make sure there is enough for 
        // all of them to be replaced, and balance if needed
      } else {
        console.log('error in the loop', err);
      }
    } finally {
      // call the loop again. Wait half second to avoid rate limiting
      setTimeout(() => {
        theLoop();
      }, 300);
    }
  } else {
    // call the loop again right away since no connections have been used
    setTimeout(() => {
      theLoop();
    }, 50);
  }
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
function flipTrade(dbOrder) {
  // set up the object to be sent
  const tradeDetails = {
    side: '',
    price: '', // USD
    // when flipping a trade, size and product will always be the same
    size: dbOrder.size, // BTC
    product_id: dbOrder.product_id,
    stp: 'cn',
  };
  // add buy/sell requirement and price
  if (dbOrder.side === "buy") {
    // if it was a buy, sell for more. multiply old price
    tradeDetails.side = "sell"
    tradeDetails.price = dbOrder.original_sell_price;
    socketClient.emit('message', { message: `Selling for $${Number(tradeDetails.price)}` });
  } else {
    // if it was a sell, buy for less. divide old price
    tradeDetails.side = "buy"
    tradeDetails.price = dbOrder.original_buy_price;
    socketClient.emit('message', { message: `Buying for $${Number(tradeDetails.price)}` });
  }
  // return the tradeDetails object
  return tradeDetails;
}


// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// REST protocol to find orders that have settled on coinbase
const syncOrders = async () => {
  console.log('start syncOrders function');
  // create one order to work with
  // let order;
  try {
    // get lists of trades to compare which have been settled
    const results = await Promise.all([
      // get all open orders from db and cb
      databaseClient.getUnsettledTrades('all'),
      coinbaseClient.getOpenOrders()
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
    // if (ordersToCancel[0]) {
    try {
      console.log('starting cancel loop');
      let result = await cancelMultipleOrders(ordersToCancel);
      if (result.ordersCanceled) {
        console.log(result.message);
        socketClient.emit('message', {
          error: `Extra orders were found and canceled`,
          orderUpdate: true
        });
      }
    } catch (err) {
      console.log('error deleting extra order', err);
    }
    // wait for a second to allow cancels to go through so bot doesn't cancel twice
    await sleep(1000);
    // }

    // now flip all the orders that need to be flipped
    try {
      console.log('starting settle loop');
      let result = await settleMultipleOrders(ordersToCheck);
      if (result.ordersFlipped) {
        console.log(result.message);
      }
    } catch (err) {
      console.log('Error flipping all settled orders', err);
    }
    console.log('emitting message');
    socketClient.emit('message', {
      heartbeat: true,
    });
  } catch (err) {
    console.log('error at end of syncOrders', err);
  } finally {
    console.log('looping syncOrders again');
    // when everything is done, call the sync again
    setTimeout(() => {
      syncOrders();
    }, 300);
  }
}

async function settleMultipleOrders(ordersArray) {
  return new Promise(async (resolve, reject) => {
    if (ordersArray.length > 0) {
      console.log(`There are ${ordersArray.length} settled orders that should be flipped`);
      socketClient.emit('message', {
        message: `There are ${ordersArray.length} orders that need to be synced`,
      });

      // loop over the array and flip each trade
      for (let i = 0; i < ordersArray.length; i++) {
        const orderToCheck = ordersArray[i];
        // send heartbeat for each loop
        socketClient.emit('message', {
          heartbeat: true,
        });

        try {


          console.log('@@@@@@@ setting this trade as settled in the db', orderToCheck.id, orderToCheck.price);
          // wait between each loop to prevent rate limiting
          await sleep(500);

          console.log('need to flip this trade', orderToCheck.price);
          // get all the order details from cb
          let fullSettledDetails = await coinbaseClient.getOrder(orderToCheck.id);
          // console.log('here are the full settled order details', fullSettledDetails);
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

                await reorder(orderToCheck);
              } catch (err) {
                console.log('error reordering trade', err);
              }
            } // end reorder
          } // end not found
        } // end catch
      } // end for loop



      // if all goes well, resolve promise with success message
      resolve({
        message: "All settled orders were flipped successfully",
        ordersSettled: true
      });
    }
    // if no orders to settle, resolve
    resolve({
      message: "No orders to settle",
      ordersSettled: false
    });
  })
}

async function reorder(orderToReorder) {
  return new Promise(async (resolve, reject) => {
    const tradeDetails = {
      original_sell_price: orderToReorder.original_sell_price,
      original_buy_price: orderToReorder.original_buy_price,
      side: orderToReorder.side,
      price: orderToReorder.price, // USD
      size: orderToReorder.size, // BTC
      product_id: orderToReorder.product_id,
      stp: 'cn',
    };
    try {
      // send the new order with the trade details
      let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
      // store the new trade in the db. the trade details are also sent to store trade position prices
      let results = await databaseClient.storeTrade(pendingTrade, tradeDetails);

      // delete the old order from the db
      const queryText = `DELETE from "orders" WHERE "id"=$1;`;
      const response = await pool.query(queryText, [orderToReorder.id]);
      // console.log('response from cancelling order and deleting from db', response.rowCount);
      socketClient.emit('message', {
        message: `trade was reordered`,
        orderUpdate: true
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
          orderUpdate: true
        });
      } else {
        console.log('error in reorder function in robot.js');
        reject(err)
      }
    }
  });
}



async function cancelMultipleOrders(ordersArray) {
  return new Promise(async (resolve, reject) => {
    if (ordersArray.length > 0) {
      console.log(`There are ${ordersArray.length} extra orders that should be canceled`);
      // need to wait and double check db before deleting because they take time to store and show up on cb first
      // only need to wait once because as the loop runs nothing will be added to it. Only wait for most recent order
      await sleep(1000);

      for (let i = 0; i < ordersArray.length; i++) {
        const orderToCancel = ordersArray[i];
        // console.log('Order to cancel', orderToCancel.id);
        try {
          // check to make sure it really isn't in the db
          let doubleCheck = await databaseClient.getSingleTrade(orderToCancel.id);
          if (!doubleCheck) {
            // cancel the order if nothing comes back from db
            console.log('canceling order', orderToCancel.id, 'at price', orderToCancel.price);
            await coinbaseClient.cancelOrder(orderToCancel.id);
          } else {
            console.log('checked again for the order in the db', doubleCheck.id);
          }
        } catch (err) {
          if (err.response?.status === 404) {
            console.log('order not found when canceling extra order!');
            // if not found, cancel all orders may have been done, so get out of the loop
            // new array will be made on next loop
            i += ordersArray.length;
          } else if (err.response?.status === 401 || err.response?.status === 502) {
            console.log('connection issue in cancel orders loop. Probably nothing to worry about');
            socketClient.emit('message', {
              error: `Connection issue in cancel orders loop. Probably nothing to worry about unless it keeps repeating.`,
              orderUpdate: true
            });
          } else {
            console.log('unknown error in cancelMultipleOrders for loop');
            reject(err)
          }
        }
        // wait to prevent rate limiting
        await sleep(100);
      } //end for loop
      // if all goes well, resolve promise with success message
      resolve({
        message: "Extra orders were canceled",
        ordersCanceled: true
      })
    } else {
      resolve({
        message: "No orders to cancel",
        ordersCanceled: false
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
  theLoop: theLoop,
  syncEverything: syncEverything,
}


module.exports = robot;