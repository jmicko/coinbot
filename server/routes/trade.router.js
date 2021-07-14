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
toggleTrade = () => {
    // toogle trading boolean
    trading = !trading;
    // if trading is true, triggers the trading function.
    if (trading) {
        tradeloop();
    }
}

tradeloop = () => {
  console.log('Do you even know how to code?');
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
 router.post('/order', (req, res) => {
    // POST route code here
    console.log('in the server trade POST route');
    console.log('body of request', req.body);
    console.log('body.size of request', req.body.size);
    console.log('params of request', req.params);
    const order = req.body;
  
    // params const should take in values sent from trade component form
    // Buy 0.001 BTC @ 30,000 USD
    const params = {
      side: 'buy',
      price: order.price, // USD
      size: order.size, // BTC
      product_id: 'BTC-USD',
    };
    // function to send the order with the CB API to CB and place the trade
    authedClient.placeOrder(params)
    .then(data => {
        console.log('order was sent successfully');
        console.log(data);
        res.sendStatus(200)
    })
    .catch((error) => {
        console.log('oder failed', error);
        res.sendStatus(500)
    });
  
  });

  /**
 * GET route
 */
 router.get('/order', (req, res) => {
    // GET route code here
    console.log('in the server trade GET route')
    .then(data => {
        console.log('order was sent successfully');
        console.log(data);
    })
    .catch((error) => {
        console.log('oder failed', error);
        res.sendStatus(500)
    });
  
  });

  /**
 * DELETE route
 */
 router.delete('/order', (req, res) => {
    // DELETE route code here
    console.log('in the server trade DELETE route')
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
