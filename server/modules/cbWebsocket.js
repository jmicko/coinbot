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
  console.log('busy? should be false:', robot.busy);
  robot.busy = true;
  console.log('busy? should be true:', robot.busy);
  console.log('just filled:', order);
  console.log('waiting 2 sec');
  await sleep(2000);
  console.log('done waiting');
  robot.busy = false;
  console.log('busy? should be false:', robot.busy);
}

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate
};