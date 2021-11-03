const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot');
const { cbWebsocketConnection } = require('../modules/robot');


/**
 * POST route sending trade
 */
router.post('/', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const order = req.body;
  // tradeDetails const should take in values sent from trade component form
  const tradeDetails = {
    original_sell_price: order.original_sell_price,
    original_buy_price: order.price,
    side: order.side,
    price: order.price, // USD
    size: order.size, // BTC
    product_id: order.product_id,
    stp: 'cn',
  };
  try {
    // send the new order with the trade details
    let pendingTrade = await authedClient.placeOrder(tradeDetails);
    // store the new trade in the db. the trade details are also sent to store trade position prices
    let results = await databaseClient.storeTrade(pendingTrade, tradeDetails);
    // send OK status
    res.sendStatus(200);
  } catch (err) {
    if (err.response.statusCode === 400) {
      console.log('Insufficient funds!');
    } else if (err.code && err.code === 'ETIMEDOUT') {
      console.log('Timed out!!!!!');
      await authedClient.cancelAllOrders();
      console.log('synched orders just in case');
    } else {
      console.log('problem in sending trade post route', err);
    }
    // send internal error status
    res.sendStatus(500);
  }
});


/**
* DELETE route
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  // DELETE route code here
  const orderId = req.body.id;
  console.log('in the server trade DELETE route', req.body.id)

  // mark as canceled in db
  const queryText = `UPDATE "orders" SET "will_cancel" = true WHERE "id"=$1;`;
  let result = await pool.query(queryText, [orderId]);
  // send cancelOrder to cb
  try {
    let result = await authedClient.cancelOrder(orderId)
    console.log('order was deleted successfully from cb', result);
  } catch (error) {
    if (error.data?.message) {
      console.log('error message, trade router DELETE:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      // error handling should delete them from db and not worry about coinbase since there is no other way to delete
      // but also send one last delete message to Coinbase just in case it finds it again, but with no error checking
      if (error.data.message === 'order not found') {
        console.log('order not found in account', orderId);
      }
    } else {
      console.log('something failed', error);
      res.sendStatus(500)
    }
  };
});



module.exports = router;
