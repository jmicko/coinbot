const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('../socketClient');
const robot = require('./robot');
const orderSubtractor = require('./orderSubtractor');
const exchange = require('./exchange');
const sleep = require('./sleep');
const flipTrade = require('./flipTrade');

let checkingBuys = true;

// This entire function needs to be careful with async coding
// Needs to wait for confirmation at every step, or it may act on old data and oversell/overbuy.
const theLoop = async () => {
  // currentCheck will be used later for error handling
  let currentCheck = {};
  let dbOrder;

  /* bot does not need to check all open orders.
  Only highest priced buy, and lowest priced sell.
  If either of those has not settled, neither will have the next highest buy/lowest sell.
  No point in processing them.
  
  Can eliminate second loop entirely by only checking buy/sell at a time. 
  Make a toggle that gets flipped at the end of the function to check other side.
  Aka if it just checked the highest buy, switch to sell, then on next loop it will check highest sell.
  If a trade has settled, the price is likely moving in that direction, so don't flip the switch. 
  Keep checking that side in case the price moved a lot in that direction. 
  
  this also means no need to get all open orders from coinbase which can be taxing if there are a lot,
  since we only check one at a time. */

  // set up side toggle - can be boolean, may as well be buys first since trade-pairs are always buys first
  if (!robot.looping) {
    return
  }

  try {


    // get top 1 of whichever side
    if (checkingBuys) {
      // get highest priced buy
      [dbOrder] = await databaseClient.getUnsettledTrades('highBuy');
    } else {
      // get lowest priced sell
      [dbOrder] = await databaseClient.getUnsettledTrades('lowSell');
      // console.log('lowSell', trade);
    }
    console.log('highBuy or lowSell', dbOrder.id);
    // check order against coinbase
    let cbOrder = await authedClient.getOrder(dbOrder.id);

    console.log('order from coinbase either high buy or low sell', cbOrder.settled);
    console.log('order from database either high buy or low sell', dbOrder.settled);

    // flip trade and update if needed...
    if (cbOrder.settled) {
      // flip sides on trade
      const tradeDetails = flipTrade(dbOrder);
      console.log(tradeDetails);
      // send new order
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
      // else flip side toggle
      checkingBuys = !checkingBuys;
    }


    robot.canToggle = true;

  } catch (error) {
    if (error.message) {
      console.log('error message from exchange', error.message);
    }
    if ((error.data !== undefined) && (error.data.message !== undefined)) {
      console.log('error message, end of loop:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      // error handling should delete them so they are not counted toward profits if simply marked settled
      if (error.data.message === 'NotFound') {
        console.log('order not found in account. deleting from db', dbOrder);
        const queryText = `DELETE from "orders" WHERE "id"=$1;`;
        await pool.query(queryText, [dbOrder.id])
          .then(() => {
            console.log('exchange was tossed lmao');
            socketClient.emit('update', {
              message: `exchange was tossed out of the ol' databanks`,
              orderUpdate: true
            });
          })
      }
    } else {
      console.log('yousa got a biiiig big problems', error);
      socket.emit('message', { message: 'big doo doo' });
    }
  } finally {
    if (robot.looping) {
      // call the loop again
      console.log('start the loop again!');
      await sleep(100);
      theLoop()
    } else {
      socketClient.emit('update', { loopStatus: 'no more loops :(' });
    }
  }

  // console.log('starting the loop');
  // robot.loop++;
  // socketClient.emit('update', { loopStatus: `${robot.loop} loop${robot.loop === 1 ? '' : 's'}, brother` });
  // await sleep(1000)
  //   .then(() => {
  //     return Promise.all([
  //       // get all open orders from db and from coinbase
  //       databaseClient.getUnsettledTrades('all'),
  //       authedClient.getOrders({ status: 'open' })
  //     ])
  //       .then((results) => {
  //         // Promise. all returns an array with an object for each function in the order they were called
  //         const dbOrders = results[0], cbOrders = results[1];
  //         // subtract coinbase orders from database orders, returning an array of orders that have settled in coinbase since the last loop
  //         return orderSubtractor(dbOrders, cbOrders);
  //       })
  //       .then((ordersToCheck) => {
  //         // send the newly settled orders to the exchange where they will be double checked and flipped
  //         // brother may I have some loops
  //         for (const dbOrder of ordersToCheck) {
  //           currentCheck = dbOrder;
  //           return exchange(dbOrder);
  //         };
  //       })
  //       .catch(error => {
  //         if (error.message) {
  //           console.log('error message from exchange', error.message);
  //         }
  //         if ((error.data !== undefined) && (error.data.message !== undefined)) {
  //           console.log('error message, end of loop:', error.data.message);
  //           // orders that have been canceled are deleted from coinbase and return a 404.
  //           // error handling should delete them so they are not counted toward profits if simply marked settled
  //           if (error.data.message === 'NotFound') {
  //             console.log('order not found in account. deleting from db', currentCheck);
  //             const queryText = `DELETE from "orders" WHERE "id"=$1;`;
  //             return pool.query(queryText, [currentCheck.id])
  //               .then(() => {
  //                 console.log('exchange was tossed lmao');
  //                 socketClient.emit('update', {
  //                   message: `exchange was tossed out of the ol' databanks`,
  //                   orderUpdate: true
  //                 });
  //               })
  //           }
  //         } else {
  //           console.log('yousa got a biiiig big problems', error);
  //           socket.emit('message', { message: 'big doo doo' });
  //         }
  //       })
  //       .finally(() => {
  //         // after all is done, the loop will call itself.
  //         //  always check if coinbot should be running before initiating lööps
  //         if (robot.looping) {
  //           console.log('start the loop again!');
  //           theLoop()
  //         } else {
  //           socketClient.emit('update', { loopStatus: 'no more loops :(' });
  //         }
  // // lastly, set canToggle to true so the bot can be turned back on if it has been 
  // // turned off since the start of the loop
  // robot.canToggle = true;
  //       })
  //   })
}


module.exports = theLoop;