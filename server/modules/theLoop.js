const pool = require('./pool');
const authedClient = require('./authedClient');
const databaseClient = require('./databaseClient');
const socketClient = require('./socketClient');
const robot = require('./robot');

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
  if (robot.busy <= 5) {
    let connections = 0;
    try {
      robot.loop++;
      socketClient.emit('update', { loopStatus: `${robot.loop} loop${robot.loop === 1 ? '' : 's'}, brother` });
      // get top 1 of whichever side
      if (checkingBuys) {
        [dbOrder] = await databaseClient.getUnsettledTrades('highBuy');
      } else {
        [dbOrder] = await databaseClient.getUnsettledTrades('lowSell');
      }
      // if there is an order, check order against coinbase
      if (dbOrder) {
        // console.log('getting order from cb:', dbOrder);
        await robot.sleep(300);
        robot.busy++;
        connections++;
        cbOrder = await authedClient.getOrder(dbOrder.id);
        // console.log('got order from cb:', cbOrder);
      }
      // if it is settled, it need to be flipped and traded
      if (cbOrder && cbOrder.settled) {
        console.log('the loop is sending this trade to the queue', cbOrder);
        // send it to the tradeQueue
        await robot.addToTradeQueue(dbOrder);
      } else {
        console.log('no trade, switching sides');
        // ...else flip side toggle
        checkingBuys = !checkingBuys;
      }
      // error handling
    } catch (error) {
      if (error.code && error.code === 'ETIMEDOUT') {
        socketClient.emit('update', {
          message: `Connection timed out`,
          connection: 'timeout',
          orderUpdate: false
        });
        console.log('timed out');
      } else if (error.data && error.data.message) {
        // orders that have been canceled (or very recently changed) are deleted from coinbase and return a 404.
        // error handling should delete them so they are not counted toward profits if simply marked settled
        if (error.data.message === 'NotFound') {
          console.log('order not found in account. maybe need to delete from db', dbOrder);
          // robot.deleteTrade(dbOrder.id);
        }
      } else {
        console.log('yousa got a biiiig big problems in the loop', error);
        socketClient.emit('message', { message: 'big doo doo' });
      }


      // restart the loop
    } finally {
      setTimeout(() => {
        robot.busy -= connections;
        if (robot.looping) {
          // call the loop again
          setTimeout(() => {
            theLoop();
          }, 100);
        } else {
          socketClient.emit('update', { loopStatus: 'no more loops :(' });
        }
        robot.canToggle = true;
      }, 1000);
    }
  } else {
    // call the loop again
    setTimeout(() => {
      theLoop();
    }, 100);
  }
}

module.exports = theLoop;