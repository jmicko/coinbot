const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');


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
      console.log('in orders update route');
      await robot.syncOrders();
      res.sendStatus(200)
});


module.exports = router;
