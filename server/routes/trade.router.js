const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const theLoop = require('../modules/theLoop');
const databaseClient = require('../modules/databaseClient/databaseClient');


// todo - POST route for auto trading
router.post('/toggle', (req, res) => {
  // When this route is hit, it turns on and off the trading loop
  theLoop.toggleCoinbot();
  res.sendStatus(200);
})


/**
 * POST route sending trade
 */
router.post('/order', (req, res) => {
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
  // after trade is placed, store the returned pending trade values in the database
    .then(pendingTrade => databaseClient.storeTrade(pendingTrade))
    .then(results => {
      console.log(`order sent to db, got this back:`, results.message);
      if (results.success) {
        res.sendStatus(200)
      } else {
        res.sendStatus(500)
      }
    })
    // .then(result => {console.log('just got back from storing this in db:', result)})
    .catch((error) => {
      console.log('new order process failed', error);
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
