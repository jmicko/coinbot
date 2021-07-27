const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('../socketClient');
const robot = require('./robot');
const orderSubtractor = require('./orderSubtractor');
const exchange = require('./exchange');
const sleep = require('./sleep');


// This entire function needs to be careful with async coding
// Needs to wait for confirmation at every step, or it may act on old data and oversell/overbuy.
const theLoop = async () => {
  if (!robot.looping) {
    return
  }
  console.log('starting the loop');
  robot.loop++;
  socketClient.emit('update', { loopStatus: `${robot.loop} loop${robot.loop === 1 ? '' : 's'}, brother` });
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
  })
  .finally(() => {

    // after all is done, the loop will call itself. Maybe put this into a .finally()?
    //  always check if coinbot should be running before initiatin lööps
    if (robot.looping) {
      console.log('start the loop again!');
      theLoop()
    } else {
      // console.log('no more loops :(');
      socketClient.emit('update', { loopStatus: 'no more loops :(' });
    }
    robot.canToggle = true;
  })
}


module.exports = theLoop;