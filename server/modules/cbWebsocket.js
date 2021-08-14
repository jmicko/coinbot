const CoinbasePro = require('coinbase-pro');
const robot = require('./robot/robot');
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

const handleFilled = async (order) => {
  console.log('busy?', robot.busy);
  // add one to busy. This allows pile up of ws handlers. Earlier handlers will not set busy 
  // to false while later handlers are still busy.
  // busy will just go down to 0 when not busy
  robot.busy++;
  console.log('busy?', robot.busy);
  console.log('just filled:', order);

  // get settled trade from db

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