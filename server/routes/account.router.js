const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const coinbaseClient = require('../modules/coinbaseClient');
// const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * GET route to get all accounts info
 * For now this just wants to return usd account available balance
 */
router.get('/', (req, res) => {
  coinbaseClient.getAccounts()
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
  coinbaseClient.getFees()
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
  const queryText = `DROP TABLE "orders";
  DROP TABLE "user";
  DROP TABLE "session";
  CREATE TABLE IF NOT EXISTS "orders"
  (
      id character varying COLLATE pg_catalog."default" NOT NULL,
      price numeric(32,8),
      size numeric(32,8),
      side character varying COLLATE pg_catalog."default",
      settled boolean DEFAULT false,
      flipped boolean DEFAULT false,
      will_cancel boolean DEFAULT false,
      product_id character varying COLLATE pg_catalog."default",
      time_in_force character varying COLLATE pg_catalog."default",
      created_at character varying COLLATE pg_catalog."default",
      done_at character varying COLLATE pg_catalog."default",
      fill_fees numeric(32,16),
      filled_size numeric(32,8),
      executed_value numeric(32,16),
      original_buy_price numeric(32,16),
      original_sell_price numeric(32,16),
      CONSTRAINT orders_pkey PRIMARY KEY (id)
  );
  CREATE TABLE "user" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR (80) UNIQUE NOT NULL,
    "password" VARCHAR (1000) NOT NULL,
    "CB_SECRET" VARCHAR (1000),
    "CB_ACCESS_KEY" VARCHAR (1000),
    "CB_ACCESS_PASSPHRASE" VARCHAR (1000)
  );
  CREATE TABLE "session" (
      "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
  )
  WITH (OIDS=FALSE);
  ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
  CREATE INDEX "IDX_session_expire" ON "session" ("expire");`;
  let result = await pool.query(queryText);
  console.log('factory reset db call', result);
  res.sendStatus(200);
});



module.exports = router;
