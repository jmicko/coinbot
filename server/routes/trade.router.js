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


// function to get open orders
// authedClient.getOrders({ after: 3000, status: 'open' }, callback);

// todo - function and boolean variable to turn auto trading on and off
let trading = false;

// toggle auto trading on and off
function toggleTrade(status, trade){
    // toogle trading boolean
    trading = !trading;
    // if trading is true, triggers the trading function.
    if (trading) {
        
    }
}

// trading function
// for now, trading function should just watch one value for testing sake,
// but eventually will be triggered for each value that is watched.
function watcher(){
    console.log('watcher function is running');
}


// todo - POST route for auto trading


/**
 * POST route test buy trade
 */
 router.post('/buybtc', (req, res) => {
    // POST route code here
    console.log('in the server trade POST route');
  
    // Buy 0.001 BTC @ 30,000 USD
    const params = {
      side: 'buy',
      price: '30000.00', // USD
      size: '0.001', // BTC
      product_id: 'BTC-USD',
    };
    authedClient.placeOrder(params)
    .then(data => {
        console.log('order was sent successfully');
        console.log(data);
    })
    .catch((error) => {
        console.log('oder failed', error);
        res.sendStatus(500)
    });
  
  });




module.exports = router;
