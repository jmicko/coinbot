const authedClient = require("./authedClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const { sleep } = require("./robot");
const robot = require("./robot");
const socketClient = require("./socketClient");


const trader = async () => {
  // count up how many connections have been made by this instance of the trader. Not all parts of the trader
  // will for sure be hit, so in the finally, this variable can be used to remove the total after the needed time
  let connections = 0;
  console.log('trader is trading');
  try {
    // check if there are any api tokens left
    console.log(robot.busy, 'tokens used');
    if (robot.busy <= 15) {
      // check if the robot.tradeQueue has any orders in it
      if (robot.tradeQueue.length > 0) {
        console.log('there are trades to trade', robot.tradeQueue.length);
        // if it does, take the first one and see if it is new
        if (robot.tradeQueue[0].isNew) {
          console.log('the trade is new!', robot.tradeQueue[0]);
          // if new, send it straight to exchange
          // todo - send to exchange
          // for now, new trades will be sent as normal from the trade router and we will just unshift them here
          robot.tradeQueue.shift();
        } else {
          // if not new, it was just settled. It needs to be flipped and then sent to exchange
          console.log('the trade is not new!', robot.tradeQueue[0]);
          const dbOrder = robot.tradeQueue[0];
          // we are about to make a connection, so increase busy and connections by 1
          robot.busy++;
          connections++;          
          // get the updated info from cb for settlement values
          const cbOrder = await authedClient.getOrder(dbOrder.id);
          console.log('cbOrder in trader is:', cbOrder);
          // flip the trade
          const tradeDetails = robot.flipTrade(dbOrder);
          // we are about to make a connection, so increase busy and connections by 1
          robot.busy++;
          connections++;
          const pendingTrade = await authedClient.placeOrder(tradeDetails);
          console.log('order placed by robot trader at price:', tradeDetails.price);
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
          // tell the frontend that an update was made so the DOM can update
          socketClient.emit('update', {
            message: `an exchange was made`,
            orderUpdate: true
          });
          // remove the first trade from the tradeQueue. Trades are always added to the end of the array,
          // so the first one will always be the one we just worked with
          robot.tradeQueue.shift();
        }
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    // when everything is done, take tally of api connections, and set them to expire after one second
    setTimeout(() => {
      console.log('total connections used by this trader:', connections, 'connections used:', robot.busy);
      robot.busy -= connections;
      console.log('connections used after clearing this trader:', robot.busy);
    }, 1000);
    // call trader function again when done
    // await sleep(200);
    setTimeout(() => {
      trader();
    }, 2000);
  }

}

module.exports = trader;