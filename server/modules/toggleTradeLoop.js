const pool = require('./pool');
const authedClient = require('./authedClient');
const storeTransaction = require('../modules/storeTransaction');

// sleeper function to slow down the loop
// can be called from an async function and takes in how many milliseconds to wait
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// boolean variable to turn auto trading on and off
let trading = false;
let count = 0;
let compareOrdersLoop = false;


// toggle auto trading on and off
function toggleTrade() {
  console.log('in toggleTrade function');
  // toggle trading boolean
  trading = !trading;
  // if the bot should now be trading, it starts the trade loop
  if (trading) {
    console.log('bot is trading');
    tradeLoop();
  } else {
    console.log('bot is not trading');
  }
}

function compareOrders(dbOrders) {
  // set variable so other functions know a loop is looping
  compareOrdersLoop = true;
  // loop through dbOrders in a for each loop
  // dbOrders.forEach(dbOrder => {
    theLoop(dbOrders);
  }
  
  const theLoop = async (dbOrders) => {
    for (const dbOrder of dbOrders){
      // wait for 1/10th of a second between each api call to prevent too many
      await sleep(100)
      console.log(dbOrder);
      // pull the id from coinbase inside the loop and store as object
      // send request to coinbase API to get status of a trade
      // setTimeout(() => {
        // }, 5000);
        authedClient.getOrder(dbOrder.id)
        .then(cbOrder => {
          // check if the CB order has been settled yet
          console.log('this is the order settled value you asked for', cbOrder.settled, count);
          // brother may I have some loops
          if (cbOrder.settled) {
            // if it has been settled, send a buy/sell order to CB
            // assume selling, but if it was just sold, change side to buy
            // the price to sell at is calculated to be 3% higher than the buy price
            let side = 'sell';
            let price = dbOrder.price * 1.03
            if (dbOrder.side === 'sell') {
              // the price to buy at is calculated to be 3% lower than the sell price
              // todo - store original buy price in db, and always use it as the buy price 
              // to avoid price creep from rounding issues
              side = 'buy';
              price = ((Math.round((33000 / 1.03) * 100)) / 100);
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
            .then(pendingTrade => {
              // after trade is placed, store the returned pending trade values in the database
              // req.pendingTrade = pendingTrade;
              // console.log('req.pendingTrade is', req.pendingTrade);
              let res;
              // storeTransaction(pendingTrade, res, next)
            })
            // after order succeeds, update settled in DB to be TRUE
            
          }
          count++;
        })
        .catch(error => {
          console.log('there was an error fetching the orders', error)
        })
      };
      compareOrdersLoop = false;
      
    }
    
    function tradeLoop() {
      if (trading) {
        // if bot should be trading, also check if the loop from the compareOrders loop is running.
        // if the compareOrders loop is not running, bot will wait a second and try again
        if (!compareOrdersLoop) {
      // pull all "unsettled" orders from DB
      const sqlText = `SELECT * FROM "orders" WHERE "settled"=FALSE;`;
      pool.query(sqlText)
        // pass the DB orders to a function to compare them to the orders in CB
        .then((result) => compareOrders(result.rows))
        .catch(error => {
          console.log('error fetching orders from database', error);
        });
    }
    // if the bot should still be trading, it waits 1 second and then calls itself again
    // by checking trading at the beginning of the function, and calling itself at the end,
    // the code won't run if the toggle is turned off in the middle, but it will still finish a cycle
    setTimeout(() => {
      tradeLoop();
    }, 1000);
  }
}

module.exports = toggleTrade;