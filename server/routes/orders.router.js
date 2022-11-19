const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');
const socketClient = require("../modules/socketClient");
const coinbaseClient = require('../modules/coinbaseClient');
const { sleep } = require('../modules/robot');


/**
* GET route - get all orders
*/
router.get('/', rejectUnauthenticated, (req, res) => {
  const userID = req.user.id;
  console.log('user in get all orders route', req.user.max_trade_load);
  // console.log('getting all orders for...', userID);
  // ask db for an array of buys and an array of sells
  return Promise.all([
    // get all open orders from db and from coinbase
    databaseClient.getUnsettledTrades('BUY', userID, req.user.max_trade_load),
    databaseClient.getUnsettledTrades('SELL', userID, req.user.max_trade_load),
    databaseClient.getUnsettledTradeCounts(userID)
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
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  try{

    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the synch loop more time to finish
    await sleep(5000);
    
    // mark all open orders as reorder
    await databaseClient.setReorder(userID);

    // cancel all orders. The sync loop will take care of replacing them
    await coinbaseClient.cancelAllOrders(userID);
    
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
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  console.log('in delete range route', userID, req.body);
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)
    
    // wait 5 seconds to give the synch loop more time to finish
    await sleep(5000);

    // delete from db
    const queryText = `DELETE from "orders" WHERE "userID"=$1 AND settled=false AND price BETWEEN $2 AND $3;`;
    await pool.query(queryText, [userID, req.body.lowerLimit, req.body.upperLimit]);
    
    // mark all open orders as reorder
    // await databaseClient.setReorder();

    // cancel all orders. The sync loop will take care of replacing them
    // await coinbaseClient.cancelAllOrders(userID);
    
    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
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
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  console.log('in delete all orders route', userID);
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)
    
    // wait 5 seconds to give the synch loop more time to finish
    await sleep(5000);

    // delete from db first
    const queryText = `DELETE from "orders" WHERE "settled" = false AND "userID"=$1;`;
    await pool.query(queryText, [userID]);
    
    // mark all open orders as reorder
    await databaseClient.setReorder(userID);

    // cancel all orders. The sync loop will take care of replacing them
    await coinbaseClient.cancelAllOrders(userID);
    
    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
    console.log('+++++++ EVERYTHING WAS DELETED +++++++ for user:', userID);
  } catch (err) {
    console.log(err, 'error in delete all orders route');
  }
  res.sendStatus(200)
});


module.exports = router;
