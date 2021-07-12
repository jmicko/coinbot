const express = require('express');
const pool = require('../modules/pool');
const CoinbasePro = require('coinbase-pro');

const router = express.Router();
const endpoint = 'https://api-public.sandbox.pro.coinbase.com';
const publicClient = new CoinbasePro.PublicClient(endpoint);


const key = process.env.SANDBOXKEY;
const secret = process.env.SANDBOXSECRET;
const passphrase = process.env.SANDBOXPASSWORD;

const apiURI = 'https://api.pro.coinbase.com';
const sandboxURI = 'https://api-public.sandbox.pro.coinbase.com';

const authedClient = new CoinbasePro.AuthenticatedClient(
  key,
  secret,
  passphrase,
  // apiURI
  sandboxURI
);


/**
 * GET route template
 */
router.get('/', (req, res) => {
  // testing coinbase public api
  // console.log(
  //   publicClient.getProducts()
  // );

  // COINBASE API TESTING

  // // using callback
  // publicClient.getProducts((error, response, data) => {
  //   if (error) {
  //     // handle the error
  //     console.log(error);
  //   } else {
  //     // work with data
  //     console.log('using callback');
  //     console.log(data);
  //   }
  // });

  // using promises

  // // get all products
  // publicClient
  // .getProducts()
  // .then(data => {
  //   // work with data
  //   console.log('using promises');
  //   console.log(data);
  // })
  // .catch(error => {
  //   // handle the error
  //   console.log(error);
  // });

  // authedClient
  // .getProductTicker('BTC-USD')
  // .then(data => {
  //   // work with data
  //   console.log('GETTING TICKER ABOUT ETH-USD using promises');
  //   console.log(data);
  // })
  // .catch(error => {
  //   // handle the error
  //   console.log(error);
  // });

  authedClient
    .getAccounts()
    .then(data => {
      // work with data
      console.log('GETTING ACCOUNTS using promises');
      data.forEach(account => {
        console.log(account.currency, account.balance);
      })
      // console.log(data);
    })
    .catch(error => {
      // handle the error
      console.log(error);
    });

  // GET route code here
  console.log('in the server test GET route');
  const queryText = `
  SELECT * FROM "test";`;
  pool.query(queryText)
    .then((result) => {
      console.log('TESTING NEW DB');
      console.log(result.rows);
      const RESPONSE = {
        message: `hello from the backend server!`,
        db: result.rows
      }
      res.send(RESPONSE);
    })
    .catch((error) => {
      console.log('work request GET failed: ', error);
      res.sendStatus(500);
    });
});

/**
 * POST route template
 */
router.post('/', (req, res) => {
  // POST route code here
  console.log('in the server test POST route');
});

/**
 * POST route test buy trade
 */
router.post('/buybtc', (req, res) => {
  // POST route code here
  console.log('in the server test POST route');

  // // Buy 1 BTC @ 75 USD
  // const params = {
  //   side: 'buy',
  //   price: '30000.00', // USD
  //   size: '0.001', // BTC
  //   product_id: 'BTC-USD',
  // };
  // authedClient.placeOrder(params, callback);

});

module.exports = router;
