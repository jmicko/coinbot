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
    return;
  }
  // if the robot is busy, call theLoop again and return out of function so no trades are made while another 
  // function is in the db
  if (robot.busy > 0) {
    // need to wait a bit or call stack size will be exceeded
    // console.log('oh wait no, it is busy');
    await sleep(100)
    theLoop();
    return;
  } else {
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
      }
      // if there is an order, check order against coinbase
      if (dbOrder) {
        await sleep(100);
        cbOrder = await authedClient.getOrder(dbOrder.id);
      }
      if (cbOrder && cbOrder.settled) {
        // flip trade and update if needed...
        // console.log('how busy?', robot.busy);
        const tradeDetails = flipTrade(dbOrder);
        // send new order
        await sleep(100);
        // in order to make sure it doesn't trade after ws starts handling the trade, check busy status
        // right before sending trade
        if (robot.busy > 0) {
          // need to wait a bit or call stack size will be exceeded
          // console.log('wow, it sure is busy');
          await sleep(100)
          // this returns out of the try. theLoop is called in the finally, 
          // so do not call it here or there will be double orders
          // actually it might be returning out of the if? Idk what is heckin goin on here lmao
          return;
        } else {

          let pendingTrade = await authedClient.placeOrder(tradeDetails);
          console.log('!!!!!!!!! order placed by the loop at price:', Number(tradeDetails.price));
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
        }
      } else {
        // ...else flip side toggle
        checkingBuys = !checkingBuys;
      }
    } catch (error) {
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!');
      if (error.code && error.code === 'ETIMEDOUT') {
        socketClient.emit('update', {
          message: `Connection timed out`,
          orderUpdate: false
        });
      }
      else if (error.data && error.data.message) {

        /* turns out coinbase may randomly return a 404 on an order that has not actually been canceled.
        this is a problem. Disabling this auto detect feature for now. 
        implement websocket instead to listen for cancel messages. Maybe can double check here if order is really cancelled,
        but if Coinbase reports cancelled once for an unknown reason, why not twice? */


        // orders that have been canceled are deleted from coinbase and return a 404.
        // error handling should delete them so they are not counted toward profits if simply marked settled
        if (error.data.message === 'NotFound') {
          console.log('order not found in account. maybe need to delete from db', dbOrder);
          // const queryText = `DELETE from "orders" WHERE "id"=$1;`;
          // await pool.query(queryText, [dbOrder.id]);
          // // .then(() => {
          // console.log('exchange was tossed lmao');
          // socketClient.emit('update', {
          //   message: `exchange was tossed out of the ol' databanks`,
          //   orderUpdate: true
          // });
          // })
        } else {
          console.log('error message, end of loop:', error.data.message);
        }
      } else {
        console.log('yousa got a biiiig big problems in the loop', error);
        socketClient.emit('message', { message: 'big doo doo' });
      }
    } finally {
      if (robot.looping) {
        // call the loop again
        theLoop()
      } else {
        socketClient.emit('update', { loopStatus: 'no more loops :(' });
      }
      robot.canToggle = true;
    }
  }
}

module.exports = theLoop;