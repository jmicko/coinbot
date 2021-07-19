const pool = require('./pool');
const authedClient = require('./authedClient');
const storeTrade = require('./storeTrade');

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
let count = 0;
let loopSwitch = false;


// toggle coinbot on and off
function toggleCoinbot() {
  console.log('in toggleTrade function');
  // toggle coinbot boolean
  coinbot = !coinbot;
  // if the bot should now be coinbot, it starts the trade loop
  if (coinbot) {
    console.log('bot is coinbot');
    tradeLoop();
  } else {
    console.log('bot is not coinbot');
  }
}

const theLoop = async (dbOrders) => {
  loopSwitch = true;
  for (const dbOrder of dbOrders) {
    // need to stop the loop if coinbot is off
    if (coinbot) {
      // wait for 1/10th of a second between each api call to prevent too many
      await sleep(100);
      trade = dbOrder;
      socket.emit('checkerUpdate', trade);
      // pull the id from coinbase inside the loop and store as object
      // send request to coinbase API to get status of a trade
      await authedClient.getOrder(dbOrder.id)
        // eslint-disable-next-line no-loop-func
        .then(cbOrder => {
          // check if the CB order has been settled yet
          // console.log('this is the order settled value you asked for', cbOrder.settled, count);
          // brother may I have some loops
          if (cbOrder.settled) {
            // if it has been settled, send a buy/sell order to CB
            // assume selling, but if it was just sold, change side to buy
            // the price to sell at is calculated to be 3% higher than the buy price
            let side = 'sell';
            let price = ((Math.round((dbOrder.price * 1.03) * 100)) / 100);
            if (dbOrder.side === 'sell') {
              // the price to buy at is calculated to be 3% lower than the sell price
              // todo - store original buy price in db, and always use it as the buy price 
              // to avoid price creep from rounding issues
              side = 'buy';
              price = ((Math.round((dbOrder.price / 1.03) * 100)) / 100);
              console.log('buying');
            } else {
              console.log('selling');
            }
            const tradeDetails = {
              side: side,
              price: price, // USD
              size: dbOrder.size, // BTC
              product_id: 'BTC-USD',
            };
            // function to send the order with the CB API to CB and place the trade
            authedClient.placeOrder(tradeDetails)
              .then(pendingTrade =>
                // after trade is placed, store the returned pending trade values in the database
                storeTrade(pendingTrade)
              )
              .then(result => { console.log('just got back from storing this in db:', result) })

            // after order succeeds, update settled in DB to be TRUE
            const queryText = `UPDATE "orders" SET "settled" = NOT "settled" WHERE "id"=$1;`;
            pool.query(queryText, [cbOrder.id])
              .then(() => { console.log('order updated'); })
              .catch(error => {
                console.log('houston we have a problem on line 88 in the loop', error);
              });
          }
          count++;
        })
        .catch(error => {
          console.log('there was an error fetching the orders', error)
        })
    };
  }
  loopSwitch = false;
  count = 0;
}

function tradeLoop() {
  if (coinbot) {
    // if bot should be coinbot, also check if the loop from the theLoop loop is running.
    // if the theLoop loop is not running, bot will wait a second and try again
    if (!loopSwitch) {
      // pull all "unsettled" orders from DB
      const sqlText = `SELECT * FROM "orders" WHERE "settled"=FALSE;`;
      pool.query(sqlText)
        // pass the DB orders to a function to compare them to the orders in CB
        .then((result) => theLoop(result.rows))
        .catch(error => {
          console.log('error fetching orders from database', error);
        });
    }
    // if the bot should still be coinbot, it waits 1 second and then calls itself again
    // by checking coinbot at the beginning of the function, and calling itself at the end,
    // the code won't run if the toggle is turned off in the middle, but it will still finish a cycle
    setTimeout(() => {
      tradeLoop();
    }, 1000);
  }
}

module.exports = {
  toggleCoinbot: toggleCoinbot,
  theLoop: theLoop,
  tradeLoop: tradeLoop,
};