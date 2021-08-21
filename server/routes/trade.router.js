const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const toggleCoinbot = require('../modules/toggleCoinbot');
const robot = require('../modules/robot');


// POST route for turning bot on and off
router.post('/toggle', rejectUnauthenticated, (req, res) => {
  // When this route is hit, it turns on and off the trading loop
  console.log('toggle route');
  toggleCoinbot();
  res.sendStatus(200);
})


/**
 * POST route sending trade
 */
router.post('/', rejectUnauthenticated, (req, res) => {
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
  // add to busy so no rejections from rate limiting
  robot.busy++;
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
      if (error.data !== null && error.data.message !== undefined && error.data.message === 'Insufficient funds') {
        console.log('no money');
        res.sendStatus(400);
        console.log('new order process failed', error.data.message);
      } else {
        console.log('new order process failed', error);
        res.sendStatus(500)
      }
    })
    .finally(() => {
      setTimeout(() => {
        robot.busy--;
      }, 1000);
    })
});

/**
* DELETE route
*/
router.delete('/', rejectUnauthenticated, (req, res) => {
  // DELETE route code here
  const orderId = req.body.id;
  console.log('in the server trade DELETE route', req.body.id)
  authedClient.cancelOrder(orderId)
    .then(data => {
      console.log('order was deleted successfully from cb', data);
      const queryText = `DELETE from "orders" WHERE "id"=$1;`;
      pool.query(queryText, [data])
        .then(() => {
          socketClient.emit('update', {
            message: `order was tossed out of ol' databanks`,
            orderUpdate: true
          });
          console.log('deleted from db as well');
          res.sendStatus(200);
        })
    })
    .catch((error) => {

      if (error.data && error.data.message) {
        console.log('error message, trade router DELETE:', error.data.message);
        // orders that have been canceled are deleted from coinbase and return a 404.
        // error handling should delete them from db and not worry about coinbase since there is no other way to delete
        // but also send one last delete message to Coinbase just in case it finds it again, but with no error checking
        if (error.data.message === 'order not found') {
          console.log('order not found in account. deleting from db', orderId);
          const queryText = `DELETE from "orders" WHERE "id"=$1;`;
          pool.query(queryText, [orderId])
            .then(() => {
              console.log('exchange was tossed lmao');
              socketClient.emit('update', {
                message: `exchange was tossed out of the ol' databanks`,
                orderUpdate: true
              });
              res.sendStatus(200)
            })
            .catch((error) => {
              console.log('error in trade.router.js delete route', error);
              res.sendStatus(500)
            })
        }
      } else {
        console.log('something failed', error);
        res.sendStatus(500)
      }

    });
});



module.exports = router;
