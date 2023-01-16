// orders.router.js
// const express = require('express');
import express from 'express';
const router = express.Router();
// const pool = require('../modules/pool');
import { pool } from '../modules/pool.js';
// const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
// const databaseClient = require('../modules/databaseClient');
import { databaseClient } from '../modules/databaseClient.js';
// const { cbClients, messenger, userStorage, botSettings } = require('../modules/cache');
import { cbClients, messenger, userStorage, botSettings } from '../modules/cache.js';
// const { sleep, autoSetup } = require('../../src/shared');
import { sleep, autoSetup, devLog } from '../../src/shared.js';
// const { v4: uuidv4 } = require('uuid');
import { v4 as uuidv4 } from 'uuid';
// const robot = require('../modules/robot');
import { robot } from '../modules/robot.js';


// This router is used for orders that are stored in the database
// Things like market orders and limit orders that are not stored should go in the trade.router.js file

////////////////////////
////// GET ROUTES //////
////////////////////////

// we probably don't need a get / route to get all orders. Nothing on the client side uses it

/**
* GET route - get all orders for a product
*/
router.get('/:product', rejectUnauthenticated, (req, res) => {
  console.log('in get all orders for a product route');
  const userID = req.user.id;
  const product = req.params.product;
  // ask db for an array of buys and an array of sells
  return Promise.all([
    // get all open orders from db and from coinbase
    databaseClient.getUnsettledTradesByProduct('BUY', product, userID, req.user.max_trade_load),
    databaseClient.getUnsettledTradesByProduct('SELL', product, userID, req.user.max_trade_load),
    databaseClient.getUnsettledTradeCounts(userID, product)
  ])
    .then((result) => {
      const buys = result[0], sells = result[1], counts = result[2];
      const openOrdersInOrder = {
        sells: sells,
        buys: buys,
        counts: counts
      }
      res.send(openOrdersInOrder)
    })
    .catch((err) => {
      console.log(err, 'error in get orders route');
      res.sendStatus(500)
    })
});

/////////////////////////
////// POST ROUTES //////
/////////////////////////


/**
 * POST route for auto setup
 */
router.post('/autoSetup', rejectUnauthenticated, async (req, res) => {
  console.log('in auto setup route!');
  // POST route code here
  const user = req.user;
  if (user.active && user.approved) {
    // get the user available funds
    const funds = userStorage[user.id].getAvailableFunds();
    user.availableFunds = funds;
    let options = req.body;
    console.log('options in auto setup route', options.product);
    let setup = autoSetup(user, options)
    try {
      console.log('setup options:', options);
      // put a market order in for how much BTC need to be purchase for all the sell orders
      // if (false) {
      if (setup.btcToBuy >= 0.000016) {
        const tradeDetails = {
          side: 'BUY',
          base_size: setup.btcToBuy.toFixed(8), // BTC
          product_id: options.product.product_id,
          type: 'market',
          // tradingPrice: options.tradingPrice
        };
        console.log('BIG order', tradeDetails);
        if (!options.ignoreFunds) {
          let bigOrder = await cbClients[user.id].placeOrder(tradeDetails);
          console.log('big order to balance btc avail', bigOrder,);
        }
        await robot.updateFunds(user.id);
      }

      // put each trade into the db as a reorder so the sync loop can sync the right amount
      for (let i = 0; i < setup.orderList.length; i++) {
        const order = setup.orderList[i];

        const tradeDetails = {
          original_sell_price: JSON.stringify(Number(order.original_sell_price)),
          original_buy_price: JSON.stringify(Number(order.original_buy_price)),
          side: order.side,
          limit_price: JSON.stringify(Number(order.limit_price)), // USD
          base_size: JSON.stringify(Number(order.base_size)), // BTC
          product_id: order.product_id,
          total_fees: order.previous_total_fees,
          // stp: 'cn',
          userID: user.id,
          trade_pair_ratio: Number(options.trade_pair_ratio),
          client_order_id: uuidv4()
        };

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
        await databaseClient.storeTrade(fakeOrder, tradeDetails, fakeOrder.created_time);
        // await databaseClient.storeTrade(order, order, time);
      }
      // tell DOM to update orders
      messenger[user.id].newMessage({
        type: 'general',
        text: `Auto setup complete!`,
        orderUpdate: true
      });
    } catch (err) {
      console.log(err, 'problem in autoSetup ');
      messenger[user.id].newError({
        errorData: err,
        errorText: `problem in auto setup`
      });
    }
    res.sendStatus(200);
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});


/**
 * POST route - create a new order pair
 */
router.post('/:product_id', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const user = req.user;
  const userID = req.user.id;
  const order = req.body;
  devLog('in post order route');
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
    console.log('trade details', tradeDetails);
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
      console.log('order to store', fakeOrder);
      // store the fake order in the db. It will be ordered later in the reorder function
      await databaseClient.storeTrade(fakeOrder, tradeDetails, fakeOrder.created_time);
      await robot.updateFunds(userID);
      // tell DOM to update orders
      messenger[userID].newMessage({
        type: 'general',
        text: `New trade-pair created!`,
      });
      // send OK status
      res.sendStatus(200);
    } catch (err) {
      console.log(err, "FAILURE creating new trade-pair");
      const errorText = 'FAILURE creating new trade-pair!';
      const errorData = err;
      messenger[userID].newError({
        errorData: errorData,
        errorText: errorText
      });

      // send internal error status
      res.sendStatus(500);
    }
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});



////////////////////////
////// PUT ROUTES //////
////////////////////////

/**
* UPDATE route - synchronize all orders with cb
--- is this really needed anymore? The bot hasn't had this kind of problem in a while
--- this could be better used to update the size of a trade pair
*/
router.put('/', rejectUnauthenticated, async (req, res) => {
  console.log('in synch orders PUT route');
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  try {

    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the sync loop more time to finish
    await sleep(5000);

    // mark all open orders as reorder
    await databaseClient.setReorder(userID);

    // cancel all orders. The sync loop will take care of replacing them
    await cbClients[userID].cancelAll();

    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
    res.sendStatus(200)
  } catch (err) {
    console.log('problem in synch orders PUT route');
  }
});


/**
 * PUT route bulk updating trade pair ratio
 */
router.put('/bulkPairRatio/:product_id', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  const bulk_pair_ratio = req.body.bulk_pair_ratio;
  const product_id = req.params.product_id;
  console.log('in bulkPairRatio PUT route', bulk_pair_ratio, '<-bulk_pair_ratio', product_id, '<-product_id', userID, '<-userID');
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID);
    await userStorage[user.id].update();

    // wait 5 seconds to give the sync loop more time to finish
    await sleep(5000);

    console.log('updating trade pair ratio for all trades for that user')
    // update the trade-pair ratio for all trades for that user
    const updateTradesQueryText = `UPDATE limit_orders
    SET "trade_pair_ratio" = $1
    WHERE "settled" = false AND "product_id" = $2 AND "userID" = $3;`

    await pool.query(updateTradesQueryText, [
      bulk_pair_ratio,
      product_id,
      userID
    ]);

    console.log('updating original sell price for all trades for that user')
    // update original sell price after ratio is set
    const updateOGSellPriceQueryText = `UPDATE limit_orders
    SET "original_sell_price" = ROUND(((original_buy_price * ("trade_pair_ratio" + 100)) / 100), 2)
    WHERE "settled" = false AND "product_id" = $1 AND "userID" = $2;`

    await pool.query(updateOGSellPriceQueryText, [
      product_id,
      userID
    ]);

    console.log('updating limit price for all trades for that user')
    // need to update the current price on all sells after changing numbers on all trades
    const updateSellsPriceQueryText = `UPDATE limit_orders
    SET "limit_price" = "original_sell_price"
    WHERE "side" = 'SELL' AND "product_id" = $1 AND "userID" = $2;`;

    await pool.query(updateSellsPriceQueryText, [
      product_id,
      userID
    ]);

    // Now cancel all trades so they can be reordered with the new numbers
    // mark all open orders as reorder
    await databaseClient.setReorder(userID);

    let openOrders = await databaseClient.getLimitedUnsettledTrades(userID, user.sync_quantity);

    if (openOrders.length > 0) {
      // build an array of just the IDs that should be set to reorder
      const idArray = [];
      for (let i = 0; i < openOrders.length; i++) {
        const order = openOrders[i];
        idArray.push(order.order_id)
      } //end for loop

      // cancel all orders. The sync loop will take care of replacing them
      await cbClients[userID].cancelOrders(idArray);
    }

    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID);
    await userStorage[user.id].update();
    // update orders on client
    messenger[userID].newMessage({
      type: 'general',
      text: `Bulk trade pair ratio updated to ${bulk_pair_ratio}`,
      orderUpdate: true
    })

    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'error with bulk updating trade pair ratio route');
    res.sendStatus(500);
  }
});

///////////////////////////
////// DELETE ROUTES //////
///////////////////////////

/**
* DELETE route - delete all orders from DB, then cancel on CB
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  console.log('in delete all orders route');
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  console.log('in delete all orders route', userID);
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the sync loop more time to finish
    await sleep(5000);

    // delete from db first
    const queryText = `DELETE from "limit_orders" WHERE "settled" = false AND "userID"=$1;`;
    await pool.query(queryText, [userID]);

    // cancel all orders on coinbase
    await cbClients[userID].cancelAll();

    // update orders on client
    messenger[userID].newMessage({
      type: 'general',
      text: `Deleted all orders`,
      orderUpdate: true
    })

    console.log('+++++++ EVERYTHING WAS DELETED +++++++ for user:', userID);
  } catch (err) {
    console.log(err, 'error in delete all orders route');
  } finally {
    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
  }
  res.sendStatus(200)
});

/**
* DELETE route - delete a single order from DB, then cancel on CB
*/
router.delete('/:order_id', rejectUnauthenticated, async (req, res) => {
  console.log('in delete single order route');
  // DELETE route code here
  const userID = req.user.id;
  const orderId = req.params.order_id;

  userStorage[userID].setCancel(orderId);
  // mark as canceled in db
  try {
    let order = await databaseClient.updateTrade({
      will_cancel: true,
      order_id: orderId
    })
    // if it is a reorder, there is no reason to cancel on CB
    if (!order.reorder) {
      // send cancelOrder to cb
      await cbClients[userID].cancelOrders([orderId]);
    }
    res.sendStatus(200)
    messenger[userID].newMessage({
      type: 'general',
      text: 'Successfully deleted trade-pair',
      orderUpdate: true
    });
  } catch (err) {
    let errorText = 'FAILURE deleting trade-pair!';
    let errorData = err?.data;
    if (err?.data?.message) {
      console.log(err.data.message, 'error message, trade router DELETE');
    }
    if (err.response?.status === 404) {
      databaseClient.deleteTrade(orderId);
      console.log('order not found in account', orderId);
      errorText = 'Order not found on coinbase, deleting from Coinbot.';
      res.sendStatus(404)
    } else if (err.response?.status === 400) {
      console.log('bad request', err.response?.data);
      errorText = 'Bad request. Please try again.';
      res.sendStatus(400)
    } else {
      console.log(err, 'something failed in the delete trade route');
      res.sendStatus(500)
    }
    messenger[userID].newError({
      errorData: errorData,
      errorText: errorText
    });
  };
});

/**
* DELETE route - delete all orders for a product from DB, then cancel on CB
*/
router.delete('/product/:product_id', rejectUnauthenticated, async (req, res) => {
  console.log('in delete all orders for product_id route');
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  const product_id = req.params.product_id;
  console.log('in delete all orders route', userID);
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the sync loop more time to finish
    await sleep(5000);

    // delete from db first
    const queryText = `DELETE from "limit_orders" WHERE "settled" = false AND "userID"=$1 AND "product_id"=$2;`;
    await pool.query(queryText, [userID, product_id]);

    // cancel all orders for that product on coinbase
    await cbClients[userID].cancelAllForProduct(product_id);

    // update orders on client
    messenger[userID].newMessage({
      type: 'general',
      text: `Deleted all orders for ${product_id}`,
      orderUpdate: true
    })

    console.log(`+++++++ EVERYTHING FOR PRODUCT: ${product_id} WAS DELETED +++++++ for user:`, userID);
  } catch (err) {
    console.log(err, 'error in delete all orders route');
  } finally {
    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
  }
  res.sendStatus(200)
});


/**
* DELETE RANGE route - Delete orders within a range
*/
router.delete('/:product_id/:start/:end', rejectUnauthenticated, async (req, res) => {
  console.log('in delete range route');
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  console.log('in delete range route', userID, req.body);
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the synch loop more time to finish
    await sleep(5000);

    // delete from db
    const queryText = `DELETE from "limit_orders" WHERE "userID"=$1 AND settled=false AND "product_id"=$2 AND limit_price BETWEEN $3 AND $4;`;
    await pool.query(queryText, [userID, req.params.product_id, req.params.start, req.params.end]);

    // mark all open orders as reorder
    // await databaseClient.setReorder();

    // todo - fix this so it cancels an array returned from above
    // cancel all orders. The sync loop will take care of replacing them
    await cbClients[userID].cancelAll();

    messenger[userID].newMessage({
      type: 'general',
      text: `Deleted orders between ${req.body.lowerLimit} and ${req.body.upperLimit} for ${req.body.product_id}`,
      orderUpdate: true
    })
    console.log('+++++++ RANGE WAS DELETED +++++++ for user:', userID);
  } catch (err) {
    console.log(err, 'error in delete all orders route');
  } finally {
    // set pause status to what it was before route was hit
    console.log('setting pause status to what it was before route was hit');
    await databaseClient.setPause(previousPauseStatus, userID)
  }
  res.sendStatus(200)
});



export default router;
