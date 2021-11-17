const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const authedClient = require('../modules/authedClient');
// const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * GET route to get all accounts info
 * For now this just wants to return usd account available balance
 */
router.get('/', (req, res) => {
  authedClient.getAccounts()
    .then((result) => {
      return result.forEach(account => {
        if (account.currency === 'USD') {
          // console.log('usd is', account.available);
          res.send(account.available)
          return account;
        }
      });
    })
    .catch((error) => {
      console.log('error getting accounts:', error.code);
      res.sendStatus(500)
    })
});

/**
* GET route to get the fees when the user loads the page
*/
router.get('/fees', rejectUnauthenticated, (req, res) => {
  authedClient.get(['fees'])
    .then((result) => {
      res.send(result)
    })
    .catch((error) => {
      console.log('error getting fees:', error.code);
      res.sendStatus(500)
    })


});

/**
* GET route to get total profit estimate
*/
router.get('/profits', rejectUnauthenticated, (req, res) => {
  const queryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" * 2)) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true';`;
  pool.query(queryText)
    .then((result) => {
      res.send(result.rows)
    })
    .catch((error) => {
      console.log('error in profits route:', error);
      res.sendStatus(500)
    })


});

/**
* POST route to store API details
*/
router.post('/storeApi', rejectUnauthenticated, async (req, res) => {
  console.log('here are the api details', req.body);
  const api = req.body;
  const queryText = `UPDATE "user" SET "CB_SECRET" = $1, "CB_ACCESS_KEY" = $2, "CB_ACCESS_PASSPHRASE" = $3;`;
      let result = await pool.query(queryText, [
        api.secret,
        api.key,
        api.passphrase,
      ]);
  res.sendStatus(200);
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
  console.log('factory reset route hit!');
  // const api = req.body;
  // const queryText = `UPDATE "user" SET "CB_SECRET" = $1, "CB_ACCESS_KEY" = $2, "CB_ACCESS_PASSPHRASE" = $3;`;
  //     let result = await pool.query(queryText, [
  //       api.secret,
  //       api.key,
  //       api.passphrase,
  //     ]);
  res.sendStatus(200);
});



module.exports = router;
