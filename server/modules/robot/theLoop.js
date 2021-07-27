const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('../socketClient');
const botStatus = require('./botStatus');
const orderSubtractor = require('./orderSubtractor');
const exchange = require('./exchange');
const sleep = require('./sleep');


// This entire function needs to be careful with async coding
// Needs to wait for confirmation at every step, or it may act on old data and oversell/overbuy.
const theLoop = async () => {
  botStatus.loop++;


  // socketClient.sendMessage(`hi ${botStatus.loop}` );
  socketClient.emit('update', { loopStatus: `${botStatus.loop} loop${botStatus.loop === 1 ? '' : 's'}, brother` });


  // socketClient.emit(`${botStatus.loop} loop${botStatus.loop === 1 ? '' : 's'}, brother`);
  // wait for 1/10th of a second between each loop to prevent too many API calls per second
  await sleep(100)
  .then(() => {
    return Promise.all([
      // get all open orders from db and from coinbase
      databaseClient.getUnsettledTrades('all'),
      authedClient.getOrders({ status: 'open' })
    ])
    .then((results) => {
      // Promise. all returns an array with an object for each function in the order they were called
      const dbOrders = results[0], cbOrders = results[1];
      // subtract coinbase orders from database orders, returning an array of orders that have settled in coinbase since the last loop
      return orderSubtractor(dbOrders, cbOrders);
    })
    .then((ordersToCheck) => {
      // send the newly settled orders to the exchange where they will be doublechecked and flipped
      return exchange(ordersToCheck);
    })
  })
  .catch(error => {
    console.log('error in the loop', error);
    console.error(error);
  });
  // after all is done, the loop will call itself. Maybe put this into a .finally()?
  //  always check if coinbot should be running before initiatin lööps
  if (botStatus.toggle) {
    console.log('start the loop again!');
    theLoop()
  } else {
    console.log('no more loops :(');
    socketClient.emit('update', { loopStatus: 'no more loops :(' });
  }
}


module.exports = theLoop;