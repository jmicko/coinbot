const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient/databaseClient');
const robot = require('../modules/robot/robot')


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
* DELETE route
*/
router.delete('/', rejectUnauthenticated, (req, res) => {
  // DELETE route code here
  console.log('in the server trade DELETE route')
    .then(data => {
      console.log('order was deleted successfully');
      console.log(data);
    })
    .catch((error) => {
      console.log('something failed', error);
      res.sendStatus(500)
    });

});




module.exports = router;
