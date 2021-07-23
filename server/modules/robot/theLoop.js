const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const botStatus = require('./botStatus');
const orderElimination = require('./orderElimination');
const checker = require('./checker');
const sleep = require('./sleep');

// The express server itself can use the socket.io-client package to call the ws connections
const io = require("socket.io-client");
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT);

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
  socket.emit('message', { message: `another loop, brother: ${botStatus.loop}` });
  botStatus.loop++;
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
      const success = checker(ordersToCheck, socket);
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







module.exports = theLoop;