const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const botStatus = require('./botStatus');
const flipTrade = require('./flipTrade');
const orderElimination = require('./orderElimination');
// const toggleCoinbot = require('./toggleCoinbot');
// const robot = require('./robot');


// The express server itself can use the socket.io-client package to call the ws connections
const io = require("socket.io-client");
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT);

// sleeper function to slow down the loop
// can be called from an async function and takes in how many milliseconds to wait
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// todo - something is causing an insufficient funds message when many orders are placed rapidly from DOM
// possibly need to put our arrays in an order. They are coming back in random order from db. Maybe need to order by date?
// depending on settled status, the loop may be trying to sell btc that it doesn't acually have.
// solution for now is to not smash that send new trade button. You don't have that kind of money anyway.
// also possible that smashing send trade button simply makes too make requests, and one of them stores in db but doesn't go through?
// looks like the bot starts a new loop before it is done flipping a trade and marking it as settled. This is an async issue.
// maybe need to mark it as settled in the db sooner. Before calling tradeFlipper?
// or maybe the loop does not wait to update to settled before calling itself again
// POSSIBLE FIX - move trade updating into own function and make it a promise

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
      if (botStatus.toggle) {
        console.log('=============through the loop again');
        theLoop()
      }
    })
    .catch(error => {
      console.log('error in the loop', error);
      console.error(error)
    });
}

const checker = async (ordersToCheck) => {
  // brother may I have some loops
  // the order object can be used throughout the loop to refer to the old order that may have settled
  for (const dbOrder of ordersToCheck) {
    // need to stop the loop if coinbot is off
    if (botStatus.toggle) {
      // wait for 1/10th of a second between each api call to prevent too many
      await sleep(500);
      socket.emit('checkerUpdate', dbOrder);
      console.log('checking this', dbOrder);

      // send request to coinbase API to get status of a trade
      authedClient.getOrder(dbOrder.id)
        // now can refer to dbOrder as old status of trade and cbOrder as current status
        .then((cbOrder) => {
          // if it has indeed settled, make the opposit trade and call it good
          if (cbOrder.settled) {
            // tell frontend it is settled
            socket.emit('checkerUpdate', cbOrder);
            // get the trade details for the new trade. Flip buy/sell and get new price
            const tradeDetails = flipTrade(dbOrder, cbOrder);
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
              .then(() => {
                console.log('order updated');
                return true
              })
              .catch(error => {
                if (error.message) {
                  console.log(error.message);
                } else {
                  console.log('houston we have a problem in the loop', error);
                }
              });
          } else {
            return true;
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
}

// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB




module.exports = theLoop;