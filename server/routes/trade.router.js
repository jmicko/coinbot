const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot');
const coinbaseClient = require('../modules/coinbaseClient');
const cache = require('../modules/cache');


/**
 * POST route sending trade
 */
router.post('/', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const user = req.user;
  const userID = req.user.id;
  const order = req.body;
  if (user.active && user.approved) {
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
      // wait a second before storing the trade. Sometimes it takes a second for coinbase to register the trade,
      // even after returning the details. robot.syncOrders will think it settled if it sees it in the db first
      await robot.sleep(100);
      // store the new trade in the db. the trade details are also sent to store trade position prices
      // storing the created_at value in the flipped_at field will fix issues where the time would change when resyncing
      await databaseClient.storeTrade(pendingTrade, tradeDetails, pendingTrade.created_at);

      await robot.updateFunds(userID);

      // send OK status
      res.sendStatus(200);

    } catch (err) {
      if (err.response?.status === 400) {
        console.log('Insufficient funds!');
        socketClient.emit('message', {
          error: `Insufficient funds!`,
          orderUpdate: true,
          userID: Number(userID)
        });
      } else if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out!!!!! Synching orders just in case');
        socketClient.emit('message', {
          error: `Connection timed out, consider synching all orders to prevent duplicates. This will not be done for you.`,
          orderUpdate: true,
          userID: Number(userID)
        });
      } else {
        console.log(err, 'problem in sending trade post route');
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
 * POST route sending basic trade
 */
router.post('/basic', rejectUnauthenticated, async (req, res) => {
  console.log('basic trade post route hit', req.body);
  // POST route code here
  const user = req.user;
  const userID = req.user.id;
  const order = req.body;
  if (user.active && user.approved) {
    // tradeDetails const should take in values sent from trade component form
    const tradeDetails = {
      side: order.side,
      size: order.size, // BTC
      product_id: order.product_id,
      stp: 'cn',
      userID: userID,
      type: order.type
    };
    try {
      // send the new order with the trade details
      await coinbaseClient.placeOrder(tradeDetails);

      await robot.updateFunds(userID);

      // send OK status
      res.sendStatus(200);

    } catch (err) {
      if (err.response?.status === 400) {
        console.log('Insufficient funds!');
        socketClient.emit('message', {
          error: `Insufficient funds!`,
          orderUpdate: true,
          userID: Number(userID)
        });
      } else if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out');
        socketClient.emit('message', {
          error: `Connection timed out`,
          userID: Number(userID)
          // orderUpdate: true
        });
      } else {
        console.log(err, 'problem in sending trade post route');
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
    res.sendStatus(200);
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});


/**
* SYNC route to sync an individual trade with coinbase
  this will just delete it and the bot will replace it on the full sync loop
*/
router.put('/', rejectUnauthenticated, async (req, res) => {
  // sync route code here
  const userID = req.user.id;
  const orderId = req.body.id;

  try {
    await coinbaseClient.cancelOrder(orderId, userID)
    await databaseClient.setSingleReorder(orderId);
    res.sendStatus(200);

    socketClient.emit('message', {
      message: `Order will sync in a moment`,
      userID: Number(userID)
    });
  } catch (error) {
    if (error.data?.message) {
      console.log('error message, trade router sync:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      if (error.data.message === 'order not found') {
        await databaseClient.setSingleReorder(orderId);
        socketClient.emit('message', {
          error: `Order was not found when sync was requested`,
          orderUpdate: true,
          userID: Number(userID)
        });
        console.log('order not found in account', orderId);
        res.sendStatus(400)
      }
    }
    if (error.response?.status === 404) {
      socketClient.emit('message', {
        error: `Order was not found when delete was requested`,
        orderUpdate: true,
        userID: Number(userID),
      });
      console.log('order not found in account', orderId);
      res.sendStatus(400)
    } else {
      console.log('something failed in the sync trade route', error);
      res.sendStatus(500)
    }
  };
});


/**
* DELETE route
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  // DELETE route code here
  const userID = req.user.id;
  const orderId = req.body.id;
  console.log('in the server trade DELETE route', orderId);

  cache.setCancel(userID, orderId);

  console.log(cache.storage[userID].willCancel);

  const willCancel = cache.checkIfCanceling(userID, orderId);
  console.log('will it cancel?', willCancel);

  // mark as canceled in db
  try {
    const queryText = `UPDATE "orders" SET "will_cancel" = true WHERE "id"=$1 RETURNING *;`;
    const result = await pool.query(queryText, [orderId]);
    const order = result.rows[0];
    // if it is a reorder, there is no reason to cancel on CB
    if (!order.reorder) {
      // send cancelOrder to cb
      await coinbaseClient.cancelOrder(orderId, userID);
    }
    res.sendStatus(200)
  } catch (error) {
    if (error.data?.message) {
      console.log(error.data.message, 'error message, trade router DELETE');
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
        orderUpdate: true,
        userID: Number(userID)
      });
      console.log('order not found in account', orderId);
      res.sendStatus(400)
    } else if (error.response?.status === 400) {
      console.log('bad request', error.response?.data);
    } else {
      console.log(error, 'something failed in the delete trade route');
      res.sendStatus(500)
    }
  };
});



module.exports = router;
