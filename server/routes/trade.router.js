const express = require('express');
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const toggleTrade = require('../modules/toggleTradeLoop');
const storeTransaction = require('../modules/storeTransaction');


const router = express.Router();


// todo - POST route for auto trading
router.post('/toggle', (req, res) => {
  // When this route is hit, it turns on and off the trading loop
  toggleTrade();
  res.sendStatus(200);
})


/**
 * POST route sending trade
 */
router.post('/order', (req, res, next) => {
  // POST route code here
  const order = req.body;
  // tradeDetails const should take in values sent from trade component form
  const tradeDetails = {
    side: 'buy',
    price: order.price, // USD
    size: order.size, // BTC
    product_id: 'BTC-USD',
  };
  // function to send the order with the CB API to CB and place the trade
  authedClient.placeOrder(tradeDetails)
    .then(pendingTrade => {
      // after trade is placed, store the returned pending trade values in the database
      req.pendingTrade = pendingTrade;
      // console.log('req.pendingTrade is', req.pendingTrade);
      storeTransaction(req, res, next)
    })
    .then(res.sendStatus(200))
    .catch((error) => {
      console.log('new order process failed', error);
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
      console.log('order was retrieved successfully');
      console.log(data);
    })
    .catch((error) => {
      console.log('something failed', error);
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
      console.log('order was deleted successfully');
      console.log(data);
    })
    .catch((error) => {
      console.log('something failed', error);
      res.sendStatus(500)
    });

});




module.exports = router;
