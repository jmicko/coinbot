const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * POST route 
 */
router.post('/', (req, res) => {

});

/**
* GET route to get the fees when the user loads the page
*/
router.get('/fees', (req, res) => {
  authedClient.get(['fees'])
    .then((result) => {
      res.send(result)
    })
    .catch((error) => {
      res.sendStatus(500)
    })


});

/**
* GET route to get total profit estimate
*/
router.get('/profits', (req, res) => {
  const queryText = `SELECT SUM((("original_sell_price" * "size") - "fill_fees") - (("original_buy_price" * "size") - "fill_fees")) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true';`;
  pool.query(queryText)
    .then((result) => {
      console.log('profits:', result.rows);
      res.send(result.rows)
    })
    .catch((error) => {
      console.log('error in profits:', error);
      res.sendStatus(500)
    })


});



module.exports = router;
