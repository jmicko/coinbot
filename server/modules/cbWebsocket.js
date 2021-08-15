const CoinbasePro = require('coinbase-pro');
const robot = require('./robot/robot');
const databaseClient = require('./databaseClient/databaseClient');
const sleep = require('./robot/sleep');

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
  console.log('busy?', robot.busy);
  // add one to busy. This allows pile up of ws handlers. Earlier handlers will not set busy 
  // to false while later handlers are still busy.
  // busy will just go down to 0 when not busy
  robot.busy++;
  console.log('busy?', robot.busy);
  // console.log('just filled:', cbOrder);

  // get settled trade from db
  const dbOrder = await databaseClient.getSingleTrade(cbOrder.order_id);
  console.log('database order returns:', dbOrder);
  if (dbOrder[0] && dbOrder[0].id) {
    console.log('there is an order');
  } else {
    // when an order is first placed, it takes time to store in db and may return nothing
    // if that is the case, call this function again
    console.log('no order yet');
    setTimeout(() => {
      handleFilled(cbOrder);
    }, 10);
  }
  // flip the settled trade

  // send new order to db


  console.log('waiting 2 sec');
  await sleep(2000);
  console.log('done waiting');
  // subtract one from busy
  robot.busy--;
  console.log('busy?', robot.busy);
}

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate
};