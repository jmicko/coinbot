const authedClient = require("./authedClient");
const databaseClient = require("./databaseClient");
const pool = require("./pool");
const robot = require("./robot");
const socketClient = require("./socketClient");

const newTrade = async (tradeDetails, newOrder) => {
  if (robot.busy <= 14) {
    let connections = 0;
    try {
      // we are about to make a connection, so increase busy and connections by 1
      robot.busy++ && connections++;
      // send to cb
      let pendingTrade = await authedClient.placeOrder(tradeDetails);
      console.log('here is the pending trade from the trader', pendingTrade);
      // store the pending trade in the db
      let results = await databaseClient.storeTrade(pendingTrade, newOrder);
      console.log(`order placed, given to db with reply:`, results.message);
    } catch (err) {
      if (err?.code === 'ETIMEDOUT') {
        setTimeout(() => {
          newTrade(tradeDetails, newOrder);
        }, 100);
      } else {
        console.log(err);
      }
    } finally {
      setTimeout(() => {
        console.log('total connections used by this new trade trader:', connections, 'connections used:', robot.busy);
        robot.busy -= connections;
        console.log('connections used after clearing this trader:', robot.busy);
      }, 1000);
    }
  } else {
    setTimeout(() => {
      newTrade(tradeDetails, newOrder);
    }, 100);
  }
}

const settledTrade = async (dbOrder) => {
  if (robot.busy <= 13) {
    let connections = 0;
    try {

      // we are about to make a connection, so increase busy and connections by 1
      robot.busy++;
      connections++;
      // get the updated info from cb for settlement values
      const cbOrder = await authedClient.getOrder(dbOrder.id);
      // console.log('cbOrder in settledTrade is:', cbOrder);
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
      socketClient.emit('message', {
        message: `an exchange was made`,
        orderUpdate: true
      });
    } catch (err) {
      if (err.code && err.code === 'ETIMEDOUT') {
        setTimeout(() => {
          settledTrade(dbOrder);
        }, 100);
      } else {
        console.log('error from settledTrade in trader', err);
      }
    } finally {
      setTimeout(() => {
        console.log('total connections used by this settled trader:', connections, 'connections used:', robot.busy);
        robot.busy -= connections;
        console.log('connections used after clearing this trader:', robot.busy);
      }, 1000);
    }
  } else {
    setTimeout(() => {
      settledTrade(dbOrder);
    }, 100);
  }
}


const trader = async () => {
  // count up how many connections have been made by this instance of the trader. Not all parts of the trader
  // will for sure be hit, so in the finally, this variable can be used to remove the total after the needed time
  if (robot.busy < 15) {
    let connections = 0;
    // console.log('trader is trading');
    try {
      // check if there are any api tokens left
      // console.log(robot.busy, 'tokens used');
      // if (robot.busy <= 15) {
        // check if the robot.tradeQueue.current has any orders in it
        if (robot.tradeQueue.current.length > 0) {
          console.log('there are trades to trade', robot.tradeQueue.current.length);
          // if it does, take the first one and see if it is new
          if (robot.tradeQueue.current[0].isNew) {
            // console.log('the trade is new!', robot.tradeQueue.current[0]);
            const newOrder = robot.tradeQueue.current[0];
            const tradeDetails = {
              side: robot.tradeQueue.current[0].side,
              price: robot.tradeQueue.current[0].price, // USD
              size: robot.tradeQueue.current[0].size, // BTC
              product_id: robot.tradeQueue.current[0].product_id,
            };
            // delete tradeDetails.isNew;
            console.log('=======trader is sending these trade details:', tradeDetails);
            // if new, send it straight to exchange
            newTrade(tradeDetails, newOrder);
            // for now, new trades will be sent as normal from the trade router and we will just unshift them here
            await robot.tradeQueue.current.shift();
          } else {
            // if not new, it was just settled. It needs to be flipped and then sent to exchange
            // console.log('the trade is not new!', robot.tradeQueue.current[0]);
            const dbOrder = robot.tradeQueue.current[0];
            settledTrade(dbOrder);
            // remove the first trade from the tradeQueue.current. Trades are always added to the end of the array,
            // so the first one will always be the one we just worked with
            await robot.tradeQueue.current.shift();
          }
        }
      // }
    } catch (err) {
      if (err.data) {
        console.log(err.data);
      } else {
        console.log('trader error', err);
      }
    } finally {
      // when everything is done, take tally of api connections, and set them to expire after one second
      setTimeout(() => {
        // console.log('total connections used by this trader:', connections, 'connections used:', robot.busy);
        robot.busy -= connections;
        // console.log('connections used after clearing this trader:', robot.busy);
      }, 1000);
      // call trader function again when done
      // await sleep(200);
      setTimeout(() => {
        trader();
      }, 50);
    }

  } else {
    // call the trader again
    setTimeout(() => {
      trader();
    }, 100);
  }
}


module.exports = trader;