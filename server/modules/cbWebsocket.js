const CoinbasePro = require('coinbase-pro');
const pool = require('./pool');
const authedClient = require('./authedClient');
const socketClient = require('./socketClient');
const robot = require('./robot');
const databaseClient = require('./databaseClient');

const cbWebsocket = new CoinbasePro.WebsocketClient(
  ['BTC-USD'],
  // todo - change url to not sandbox once well tested
  process.env.WS_URL || 'wss://ws-feed-public.sandbox.pro.coinbase.com',
  {
    key: process.env.SANDBOXKEY,
    secret: process.env.SANDBOXSECRET,
    passphrase: process.env.SANDBOXPASSWORD,
    auto_reconnect: true,
  },
  { channels: ['user'] }
);

const handleUpdate = (data) => {
  // console.log('heartbeat data', data);
  // if (data.type != 'heartbeat') {
  //   console.log('this is not heartbeat data', data);
  // }
  if (data.profile_id && data.type === 'done') {
    (data.reason === 'filled')
      ? handleFilled(data)
      : (data.reason === 'canceled')
        ? handleCanceled(data)
        : console.log('reason from Coinbase websocket feed:', data.reason);
  }
}

const handleCanceled = async (canceledOrder) => {
  // console.log('this was canceled:', canceledOrder);
  console.log('order canceled', canceledOrder);
}

const handleFilled = async (cbOrder) => {
  robot.wsTrading++;
  // robot.busy shows how many connections have been made to cb. 
  // stay under 15/s or rate limiting will start returning errors
  if (robot.busy <= 15) {
    // add one to busy. This allows pile up of ws handlers. Earlier handlers will not set busy 
    // to false while later handlers are still busy.
    // busy will just go down to 0 when not busy
    try {
    robot.busy++;
    // console.log('should be  little more busy?', robot.busy);
    // console.log('just filleda:', cbOrder);
      // get settled trade from db
      const dbOrderRows = await databaseClient.getSingleTrade(cbOrder.order_id);
      if (dbOrderRows[0] && dbOrderRows[0].id) {
        const dbOrder = dbOrderRows[0];
        // console.log('database order returns:', dbOrder);
        // console.log('there is an order');
        // flip the trade
        const tradeDetails = robot.flipTrade(dbOrder)
        // console.log('trade details:', tradeDetails);

        // send the new trade
        let pendingTrade = await authedClient.placeOrder(tradeDetails);
        console.log('order placed by ws at price:', tradeDetails.price);
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

      } else {
        // when an order is first placed, it takes time to store in db and may return nothing
        // if that is the case, call this function again
        // console.log('no order yet');
        await robot.sleep(100)
        handleFilled(cbOrder);
      }
    } catch (error) {
      if (error.response && error.response.statusCode && error.response.statusCode === 429) {
        console.log('status code in cbWebsocket', error.response.statusCode);
        console.log('error data with cb websocket', error.data);
        console.log('robot busy:', robot.busy);
        await robot.sleep(10)
        handleFilled(cbOrder);
      }
      if (error.statusMessage) {
        console.log('error message with cb websocket', error.statusMessage);
      }
    } finally {

      // tell that the robot is no longer trading
      robot.wsTrading--;
      console.log('-----is ws still trading?', robot.wsTrading);
      // wait for one second so rate limit stays under 15/s
      // then subtract one from busy to clear up the connection
      await robot.sleep(1000);
      robot.busy--;
      // console.log('busy?', robot.busy);
    }
    // else triggers if there are too many connections to cb.
    // wait a short time then trigger the function again.
  } else {
    await robot.sleep(100)
    handleFilled(cbOrder);
    robot.wsTrading--;
    console.log('-----is ws still trading?', robot.wsTrading);
  }
}

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate
};