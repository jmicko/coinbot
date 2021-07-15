const express = require('express');
const pool = require('../modules/pool');
const CoinbasePro = require('coinbase-pro');
const toggleTrade = require('../modules/toggleTradeLoop');

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

// todo - POST route for auto trading
router.post('/toggle', (req, res) => {
  // When this route is hit, it turns on and off the trading loop
  toggleTrade();
  res.sendStatus(200);
})


/**
 * POST route sending trade
 */
router.post('/order', (req, res) => {
  // POST route code here
  const order = req.body;
  // params const should take in values sent from trade component form
  const params = {
    side: 'buy',
    price: order.price, // USD
    size: order.size, // BTC
    product_id: 'BTC-USD',
  };
  // function to send the order with the CB API to CB and place the trade
  authedClient.placeOrder(params)
    .then(data => {
      // add new order to the database
      console.log('order was sent successfully');
      console.log(data);
      const newOrder = data;
      const sqlText = `INSERT INTO "orders" 
                      ("id", "price", "size", "side", "settled") 
                      VALUES ($1, $2, $3, $4, $5);`;
      pool.query(sqlText, [newOrder.id, newOrder.price, newOrder.size, newOrder.side, newOrder.settled])
          .then(res.sendStatus(200))
          .catch((error) => {
            console.log('SQL failed', error);
            res.sendStatus(500)
          });
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
