const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot/robot')


// todo - POST route for auto trading
router.post('/toggle', (req, res) => {
  // When this route is hit, it turns on and off the trading loop
  robot.toggleCoinbot();
  res.sendStatus(200);
})


/**
 * POST route sending trade
 */
router.post('/', (req, res) => {
  // POST route code here
  const order = req.body;
  // tradeDetails const should take in values sent from trade component form
  const tradeDetails = {
    // original_sell_price: order.original_sell_price,
    // original_buy_price: order.price,
    side: order.side,
    price: order.price, // USD
    size: order.size, // BTC
    product_id: order.product_id,
  };
  console.log(tradeDetails);
  // function to send the order with the CB API to CB and place the trade
  authedClient.placeOrder(tradeDetails)
    // after trade is placed, store the returned pending trade values in the database
    .then(pendingTrade => databaseClient.storeTrade(pendingTrade, order))
    .then(results => {
      console.log(`order placed, given to db with reply:`, results.message);
      if (results.success) {
        res.sendStatus(200)
      } else {
        res.sendStatus(500)
      }
    })
    // .then(result => {console.log('just got back from storing this in db:', result)})
    .catch((error) => {
      if (error.data !== undefined && error.data.message !== undefined && error.data.message === 'Insufficient funds') {
        console.log('no money');
        res.sendStatus(400);
        console.log('new order process failed', error.data.message);
      } else {
        console.log('new order process failed', error);
        res.sendStatus(500)
      }
    });
});

/**
* DELETE route
*/
router.delete('/', (req, res) => {
  // DELETE route code here
  const orderId = req.body.id;
  console.log('in the server trade DELETE route', req.body.id)
  authedClient.cancelOrder(orderId)
    .then(data => {
      console.log('order was deleted successfully from cb', data);
      const queryText = `DELETE from "orders" WHERE "id"=$1;`;
      pool.query(queryText, [data])
      .then(() => {
        socketClient.emit('message', {
          message: `order was tossed out of ol' databanks`,
          orderUpdate: true
        });
        console.log('deleted from db as well');
        res.sendStatus(200);
      })
    })
    .catch((error) => {
      console.log('something failed', error);
      res.sendStatus(500)
    });
});




module.exports = router;
