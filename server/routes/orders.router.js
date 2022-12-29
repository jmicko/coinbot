const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const { cbClients, messenger, userStorage } = require('../modules/cache');
const { sleep } = require('../../src/shared');


/**
* GET route - get all orders
*/
router.get('/:product', rejectUnauthenticated, (req, res) => {
  console.log('in get all orders for a product route');
  const userID = req.user.id;
  const product = req.params.product;
  // console.log('user in get all orders route', product);
  // console.log('getting all orders for...', userID);
  // ask db for an array of buys and an array of sells
  return Promise.all([
    // get all open orders from db and from coinbase
    databaseClient.getUnsettledTradesByProduct('BUY', product, userID, req.user.max_trade_load),
    databaseClient.getUnsettledTradesByProduct('SELL', product, userID, req.user.max_trade_load),
    databaseClient.getUnsettledTradeCounts(userID, product)
  ])
    .then((result) => {
      const buys = result[0], sells = result[1], counts = result[2];
      // console.log('buys', buys);
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


/**
* UPDATE route - synchronize all orders with cb
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
    // console.log('+++++++ synchronization complete +++++++');
    res.sendStatus(200)
  } catch (err) {
    console.log('problem in synch orders PUT route');
  }
});


/**
* DELETE RANGE route - Delete orders within a range
*/
router.delete('/range', rejectUnauthenticated, async (req, res) => {
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
    await pool.query(queryText, [userID, req.body.product_id, req.body.lowerLimit, req.body.upperLimit]);

    // mark all open orders as reorder
    // await databaseClient.setReorder();

    // todo - fix this so it cancels an array returned from above
    // cancel all orders. The sync loop will take care of replacing them
    await cbClients[userID].cancelAll();

    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
    messenger[userID].newMessage({
      type: 'general',
      text: `Deleted orders between ${req.body.lowerLimit} and ${req.body.upperLimit} for ${req.body.product_id}`,
      orderUpdate: true
    })
    console.log('+++++++ RANGE WAS DELETED +++++++ for user:', userID);
  } catch (err) {
    console.log(err, 'error in delete all orders route');
  }
  res.sendStatus(200)
});


/**
* DELETE route - delete all orders from DB, then cancel on CB
*/
router.delete('/all', rejectUnauthenticated, async (req, res) => {
  console.log('in delete all orders route');
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  console.log('in delete all orders route', userID);
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the synch loop more time to finish
    await sleep(5000);

    // delete from db first
    const queryText = `DELETE from "limit_orders" WHERE "settled" = false AND "userID"=$1;`;
    await pool.query(queryText, [userID]);

    // mark all open orders as reorder
    // wait why?
    await databaseClient.setReorder(userID);

    // cancel all orders. The sync loop will take care of replacing them

    await cbClients[userID].cancelAll();

    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
    // update orders on client
    messenger[userID].newMessage({
      type: 'general',
      text: `Deleted all orders`,
      orderUpdate: true
    })

    console.log('+++++++ EVERYTHING WAS DELETED +++++++ for user:', userID);
  } catch (err) {
    console.log(err, 'error in delete all orders route');
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


module.exports = router;
