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
  console.log('here is the trade list', tradeList.rows);
  console.log('here is the first trade in the list', tradeList.rows[0]);
  // if there is at least one trade...
  if (tradeList.rows[0]) {
    // ...take the first trade that needs to be flipped, 
    let dbOrder = tradeList.rows[0];
    // ...flip the trade details
    let tradeDetails = flipTrade(dbOrder);
    console.log('these are the new trade details', tradeDetails);
    // ...send the new trade
    let cbOrder = await authedClient.placeOrder(tradeDetails);
    console.log('this is the new trade', cbOrder);
    // ...store the new trade
    let results = await databaseClient.storeTrade(cbOrder, dbOrder);
    console.log(`order placed, given to db with reply:`, results.message);
    // ...mark the old trade as flipped
    console.log();
    const queryText = `UPDATE "orders" SET "flipped" = true WHERE "id"=$1;`;
    let updatedTrade = await pool.query(queryText, [
      // cbOrder.done_at,
      // cbOrder.fill_fees,
      // cbOrder.filled_size,
      // cbOrder.executed_value,
      dbOrder.id
    ]);
    // console.log('updated trade, and id', updatedTrade, 'id:', dbOrder.id);
    // tell the frontend that an update was made so the DOM can update
    socketClient.emit('message', {
      message: `an exchange was made`,
      orderUpdate: true
    });
  }

  // call the loop again
  setTimeout(() => {
    theLoop();
  }, 1000);
}

// holds a list of trades that need to be sent. Any function can add to it by calling addToTradeQueue
// recentHistory will hold 1000 trades, and can be used to double check if a trade is being added twice
// current will be trades that still need to be sent, and will be shifted out when done
const tradeQueue = {
  recentHistory: [],
  current: []
};

// takes trades that need to be sent and adds them to the tradeQueue if they aren't already there
async function addToTradeQueue(trade) {
  let result;
  // check if the trade is new
  if (trade.isNew) {
    // if it is new, it comes from the ui. push it into tradeQueue, but not 
    // current because it does not have an id, and there is no risk of duplication 
    tradeQueue.current.push(trade);
    result = true;
    // console.log(tradeQueue);
  } else {
    // if it is not new, it will have an id. See if that id is already in the tradeQueue.recentHistory
    const duplicate = tradeQueue.recentHistory.filter(queuedTrade => {
      // console.log(queuedTrade.id);
      // console.log(trade.id);
      return queuedTrade.id == trade.id;
    });
    console.log('is it a duplicate?', duplicate.length);
    // if it is not in the tradeQueue.recentHistory, push it in. otherwise ignore it
    if (duplicate.length <= 0) {
      tradeQueue.recentHistory.push(trade);
      tradeQueue.current.push(trade);
      // console.log('the queue looks like this now. history length:',
      //   tradeQueue.recentHistory.length, 'current:', tradeQueue.current);
    } else {
      console.log('IT IS A DUPLICATE!!!!!!!!!!', trade.id);
    }
  }
  // finally, check how long the recentHistory is. If it is more than maxHistory, shift the oldest item out
  // console.log('((((((there are this many items in history', tradeQueue.recentHistory.length);
  if (tradeQueue.recentHistory.length > robot.maxHistory) {
    tradeQueue.recentHistory.shift();
  }
  if (result) {
    return result;
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

const syncOrders = async () => {
  // create one order to work with
  let order;
  if (robot.busy < 10) {
    let connections = 0;
    robot.synching = true;
    console.log('syncing all orders');
    try {
      // get lists of trade to compare which have been settled
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


      // change maxHistory limit to account for possibility of dumping a large number of orders 
      // into the tradeQueue when syncing
      robot.maxHistory += ordersToCheck.length;
      socketClient.emit('message', {
        error: `there were ${ordersToCheck.length} orders that need to be synced`,
        message: `Synching all orders`,
      });
      // console.log(ordersToCheck);
      console.log('maxHistory length is now:', robot.maxHistory);
      // ordersToCheck.forEach(async order => {
      if (ordersToCheck[0]) {

        order = ordersToCheck[0]

        console.log(order);
        // add the order to the tradeQueue
        // addToTradeQueue(order);

        console.log('=======here is the order that was being added to the tradequeue but should be marked as settled instead', order);



        // Actually changing this to mark them as settled in the db

        let fullSettledDetails = await authedClient.getOrder(order.id);

        console.log('here are the full settled order details', fullSettledDetails);

        const queryText = `UPDATE "orders" SET "settled" = true, "done_at" = $1, "fill_fees" = $2, "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
        let result = await pool.query(queryText, [
          fullSettledDetails.done_at,
          fullSettledDetails.fill_fees,
          fullSettledDetails.filled_size,
          fullSettledDetails.executed_value,
          order.id
        ]);
        console.log('++++++++result of updating order from cbWebsocket', result);



      };
    } catch (err) {
      if (err.response.statusCode === 404) {
        console.log('order not found', order);
        // check again to make sure after waiting a second in case things need to settle
        sleep(1000);
        try {

          let fullSettledDetails = await authedClient.getOrder(order.id);
          console.log('here are the full settled order details that maybe need to be deleted', fullSettledDetails);
        } catch (err) {
          if (err.response.statusCode === 404) {
            console.log('need to delete for sure');
            const queryText = `DELETE from "orders" WHERE "id"=$1;`;
            const response = await pool.query(queryText, [order.id]);
            console.log('response from cancelling order and deleting from db', response.rowCount);
          }
        }

      } else {
        console.log('error from robot.syncOrders', err);
      }
    } finally {
      // when everything is done, take tally of api connections, and set them to expire after one second
      setTimeout(() => {
        robot.busy -= connections;
        // console.log('connections used after clearing this trader:', robot.busy);
      }, 1000);
    }
  } else {
    setTimeout(() => {
      syncOrders();
    }, 100);
  }
}

// take in an array and an item to check
function orderElimination(dbOrders, cbOrders) {
  for (let i = 0; i < cbOrders.length; i++) {
    // look at each id of coinbase orders
    const cbOrderID = cbOrders[i].id;
    // console.log(cbOrderID);
    // filter out dbOrders of that id
    dbOrders = dbOrders.filter(id => {
      return (id.id !== cbOrderID)
    })
  }
  // console.log('======CHECK THESE:', dbOrders);
  // return a list of orders that are settled on cb, but have not yet been handled by the bot
  return dbOrders;
}

const robot = {
  // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
  // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
  canToggle: true,
  looping: false,
  wsTrading: 0,
  cbWebsocketConnection: false,
  loop: 0,
  busy: 0,
  sleep: sleep,
  flipTrade: flipTrade,
  tradeQueue: tradeQueue,
  addToTradeQueue: addToTradeQueue,
  syncOrders: syncOrders,
  synching: false,
  maxHistory: 200,
  theLoop: theLoop,
}


module.exports = robot;