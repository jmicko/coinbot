const CoinbasePro = require('coinbase-pro');
const pool = require('./pool');
const authedClient = require('./authedClient');
const socketClient = require('./socketClient');
const robot = require('./robot/robot');
const databaseClient = require('./databaseClient/databaseClient');
const sleep = require('./robot/sleep');
const flipTrade = require('./robot/flipTrade');

const cbWebsocket = new CoinbasePro.WebsocketClient(
  ['BTC-USD'],
  'wss://ws-feed-public.sandbox.pro.coinbase.com',
  {
    key: process.env.SANDBOXKEY,
    secret: process.env.SANDBOXSECRET,
    passphrase: process.env.SANDBOXPASSWORD,
  },
  { channels: ['full', 'level2'] }
);

const handleUpdate = (data) => {
  // console.log(data);
  if (data.profile_id && data.type === 'done') {
    (data.reason === 'filled')
      ? handleFilled(data)
      : console.log('reason from Coinbase websocket feed:', data.reason);
  }
}

const handleFilled = async (cbOrder) => {
  // add one to busy. This allows pile up of ws handlers. Earlier handlers will not set busy 
  // to false while later handlers are still busy.
  // busy will just go down to 0 when not busy
  robot.busy++;
  console.log('busy?', robot.busy);
  console.log('just filled:', cbOrder);

  try {

    // get settled trade from db
    const dbOrderRows = await databaseClient.getSingleTrade(cbOrder.order_id);
    if (dbOrderRows[0] && dbOrderRows[0].id) {
      const dbOrder = dbOrderRows[0];
      console.log('database order returns:', dbOrder);
      console.log('there is an order');
      // flip the trade
      const tradeDetails = flipTrade(dbOrder)
      console.log('trade details:', tradeDetails);

      // send the new trade
      let pendingTrade = await authedClient.placeOrder(tradeDetails);
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
      console.log('no order yet');
      await sleep(10)
      handleFilled(cbOrder);
    }
  } catch (error) {
    // console.log(error);
    if (error.statusCode) {
      console.log('error code with cb websocket', error.statusCode);
    }
    if (error.statusMessage) {
      console.log('error message with cb websocket', error.statusMessage);
    }
  } finally {


    // console.log('waiting 2 sec');
    // await sleep(2000);
    console.log('done');
    // subtract one from busy
    robot.busy--;
    console.log('busy?', robot.busy);
  }
}

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate
};