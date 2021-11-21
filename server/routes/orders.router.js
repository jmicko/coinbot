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
  // ask db for an array of buys and an array of sells
  return Promise.all([
    // get all open orders from db and from coinbase
    databaseClient.getUnsettledTrades('buy'),
    databaseClient.getUnsettledTrades('sell'),
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
  console.log('in orders synchronize route');
  await coinbaseClient.cancelAllOrders();
  console.log('+++++++ synchronization complete +++++++');
  res.sendStatus(200)
});


/**
* DELETE route - Mark all orders as will_cancel
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  console.log('in delete all orders route');
  // set all orders to will_cancel so the loop will just cancel them.
  const queryText = `DELETE from "orders" WHERE "settled" = false;`;
  let result = await pool.query(queryText);
  await coinbaseClient.cancelAllOrders();
  console.log('+++++++ EVERYTHING WAS DELETED +++++++');
  // tell front end to update
  socketClient.emit('message', {
    message: `an exchange was made`,
    orderUpdate: true
  });
  res.sendStatus(200)
});


module.exports = router;
