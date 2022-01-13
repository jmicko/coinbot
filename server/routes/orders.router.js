const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');
const socketClient = require("../modules/socketClient");
const coinbaseClient = require('../modules/coinbaseClient');


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
  ])
    .then((result) => {
      const buys = result[0], sells = result[1];
      const openOrdersInOrder = {
        sells: sells,
        buys: buys
      }
      // console.log('here are all the open orders', openOrdersInOrder);
      res.send(openOrdersInOrder)
    })
    .catch((error) => {
      res.send(500)
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
  console.log('in delete all orders route', userID);
  try {
    // delete from db first
    const queryText = `DELETE from "orders" WHERE "settled" = false AND "userID"=$1;`;
    await pool.query(queryText, [userID]);
    // delete all orders from coinbase
    await coinbaseClient.cancelAllOrders(userID);
    console.log('+++++++ EVERYTHING WAS DELETED +++++++');
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
