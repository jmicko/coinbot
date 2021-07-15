const CoinbasePro = require('coinbase-pro');
const key = process.env.SANDBOXKEY;
const secret = process.env.SANDBOXSECRET;
const passphrase = process.env.SANDBOXPASSWORD;

// const apiURI = 'https://api.pro.coinbase.com';
const sandboxURI = 'https://api-public.sandbox.pro.coinbase.com';

const authedClient = new CoinbasePro.AuthenticatedClient(
    key,
    secret,
    passphrase,
    // apiURI
    sandboxURI
  );

// boolean variable to turn auto trading on and off
let trading = false;
let count = 0;
// toggle auto trading on and off
function toggleTrade() {
  console.log('in toggleTrade function');
  // toggle trading boolean
  trading = !trading;
  // if the bot should now be trading, it starts the trade loop
  if (trading) {
    tradeLoop();
  }
}

function tradeLoop() {
    if (trading) {
      // send request to coinbase API to get status of a trade
      authedClient.getOrder('f261bf17-5580-4949-8d80-fce2dd8d87b7')
        .then(data => {
          console.log('these are the orders', data, count);
          count++;
        })
        .catch(error => {
          console.log('there was an error fetching the orders', error)
        })
      // if the bot should still be trading, it waits 1 second and then calls itself again
      // by checking trading at the beginning of the function, and calling itself at the end,
      // the code won't run if the toggle is turned off in the middle, but it will still finish a cycle
      setTimeout(() => {
        tradeLoop();
      }, 100);
    }
  }

module.exports = toggleTrade;