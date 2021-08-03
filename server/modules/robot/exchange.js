const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('../socketClient');
const flipTrade = require('./flipTrade');
const robot = require('./robot');
const sleep = require('./sleep');


// the dbOrder object can be used throughout the loop to refer to the old order that may have settled
const exchange = async (dbOrder) => {
  // for (const dbOrder of ordersToCheck) {
  let cbOrder = {};
  // need to stop the loop if coinbot is off
  if (!robot.looping) {
    return
  };
  // wait for 1/10th of a second  to prevent too many api calls
  await sleep(100)
    .then(() => {
      socketClient.emit('message', { message: `at the exchange with trade ID: ${dbOrder.id}` });
      // send request to coinbase API to get status of a trade
      return authedClient.getOrder(dbOrder.id);
    })
    // ----- now can refer to dbOrder as old status of trade and cbOrder as current status
    .then((result) => {
      cbOrder = result;
      // if it has indeed settled, make the opposite trade and call it good
      if (!cbOrder.settled) {
        return
      }
      // get the trade details for the new trade. Flip buy/sell and get new price
      const tradeDetails = flipTrade(dbOrder, cbOrder);
      // send the order with the CB API to CB and place the trade
      return authedClient.placeOrder(tradeDetails);
    })
    .then((pendingTrade) => {
      // after trade is placed, store the returned pending trade values in the database
      return databaseClient.storeTrade(pendingTrade, dbOrder);
    })
    .then(() => {
      // after order succeeds, update settled in DB to be TRUE and add settlement info
      const queryText = `UPDATE "orders" SET "settled" = NOT "settled", "done_at" = $1, "fill_fees" = $2, "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
      return pool.query(queryText, [
        cbOrder.done_at,
        cbOrder.fill_fees,
        cbOrder.filled_size,
        cbOrder.executed_value,
        cbOrder.id
      ]);
    })
    .then(() => {
      socketClient.emit('update', {
        message: `an exchange was made`,
        orderUpdate: true
      });
    })
}

module.exports = exchange;