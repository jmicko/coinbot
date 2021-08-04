const CoinbasePro = require('coinbase-pro');

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
    console.log(data);
  }
}

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate
};