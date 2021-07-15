const pool = require('./pool');
const authedClient = require('./authedClient');

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
  // loop through dbOrders in a for each loop
  compareOrdersLoop = true;
  dbOrders.forEach(dborder => {
    console.log(dborder.id);
    // pull the id from coinbase inside the loop and store as object
    // send request to coinbase API to get status of a trade
    authedClient.getOrder(dborder.id)
      .then(cbOrder => {
        // check if the CB order has been settled yet
        console.log('this is the order settled value you asked for', cbOrder.settled, count);
        if (cbOrder.settled) {
          // if it has been settled, send a buy/sell order to CB

          // after order succeeds, update settled in DB to be TRUE

        }
        count++;
      })
      .catch(error => {
        console.log('there was an error fetching the orders', error)
      })
  });
  compareOrdersLoop = false;
}

function tradeLoop() {
    if (trading) {
      // if bot should be trading, also check if the loop from the compareOrders loop is running.
      // if the compareOrders loop is not running, bot will wait a few second and try again
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
      }, 5000);
    }
}

module.exports = toggleTrade;