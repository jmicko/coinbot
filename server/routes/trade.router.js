const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');
const coinbaseClient = require('../modules/coinbaseClient');
const cache = require('../modules/cache');
const { v4: uuidv4 } = require('uuid');


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
      original_sell_price: JSON.stringify(Number(order.original_sell_price)),
      original_buy_price: JSON.stringify(Number(order.limit_price)),
      side: order.side,
      limit_price: JSON.stringify(Number(order.limit_price)), // USD
      base_size: JSON.stringify(Number(order.base_size)), // BTC
      product_id: order.product_id,
      // stp: 'cn',
      userID: userID,
      trade_pair_ratio: Number(order.trade_pair_ratio),
      client_order_id: uuidv4()
    };
    if (order.type) {
      tradeDetails.type = 'market';
      // delete tradeDetails.limit_price;
    }
    try {
      // create a fake order, but set it to reorder
      let fakeOrder = {
        order_id: uuidv4(),
        product_id: order.product_id,
        // user_id: '9f732868-9790-5667-b29a-f6eb8ab97966',
        order_configuration: {
          limit_limit_gtc: {
            base_size: JSON.stringify(Number(order.base_size)),
            limit_price: JSON.stringify(Number(order.limit_price)),
            post_only: false
          }
        },
        side: order.side,
        client_order_id: uuidv4(),
        status: 'PENDING',
        time_in_force: 'GOOD_UNTIL_CANCELLED',
        created_time: new Date(),
        completion_percentage: '0',
        filled_size: '0',
        average_filled_price: '0',
        fee: '',
        number_of_fills: '0',
        filled_value: '0',
        pending_cancel: false,
        size_in_quote: false,
        total_fees: '0',
        size_inclusive_of_fees: false,
        total_value_after_fees: '0',
        trigger_status: 'INVALID_ORDER_TYPE',
        order_type: 'LIMIT',
        reject_reason: 'REJECT_REASON_UNSPECIFIED',
        settled: false,
        product_type: 'SPOT',
        reject_message: '',
        cancel_message: '',
        reorder: true
      }
      // store the fake order in the db. It will be ordered later in the reorder function
      await databaseClient.storeTrade(fakeOrder, tradeDetails, fakeOrder.created_time);
      console.log(fakeOrder, 'trade saved to db');
      await robot.updateFunds(userID);
      // send OK status
      res.sendStatus(200);
    } catch (err) {
      console.log(fakeOrder, "FAILURE creating new trade-pair");
      const errorText = 'FAILURE creating new trade-pair!';
      const errorData = fakeOrder;
      cache.storeError(userID, {
        errorData: errorData,
        errorText: errorText
      })
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
      base_size: order.base_size, // BTC
      product_id: order.product_id,
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
      } else if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out');
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
    let setupParams = req.body;
    let setup = await robot.autoSetup(user, setupParams)
    console.log('setup is:', setup);

    try {
      // need unique IDs for each trade, but need to also get IDs from CB, so DB has no default.
      // store a number that counts up every time autoSetup is used, and increase it before using it in case of error
      // then use it here and increase it by the number of trades being put through this way
      const number = (Number(user.auto_setup_number) + setup.orderList.length)
      await databaseClient.setAutoSetupNumber(number, user.id);


      console.log('setup params:', setupParams);
      // put a market order in for how much BTC need to be purchase for all the sell orders
      // if (false) {
      if (setup.btcToBuy >= 0.000016) {
        const tradeDetails = {
          side: 'BUY',
          base_size: setup.btcToBuy.toFixed(8), // BTC
          product_id: 'BTC-USD',
          stp: 'cn',
          userID: user.id,
          type: 'market'
        };
        console.log('BIG order', tradeDetails);
        if (!setupParams.ignoreFunds) {
          let bigOrder = await coinbaseClient.placeOrder(tradeDetails);
          // console.log('big order to balance btc avail', bigOrder.limit_size, 'user', user.taker_fee);
        }
        await robot.updateFunds(user.id);
      }

      // put each trade into the db as a reorder so the sync loop can sync the right amount
      for (let i = 0; i < setup.orderList.length; i++) {
        if (i == 0 && req.body.skipFirst) {
          console.log('Skip one!');
          continue;
        }
        const order = setup.orderList[i];
        // adding a bunch of 0s allows easy sorting by id in the DB which might be useful later so better to start now
        order.order_id = '0000000000' + (Number(user.auto_setup_number) + i).toString();
        // use the current time for the created time 
        const time = new Date();
        order.created_at = time;
        order.reorder = true;
        console.log('order to store', order);
        await databaseClient.storeTrade(order, order, time);
      }



    } catch (err) {
      console.log(err, 'problem in autoSetup ');
      cache.storeError(userID, {
        errorText: `problem in auto setup`
      })
    }


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
  const orderId = req.body.order_id;

  try {
    await coinbaseClient.cancelOrder(orderId, userID)
    await databaseClient.setSingleReorder(orderId);
    res.sendStatus(200);

  } catch (error) {
    if (error.data?.message) {
      console.log('error message, trade router sync:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      if (error.data.message === 'order not found') {
        await databaseClient.setSingleReorder(orderId);
        console.log('order not found in account', orderId);
        res.sendStatus(400)
      }
    }
    if (error.response?.status === 404) {
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
  const orderId = req.body.order_id;
  console.log('in the server trade DELETE route', orderId);

  cache.setCancel(userID, orderId);
  // mark as canceled in db
  try {
    const queryText = `UPDATE "limit_orders" SET "will_cancel" = true WHERE "order_id"=$1 RETURNING *;`;
    const result = await pool.query(queryText, [orderId]);
    const order = result.rows[0];
    // if it is a reorder, there is no reason to cancel on CB
    if (!order.reorder) {
      // send cancelOrder to cb
      await coinbaseClient.cancelOrderNew(userID, [orderId]);
    }
    res.sendStatus(200)
  } catch (err) {
    if (err.data?.message) {
      console.log(err.data.message, 'error message, trade router DELETE');
      // orders that have been canceled are deleted from coinbase and return a 404.
      // error handling should delete them from db and not worry about coinbase since there is no other way to delete
      // but also send one last delete message to Coinbase just in case it finds it again, but with no error checking
    }
    if (err.response?.status === 404) {
      databaseClient.deleteTrade(orderId);
      console.log('order not found in account', orderId);
      res.sendStatus(404)
    } else if (err.response?.status === 400) {
      console.log('bad request', err.response?.data);
    } else {
      console.log(err, 'something failed in the delete trade route');
      res.sendStatus(500)
    }
  };
});



module.exports = router;
