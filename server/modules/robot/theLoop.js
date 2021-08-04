const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('../socketClient');
const robot = require('./robot');
const sleep = require('./sleep');
const flipTrade = require('./flipTrade');

// set up side toggle - can be boolean, may as well be buys first since trade-pairs are always buys first
// needs to be outside the loop so it can persist 
let checkingBuys = true;

// This entire function needs to be careful with async coding
// Needs to wait for confirmation at every step, or it may act on old data and oversell/overbuy.
const theLoop = async () => {
  let dbOrder;
  let cbOrder;
  // stop the bot if it has been toggled off
  if (!robot.looping) {
    return
  }
  try {
    robot.loop++;
    socketClient.emit('update', { loopStatus: `${robot.loop} loop${robot.loop === 1 ? '' : 's'}, brother` });

    // get top 1 of whichever side
    if (checkingBuys) {
      // get highest priced buy
      [dbOrder] = await databaseClient.getUnsettledTrades('highBuy');
    } else {
      // get lowest priced sell
      [dbOrder] = await databaseClient.getUnsettledTrades('lowSell');
      // console.log('lowSell', trade);
    }
    // if there is an order, check order against coinbase
    if (dbOrder) {
      await sleep(100);
      cbOrder = await authedClient.getOrder(dbOrder.id);
    }
    if (cbOrder && cbOrder.settled) {
      // flip trade and update if needed...
      const tradeDetails = flipTrade(dbOrder);
      console.log(tradeDetails);
      // send new order
      await sleep(100);
      let pendingTrade = await authedClient.placeOrder(tradeDetails);
      // store new order in db
      await databaseClient.storeTrade(pendingTrade, dbOrder);
      // update old order in db
      const queryText = `UPDATE "orders" SET "settled" = NOT "settled", "done_at" = $1, "fill_fees" = $2, "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
      await pool.query(queryText, [
        cbOrder.done_at,
        cbOrder.fill_fees,
        cbOrder.filled_size,
        cbOrder.executed_value,
        cbOrder.id
      ]);
      socketClient.emit('update', {
        message: `an exchange was made`,
        orderUpdate: true
      });
    } else {
      // ...else flip side toggle
      checkingBuys = !checkingBuys;
    }
  } catch (error) {
    if (error.message) {
      console.log('error message from exchange', error.message);
    }
    if (error.data && error.data.message) {
      console.log('error message, end of loop:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      // error handling should delete them so they are not counted toward profits if simply marked settled
      if (error.data.message === 'NotFound') {
        console.log('order not found in account. deleting from db', dbOrder);
        const queryText = `DELETE from "orders" WHERE "id"=$1;`;
        await pool.query(queryText, [dbOrder.id]);
        // .then(() => {
        console.log('exchange was tossed lmao');
        socketClient.emit('update', {
          message: `exchange was tossed out of the ol' databanks`,
          orderUpdate: true
        });
        // })
      }
    } else {
      console.log('yousa got a biiiig big problems', error);
      socketClient.emit('message', { message: 'big doo doo' });
    }
  } finally {
    if (robot.looping) {
      // call the loop again
      console.log('start the loop again!');
      theLoop()
    } else {
      socketClient.emit('update', { loopStatus: 'no more loops :(' });
    }
    robot.canToggle = true;
  }
}


module.exports = theLoop;