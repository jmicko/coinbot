const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const coinbaseClient = require('../modules/coinbaseClient');
const socketClient = require('../modules/socketClient');
// const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * GET route to get all accounts info
 * For now this just wants to return usd account available balance
 */
router.get('/', (req, res) => {
  const user = req.user;
  console.log('THE USER IS', user);
  const userID = req.user.id;
  if (user.approved) {

    coinbaseClient.getAccounts(userID)
      .then((result) => {
        return result.forEach(account => {
          if (account.currency === 'USD') {
            // console.log('usd is', account.available);
            res.send(account.available)
            return account;
          }
        });
      })
      .catch((err) => {
        if (err.response?.status === 500) {
          console.log('internal server error from coinbase');
          socketClient.emit('message', {
            error: `Internal server error from coinbase! Is the Coinbase Pro website down?`,
            orderUpdate: true
          });
        } else {
          console.log('error getting accounts:', err);
        }
        res.sendStatus(500)
      })
  } else {
    res.sendStatus(404)
  }
});

/**
* GET route to get the fees when the user loads the page
*/
router.get('/fees', rejectUnauthenticated, (req, res) => {
  const user = req.user;
  const userID = req.user.id;
  if (user.approved) {
    coinbaseClient.getFees(userID)
      .then((result) => {
        res.send(result)
      })
      .catch((error) => {
        console.log('error getting fees:', error);
        res.sendStatus(500)
      })
  } else {
    res.sendStatus(404)
  }

});

/**
* GET route to get total profit estimate
*/
router.get('/profits', rejectUnauthenticated, (req, res) => {
  const userID = req.user.id;
  // console.log('getting profits for', userID);
  const queryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" * 2)) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true' AND "userID" = $1;`;
  pool.query(queryText, [userID])
    .then((result) => {
      // console.log('here are the profits', result.rows[0].sum);
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
  const userID = req.user.id;
  console.log('here are the api details', req.body);
  function getURI() {
    if (api.URI === "sandbox") {
      return "https://api-public.sandbox.pro.coinbase.com";
    }
    else {
      return "https://api.exchange.coinbase.com";
    }
  }
  const api = req.body;
  const URI = getURI();
  const queryText = `UPDATE "user" SET "CB_SECRET" = $1, "CB_ACCESS_KEY" = $2, "CB_ACCESS_PASSPHRASE" = $3, "API_URI" = $4, "active" = true
  WHERE "id"=$5;`;
  try {

    let result = await pool.query(queryText, [
      api.secret,
      api.key,
      api.passphrase,
      URI,
      userID,
    ]);
    res.sendStatus(200);
  } catch (err) {
    console.log('problem updating api details', err);
    res.sendStatus(500);
  }
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
  console.log('factory reset route hit!');
  console.log(req.user.admin);
  if (req.user.admin) {
    const queryText = `DROP TABLE "orders";
    DROP TABLE "user";
    DROP TABLE "session";
    CREATE TABLE IF NOT EXISTS "orders"
    (
          id character varying COLLATE pg_catalog."default" NOT NULL,
          "userID" character varying COLLATE pg_catalog."default",
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
          "admin" boolean DEFAULT false,
          "approved" boolean DEFAULT false,
          "active" boolean DEFAULT false,
          "CB_SECRET" VARCHAR (1000),
          "CB_ACCESS_KEY" VARCHAR (1000),
          "CB_ACCESS_PASSPHRASE" VARCHAR (1000),
          "API_URI" VARCHAR (1000)
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
    console.log('factory reset db call');
    res.sendStatus(200);
  } else {
    console.log(`you can't do that because you are not admin!`);
    res.sendStatus(403)
  }
});



module.exports = router;
