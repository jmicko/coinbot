const pool = require('./pool');
const authedClient = require('./authedClient');
const databaseClient = require('./databaseClient/databaseClient')

// The express server itself can use the socket.io-client package to call the ws connections
const io = require("socket.io-client");
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT);

// sleeper function to slow down the loop
// can be called from an async function and takes in how many milliseconds to wait
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// boolean variable to turn coinbot on and off
let coinbot = false;

// toggle coinbot on and off
function toggleCoinbot() {
  // toggle coinbot boolean
  coinbot = !coinbot;
  // if the bot should now be coinbot, it starts the trade loop
  coinbot
    ? theLoop()
    : console.log('bot is not coinbot');
}


const theLoop = async () => {
  //  always check if coinbot should be running
  // wait for 1/10th of a second between each full loop call to prevent too many
  // need to make fewer than 15/sec
  await sleep(1000);
  console.log('==============bot is coinbot');
  // make variables to store the results from the 2 api calls, 
  // and one for orders that should be settled but need to be checked individually
  // let dbOrders = [],
  //   cbOrders = [];
  Promise.all([
    // get all open orders from db
    databaseClient.getUnsettledTrades(),
    authedClient.getOrders({ status: 'open' })
  ])
    .then((results) => {
      // store the orders in the corrosponding arrays so they can be compared
      const dbOrders = results[0],
        cbOrders = results[1];
      // compare the arrays and remove any where the ids match in both
      const ordersToCheck = orderElimination(dbOrders, cbOrders);
      // console.log('check', ordersToCheck);
      return ordersToCheck;
      // filter results from cb out of results from db
      // will be left with results from db that should be settled in cb
    })
    .then((ordersToCheck) => {
      // loop through the remaining array and double check each settled === true
      const success = checker(ordersToCheck);
      return success;
    })
    .then(() => {
      if (coinbot) {
        console.log('=============through the loop again');
        theLoop()
      }

    })
    .catch(error => {
      console.log('error in the loop', error);
      console.error(error)
      // if (error.Error) {

      // }
    });
}

const checker = async (ordersToCheck) => {
  // brother may I have some loops
  for (const order of ordersToCheck) {
    // need to stop the loop if coinbot is off
    if (coinbot) {
      // wait for 1/10th of a second between each api call to prevent too many
      await sleep(100);
      socket.emit('checkerUpdate', order);
      console.log('checking this', order);
      // pull the id from coinbase inside the loop and store as object
      // send request to coinbase API to get status of a trade
      await authedClient.getOrder(order.id)
      .then((cbOrder) => {
        console.log('loop boy loop boy', cbOrder.settled);
        console.log('loop boy loop boy', order.settled);
        // if it has indeed settled, make the opposit trade and call it good
        if (cbOrder.settled) {
            socket.emit('checkerUpdate', cbOrder);
            // if it has been settled, send a buy/sell order to CB
            // assume selling, but if it was just sold, change side to buy
            // the price to sell at is calculated to be 3% higher than the buy price
            let side = 'sell';
            let price = ((Math.round((order.price * 1.03) * 100)) / 100);
            if (order.side === 'sell') {
              // the price to buy at is calculated to be 3% lower than the sell price
              // todo - store original buy price in db, and always use it as the buy price 
              // to avoid price creep from rounding issues
              side = 'buy';
              price = ((Math.round((order.price / 1.03) * 100)) / 100);
              console.log('buying');
            } else {
              console.log('selling');
            }
            const tradeDetails = {
              side: side,
              price: price, // USD
              size: order.size, // BTC
              product_id: 'BTC-USD',
            };
            // function to send the order with the CB API to CB and place the trade
            authedClient.placeOrder(tradeDetails)
              .then(pendingTrade =>
                // after trade is placed, store the returned pending trade values in the database
                databaseClient.storeTrade(pendingTrade)
              )
              .then(result => {
                // after order succeeds, update settled in DB to be TRUE
                const queryText = `UPDATE "orders" SET "settled" = NOT "settled" WHERE "id"=$1;`;
                pool.query(queryText, [cbOrder.id])
              })
              .then(() => { console.log('order updated'); })
              .catch(error => {
                console.log('houston we have a problem on line 88 in the loop', error);
              });
          }
          return true;
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
}

// take in an array and an item to check
const orderElimination = (dbOrders, cbOrders) => {
  // let dbOrders = [];
  for (let i = 0; i < cbOrders.length; i++) {
    // look at each id of coinbase orders
    const cbOrderID = cbOrders[i].id;
    // console.log(cbOrderID);
    // filter out dborders of that id
    dbOrders = dbOrders.filter(id => {
      return (id.id !== cbOrderID)
    })
  }
  // console.log('======CHECK THESE:', dbOrders);
  return dbOrders;
}

module.exports = {
  toggleCoinbot: toggleCoinbot,
  theLoop: theLoop,
};