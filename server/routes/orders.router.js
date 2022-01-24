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
  // console.log('getting all orders for...', userID);
  // ask db for an array of buys and an array of sells
  return Promise.all([
    // get all open orders from db and from coinbase
    databaseClient.getUnsettledTrades('buy', userID),
    databaseClient.getUnsettledTrades('sell', userID),
    databaseClient.getUnsettledTradeCounts(userID)
  ])
    .then((result) => {
      const buys = result[0], sells = result[1], counts = result[2];
      const openOrdersInOrder = {
        sells: sells,
        buys: buys,
        counts: counts
      }
      // console.log('here are all the open orders', openOrdersInOrder);
      res.send(openOrdersInOrder)
    })
    .catch((error) => {
      console.log(error, 'error in get orders route');
      res.sendStatus(500)
    })
});


/**
* UPDATE route - synchronize all orders with cb
*/
router.put('/', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  console.log('in orders synchronize route. Paused:', previousPauseStatus);
  try{

    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID)

    // wait 5 seconds to give the synch loop more time to finish
    await sleep(5000);
    
    // mark all open orders as reorder
    await databaseClient.setReorder();

    // cancel all orders. The sync loop will take care of replacing them
    await coinbaseClient.cancelAllOrders(userID);
    
    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
    console.log('+++++++ synchronization complete +++++++');
    res.sendStatus(200)
  } catch (err) {
    console.log('problem in synch orders PUT route');
  }
});


/**
* DELETE route - Mark all orders as will_cancel
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
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
    await databaseClient.setReorder();

    // cancel all orders. The sync loop will take care of replacing them
    await coinbaseClient.cancelAllOrders(userID);
    
    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID)
    // console.log('+++++++ EVERYTHING WAS DELETED +++++++');
    // tell front end to update
    socketClient.emit('message', {
      orderUpdate: true
    });
  } catch (err) {
    console.log(err);
  }
  res.sendStatus(200)
});


module.exports = router;
