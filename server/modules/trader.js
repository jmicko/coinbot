const authedClient = require("./authedClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const { sleep } = require("./robot");
const robot = require("./robot");


const trader = async () => {
  console.log('trader is trading');
  try {
    // check if there are any api tokens left
    if (robot.busy <= 15) {

      // check if the robot.tradeQueue has any orders in it
      if (robot.tradeQueue.length > 0) {
        console.log('there are trades to trade', robot.tradeQueue.length);
        // if it does, take the first one and see if it is new
        if (robot.tradeQueue[0].isNew) {

          console.log('the trade is new!', robot.tradeQueue[0]);
          // todo - for now, new trades will be sent as normal and we will just unshift them here
          robot.tradeQueue.shift();
          // if new, send it straight to exchange
        } else {
          // if not new, it was just settled. It needs to be flipped and then sent to exchange
          console.log('the trade is not new!', robot.tradeQueue[0]);
          const dbOrder = robot.tradeQueue[0];
          // flip the trade
          const tradeDetails = flipTrade(dbOrder);
          const pendingTrade = await authedClient.placeOrder(tradeDetails);
          console.log('order placed by robot trader at price:', tradeDetails.price);
          // store new order in db
          await databaseClient.storeTrade(pendingTrade, dbOrder);
          // update old order in db
          // unfortunately ws does not return some wanted data so we will need to manually get it if we want to see profits etc
          const queryText = `UPDATE "orders" SET "settled" = NOT "settled", "done_at" = $1 WHERE "id"=$2;`;
          await pool.query(queryText, [
            cbOrder.time,
            // cbOrder.fill_fees, // none
            // cbOrder.filled_size, // none
            // cbOrder.executed_value, // not really
            cbOrder.order_id
          ]);
          socketClient.emit('update', {
            message: `an exchange was made`,
            orderUpdate: true
          });
          robot.tradeQueue.shift();
        }
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    // call trader function again when done
    await sleep(1000);
    trader();
  }

}

module.exports = trader;