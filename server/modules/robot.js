const authedClient = require("./authedClient");
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
      let cbOrder = await authedClient.placeOrder(tradeDetails);
      // ...store the new trade
      let results = await databaseClient.storeTrade(cbOrder, dbOrder);
      // ...mark the old trade as flipped
      const queryText = `UPDATE "orders" SET "flipped" = true WHERE "id"=$1;`;
      let updatedTrade = await pool.query(queryText, [dbOrder.id]);
      // tell the frontend that an update was made so the DOM can update
      socketClient.emit('message', {
        message: `an exchange was made`,
        orderUpdate: true
      });
    } catch (err) {
      if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out!!!!! from the loop');
        await authedClient.cancelAllOrders();
        console.log('synched orders just in case');
      } else if (err.response.statusCode === 400) {
        console.log('Insufficient funds! from the loop');
        // need to cancel all orders then check funds to make sure there is enough for 
        // all of them to be replaced, and balance if needed


        // await authedClient.cancelAllOrders();
        // console.log('synched orders just in case');
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
    socketClient.emit('message', { message: `Selling order ${dbOrder.id} for $${dbOrder.price}` });
  } else {
    // if it was a sell, buy for less. divide old price
    tradeDetails.side = "buy"
    tradeDetails.price = dbOrder.original_buy_price;
    socketClient.emit('message', { message: `Flipping sides to BUY on order ${dbOrder.id}` });
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
  // create one order to work with
  let order;
  try {
    // get lists of trades to compare which have been settled
    const results = await Promise.all([
      // get all open orders from db and cb
      databaseClient.getUnsettledTrades('all'),
      authedClient.getOrders({ status: 'open' })
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
    if (ordersToCancel[0] && ordersToCancel.length < 8) {
      console.log('these are the extra orders that should be canceled', ordersToCancel);
      // if there are orders, delete them from cb
      ordersToCancel.forEach(async order => {
        // need to wait and double check db before deleting because they take time to store and show up on cb first
        await sleep(1000);
        // check if order is in db
        try {
          let doubleCheck = await databaseClient.getSingleTrade(order.id);
          console.log('checked again for the order in the db', doubleCheck);
          if (!doubleCheck) {
            // cancel the order
            authedClient.cancelOrder(order.id)
          }
        } catch (err) {
          console.log('error deleting extra order', err);
        }
      });
      // wait for a second to allow cancels to go through so bot doesn't cancel twice
      await sleep(1000);
    }

    // tell interface how many trades need to be synched
    socketClient.emit('message', {
      error: `there were ${ordersToCheck.length} orders that need to be synced`,
      message: `Synching all orders`,
    });
    if (ordersToCheck[0]) {
      order = ordersToCheck[0]
      console.log('need to flip this trade', order.price);
      // get all the order details from cb
      let fullSettledDetails = await authedClient.getOrder(order.id);
      // console.log('here are the full settled order details', fullSettledDetails);
      // update the order in the db
      const queryText = `UPDATE "orders" SET "settled" = true, "done_at" = $1, "fill_fees" = $2, "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
      let result = await pool.query(queryText, [
        fullSettledDetails.done_at,
        fullSettledDetails.fill_fees,
        fullSettledDetails.filled_size,
        fullSettledDetails.executed_value,
        order.id
      ]);
    };
  } catch (err) {
    if (err.response?.statusCode === 404) {
      console.log('order not found', order.id);
      // check again to make sure after waiting a second in case things need to settle
      await sleep(5000);
      try {
        let fullSettledDetails = await authedClient.getOrder(order.id);
        console.log('here are the full settled order details that maybe need to be deleted', fullSettledDetails);
      } catch (err) {
        if (err.response.statusCode === 404) {
          if (order.will_cancel) {
            // if the order was supposed to be canceled
            console.log('need to delete for sure', order);
            // delete the trade from the db
            const queryText = `DELETE from "orders" WHERE "id"=$1;`;
            const response = await pool.query(queryText, [order.id]);
            // console.log('response from cancelling order and deleting from db', response.rowCount);
            socketClient.emit('message', {
              message: `exchange was tossed out of the ol' databanks`,
              orderUpdate: true
            });

          } else {
            // if the order was not supposed to be canceled
            console.log('need to reorder', order.price);

            // same code from trade post route
            const tradeDetails = {
              original_sell_price: order.original_sell_price,
              original_buy_price: order.original_buy_price,
              side: order.side,
              price: order.price, // USD
              size: order.size, // BTC
              product_id: order.product_id,
              stp: 'cn',
            };
            try {
              // send the new order with the trade details
              let pendingTrade = await authedClient.placeOrder(tradeDetails);
              // store the new trade in the db. the trade details are also sent to store trade position prices
              let results = await databaseClient.storeTrade(pendingTrade, tradeDetails);

              // delete the old order from the db
              const queryText = `DELETE from "orders" WHERE "id"=$1;`;
              const response = await pool.query(queryText, [order.id]);
              // console.log('response from cancelling order and deleting from db', response.rowCount);
              socketClient.emit('message', {
                message: `trade was reordered`,
                orderUpdate: true
              });

            } catch (err) {
              if (err.response.statusCode === 400) {
                console.log('Insufficient funds!');
              } else {
                console.log('problem in the loop reordering trade', err);
              }
            }


          }
        } else {
          console.log('error when looking for not found order in syncOrders', err);
        }
      }
    } else if (err.code && err.code === 'ESOCKETTIMEDOUT') {
      console.log('Timed out!!!!!');
      try{
        await authedClient.cancelAllOrders();
        console.log('synched orders just in case');
      } catch (err) {
        console.log('error at end of syncOrders function');
      }
    } else {
      console.log('error from robot.syncOrders', err);
    }
  } finally {
    // when everything is done, call the sync again
    setTimeout(() => {
      syncOrders();
    }, 300);
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
}


module.exports = robot;