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
  const user = req.user.username;
  console.log('getting all orders for...', user);
  // ask db for an array of buys and an array of sells
  return Promise.all([
    // get all open orders from db and from coinbase
    databaseClient.getUnsettledTrades('buy', user),
    databaseClient.getUnsettledTrades('sell', user),
  ])
    .then((result) => {
      const buys = result[0], sells = result[1];
      const openOrdersInOrder = {
        sells: sells,
        buys: buys
      }
      // console.log(buys);
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
  const user = req.user.username;
  console.log('in orders synchronize route');
  await coinbaseClient.cancelAllOrders(user);
  console.log('+++++++ synchronization complete +++++++');
  res.sendStatus(200)
});


/**
* DELETE route - Mark all orders as will_cancel
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  const user = req.user.username;
  console.log('in delete all orders route');
  try {
    // delete from db first
    const queryText = `DELETE from "orders" WHERE "settled" = false;`;
    await pool.query(queryText);
    // delete all orders from coinbase
    await coinbaseClient.cancelAllOrders(user);
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
