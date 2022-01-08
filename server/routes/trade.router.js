const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot');
const coinbaseClient = require('../modules/coinbaseClient');


/**
 * POST route sending trade
 */
router.post('/', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const user = req.user;
  if (user.active && user.approved) {
    const userID = req.user.id;
    console.log('user is', userID);
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
      userID: userID,
      trade_pair_ratio: order.trade_pair_ratio
    };
    if (order.type) {
      tradeDetails.type = 'market';
      delete tradeDetails.price;
    }
    try {
      // send the new order with the trade details
      let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
      console.log('pending trade', pendingTrade);
      // wait a second before storing the trade. Sometimes it takes a second for coinbase to register the trade,
      // even after returning the details. robot.syncOrders will think it settled if it sees it in the db first
      await robot.sleep(100);
      // store the new trade in the db. the trade details are also sent to store trade position prices
      await databaseClient.storeTrade(pendingTrade, tradeDetails);

      // send OK status
      res.sendStatus(200);

      // check if order went through
      await robot.sleep(1000);
      let success = await coinbaseClient.repeatedCheck(pendingTrade, userID, 0);
      console.log('did the order go through?', success);
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('Insufficient funds!');
        socketClient.emit('message', {
          error: `Insufficient funds!`,
          orderUpdate: true
        });
      } else if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out!!!!! Synching orders just in case');
        socketClient.emit('message', {
          error: `Connection timed out, consider synching all orders to prevent duplicates. This will not be done for you.`,
          orderUpdate: true
        });
      } else {
        console.log('problem in sending trade post route', err);
      }
      // send internal error status
      res.sendStatus(500);
    }
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});

/**
 * POST route for auto setup
 */
router.post('/autoSetup', rejectUnauthenticated, async (req, res) => {
  console.log('in auto setup route!');
  // POST route code here
  const user = req.user;
  if (user.active && user.approved) {
    robot.autoSetup(user, req.body)
  //   const userID = req.user.id;
  //   console.log('user is', userID);
  //   const order = req.body;
  //   // tradeDetails const should take in values sent from trade component form
  //   const tradeDetails = {
  //     original_sell_price: order.original_sell_price,
  //     original_buy_price: order.price,
  //     side: order.side,
  //     price: order.price, // USD
  //     size: order.size, // BTC
  //     product_id: order.product_id,
  //     stp: 'cn',
  //     userID: userID,
  //     trade_pair_ratio: order.trade_pair_ratio
  //   };
  //   if (order.type) {
  //     tradeDetails.type = 'market';
  //     delete tradeDetails.price;
  //   }
  //   try {
  //     // send the new order with the trade details
  //     let pendingTrade = await coinbaseClient.placeOrder(tradeDetails);
  //     console.log('pending trade', pendingTrade);
  //     // wait a second before storing the trade. Sometimes it takes a second for coinbase to register the trade,
  //     // even after returning the details. robot.syncOrders will think it settled if it sees it in the db first
  //     await robot.sleep(100);
  //     // store the new trade in the db. the trade details are also sent to store trade position prices
  //     await databaseClient.storeTrade(pendingTrade, tradeDetails);

      // send OK status
      res.sendStatus(200);

      // check if order went through
  //     await robot.sleep(1000);
  //     let success = await coinbaseClient.repeatedCheck(pendingTrade, userID, 0);
  //     console.log('did the order go through?', success);
  //   } catch (err) {
  //     if (err.response?.status === 400) {
  //       console.log('Insufficient funds!');
  //       socketClient.emit('message', {
  //         error: `Insufficient funds!`,
  //         orderUpdate: true
  //       });
  //     } else if (err.code && err.code === 'ETIMEDOUT') {
  //       console.log('Timed out!!!!! Synching orders just in case');
  //       socketClient.emit('message', {
  //         error: `Connection timed out, consider synching all orders to prevent duplicates. This will not be done for you.`,
  //         orderUpdate: true
  //       });
  //     } else {
  //       console.log('problem in sending trade post route', err);
  //     }
  //     // send internal error status
  //     res.sendStatus(500);
  //   }
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});


/**
* DELETE route
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  // DELETE route code here
  const userID = req.user.id;
  const orderId = req.body.id;
  console.log('in the server trade DELETE route', req.body.id)

  // mark as canceled in db
  try {
    const queryText = `UPDATE "orders" SET "will_cancel" = true WHERE "id"=$1;`;
    let result = await pool.query(queryText, [orderId]);
    // send cancelOrder to cb
    // let result = await coinbaseClient.cancelOrder(orderId, userID);
    // console.log('order was deleted successfully from cb', result);
    // databaseClient.deleteTrade(orderId);
    console.log('order was marked for deletion in database');
    res.sendStatus(200)
  } catch (error) {
    if (error.data?.message) {
      console.log('error message, trade router DELETE:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      // error handling should delete them from db and not worry about coinbase since there is no other way to delete
      // but also send one last delete message to Coinbase just in case it finds it again, but with no error checking
      if (error.data.message === 'order not found') {
        socketClient.emit('message', {
          error: `Order was not found when delete was requested`,
          orderUpdate: true
        });
        console.log('order not found in account', orderId);
        res.sendStatus(400)
      }
    }
    if (error.response?.status === 404) {
      databaseClient.deleteTrade(orderId);
      socketClient.emit('message', {
        error: `Order was not found when delete was requested`,
        orderUpdate: true
      });
      console.log('order not found in account', orderId);
      res.sendStatus(400)
    } else {
      console.log('something failed in the delete trade route', error);
      res.sendStatus(500)
    }
  };
});



module.exports = router;
