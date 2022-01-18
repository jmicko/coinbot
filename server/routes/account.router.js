const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const coinbaseClient = require('../modules/coinbaseClient');
const socketClient = require('../modules/socketClient');
const xlsx = require('json-as-xlsx');
const databaseClient = require('../modules/databaseClient');
// const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * GET route to get all accounts info
 * For now this just wants to return usd account available balance
 */
router.get('/', (req, res) => {
  const user = req.user;
  // console.log('THE USER IS', user);
  const userID = req.user.id;
  if (user.active) {

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
        } else if (err.response?.status === 401) {
          console.log('Invalid API key');
          socketClient.emit('message', {
            error: `Invalid API key!`,
            orderUpdate: false,
            userID: Number(userID)
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
  if (user.active) {
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
  const queryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" + "previous_fill_fees")) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true' AND "include_in_profit" = 'true' AND "userID" = $1;`;
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
* GET route to export xlsx history of orders
*/
router.get('/exportXlsx', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  console.log('exporting xlsx for', userID);

  try {
    let sqlText = `SELECT * FROM "orders" WHERE "userID"=$1;`;

    let result = await pool.query(sqlText, [userID]);
    const allOrders = result.rows;
    // console.log(allOrders);


    const data = [
      {
        sheet: 'Orders',
        columns: [
          { label: 'ID', value: 'id' },
          { label: 'Price', value: 'price' },
          { label: 'Size', value: 'size' },
          { label: 'Trade pair ratio', value: 'trade_pair_ratio' },
          { label: 'Side', value: 'side' },
          { label: 'Settled', value: 'settled' },
          { label: 'Flipped', value: 'flipped' },
          { label: 'Include in profit', value: 'include_in_profit' },
          { label: 'Product', value: 'product_id' },
          { label: 'Created at', value: 'created_at' },
          { label: 'Done at', value: 'done_at' },
          { label: 'Done reason', value: 'done_reason' },
          { label: 'Fill fees', value: 'fill_fees' },
          { label: 'Filled size', value: 'filled_size' },
          { label: 'Executed value', value: 'executed_value' },
          { label: 'Original buy price', value: 'original_buy_price' },
          { label: 'Original sell price', value: 'original_sell_price' }
        ],
        content: allOrders
      },
    ]

    const settings = {
      writeOptions: {
        type: 'buffer',
        bookType: 'xlsx'
      }
    }
    res.status(200).send(data);
  } catch (err) {
    console.log('problem getting all orders');
  }
});

/**
 * PUT route to change status of pause
 */
router.put('/pause', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    databaseClient.setPause(!user.paused, user.id)
    res.sendStatus(200);
  } catch (err) {
    console.log('problem in PAUSE ROUTE', err);
    res.sendStatus(500);
  }
});

/**
* PUT route to change theme
*/
router.put('/theme', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    console.log('in the THEME ROUTE', user.username, req.body.theme);
    const queryText = `UPDATE "user_settings" SET "theme" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.theme, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log('problem in THEME ROUTE', err);
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment
*/
router.put('/reinvest', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    // console.log('in the REINVEST ROUTE', user, req.body);
    const queryText = `UPDATE "user_settings" SET "reinvest" = $1 WHERE "userID" = $2`;
    let result = await pool.query(queryText, [!user.reinvest, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log('problem in REINVEST ROUTE', err);
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/reinvestRatio', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    // console.log('in the REINVEST RATIO ROUTE', user, req.body);
    const queryText = `UPDATE "user_settings" SET "reinvest_ratio" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.reinvest_ratio, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log('problem in REINVEST ROUTE', err);
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment
*/
router.put('/tradeMax', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    console.log('in the tradeMax ROUTE', user, req.body);
    const queryText = `UPDATE "user_settings" SET "max_trade" = $1 WHERE "userID" = $2`;
    let result = await pool.query(queryText, [!user.max_trade, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log('problem in tradeMax ROUTE', err);
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/maxTradeSize', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    console.log('in the maxTradeSize ROUTE', user, req.body);
    if (req.body.max_trade_size >= 0) {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [req.body.max_trade_size, user.id]);
    } else {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [0, user.id]);
    }
    res.sendStatus(200);
  } catch (err) {
    console.log('problem in maxTradeSize ROUTE', err);
    res.sendStatus(500);
  }
});

/**
* POST route to reset profits
*/
router.post('/resetProfit', rejectUnauthenticated, async (req, res) => {
  const profit_reset = new Date();
  const userID = req.user.id;
  const queryText = `UPDATE "orders" SET "include_in_profit" = false WHERE "userID"=$1 AND "settled"=true;`;
  const timeQuery = `UPDATE "user_settings" SET "profit_reset" = $1 WHERE "userID" = $2;`
  try {
    await pool.query(queryText, [userID]);
    await pool.query(timeQuery, [profit_reset, userID]);
    res.sendStatus(200);
  } catch (err) {
    console.log('problem resetting profit', err);
    res.sendStatus(500);
  }
});

/**
* POST route to store API details
*/
router.post('/storeApi', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
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
  const userAPIQueryText = `UPDATE "user_api" SET "CB_SECRET" = $1, "CB_ACCESS_KEY" = $2, "CB_ACCESS_PASSPHRASE" = $3, "API_URI" = $4
  WHERE "userID"=$5;`;
  const queryText = `UPDATE "user" SET "active" = true
  WHERE "id"=$1;`;
  try {
    // check if the api works first
    await coinbaseClient.testAPI(api.secret, api.key, api.passphrase, URI)
    // store the api
    let userAPIResult = await pool.query(userAPIQueryText, [
      api.secret,
      api.key,
      api.passphrase,
      URI,
      userID,
    ]);

    // set the account as active
    let result = await pool.query(queryText, [userID]);

    res.sendStatus(200);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('Invalid API key');
      socketClient.emit('message', {
        error: `Invalid API key was entered!`,
        orderUpdate: false,
        userID: Number(userID)
      });
      res.sendStatus(500);
    } else {
      console.log('problem updating api details', err);
      res.sendStatus(500);
    }
  }
});

/**
* POST route to factory reset the bot
*/
router.post('/ordersReset', rejectUnauthenticated, async (req, res) => {
  console.log('order reset route hit!');
  console.log(req.user.admin);
  if (req.user.admin) {
    const queryText = `DROP TABLE IF EXISTS "orders";
    CREATE TABLE IF NOT EXISTS "orders"
    (
      id character varying COLLATE pg_catalog."default" NOT NULL,
      "userID" integer,
      "API_ID" character varying,
      price numeric(32,8),
      size numeric(32,8),
      trade_pair_ratio numeric(32,8),
      side character varying COLLATE pg_catalog."default",
      pending boolean DEFAULT true,
      settled boolean DEFAULT false,
      flipped boolean DEFAULT false,
      will_cancel boolean DEFAULT false,
      reorder boolean DEFAULT false,
      include_in_profit boolean DEFAULT true,
      product_id character varying COLLATE pg_catalog."default",
      time_in_force character varying COLLATE pg_catalog."default",
      created_at timestamptz,
      done_at timestamptz,
      done_reason character varying COLLATE pg_catalog."default",
      fill_fees numeric(32,16),
      previous_fill_fees numeric(32,16),
      filled_size numeric(32,8),
      executed_value numeric(32,16),
      original_buy_price numeric(32,16),
      original_sell_price numeric(32,16),
      CONSTRAINT orders_pkey PRIMARY KEY (id)
    );`;
    let result = await pool.query(queryText);
    console.log('factory reset db call');
    res.sendStatus(200);
  } else {
    console.log(`you can't do that because you are not admin!`);
    res.sendStatus(403)
  }
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
  console.log('factory reset route hit!');
  console.log(req.user.admin);
  if (req.user.admin) {
    const queryText = `DROP TABLE IF EXISTS "orders";
    DROP TABLE IF EXISTS "user";
    DROP TABLE IF EXISTS "session";
    DROP TABLE IF EXISTS "user_api";
    DROP TABLE IF EXISTS "user_settings";
    DROP TABLE IF EXISTS "bot_settings";
    CREATE TABLE IF NOT EXISTS "user_api"
    (
      "API_ID" SERIAL PRIMARY KEY,
      "userID" integer,
      "CB_SECRET" VARCHAR (1000),
      "CB_ACCESS_KEY" VARCHAR (1000),
      "CB_ACCESS_PASSPHRASE" VARCHAR (1000),
      "API_URI" VARCHAR (1000),
      "bot_type" VARCHAR NOT NULL DEFAULT 'grid'
    );

    CREATE TABLE IF NOT EXISTS "user_settings"
    (
      "userID" integer,
      "paused" boolean DEFAULT false,
      "theme" character varying DEFAULT 'original',
      "reinvest" boolean DEFAULT false,
      "reinvest_ratio" integer DEFAULT 0,
      "max_trade" boolean DEFAULT false,
      "max_trade_size" numeric(32,8) DEFAULT 0,
      "profit_reset" timestamp
    );

    CREATE TABLE IF NOT EXISTS "bot_settings"
    (
      "loop_speed" integer DEFAULT 1,
      "maintenance" boolean DEFAULT false
    );
    INSERT INTO "bot_settings" 
      ("loop_speed")
      VALUES (1);

    CREATE TABLE IF NOT EXISTS "orders"
    (
      id character varying COLLATE pg_catalog."default" NOT NULL,
      "userID" integer,
      "API_ID" character varying,
      price numeric(32,8),
      size numeric(32,8),
      trade_pair_ratio numeric(32,8),
      side character varying COLLATE pg_catalog."default",
      pending boolean DEFAULT true,
      settled boolean DEFAULT false,
      flipped boolean DEFAULT false,
      will_cancel boolean DEFAULT false,
      reorder boolean DEFAULT false,
      include_in_profit boolean DEFAULT true,
      product_id character varying COLLATE pg_catalog."default",
      time_in_force character varying COLLATE pg_catalog."default",
      created_at timestamptz,
      done_at timestamptz,
      done_reason character varying COLLATE pg_catalog."default",
      fill_fees numeric(32,16),
      previous_fill_fees numeric(32,16),
      filled_size numeric(32,8),
      executed_value numeric(32,16),
      original_buy_price numeric(32,16),
      original_sell_price numeric(32,16),
      CONSTRAINT orders_pkey PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS "user" (
      "id" SERIAL PRIMARY KEY,
      "username" VARCHAR (80) UNIQUE NOT NULL,
      "password" VARCHAR (1000) NOT NULL,
      "active" boolean DEFAULT false,
      "admin" boolean DEFAULT false,
      "approved" boolean DEFAULT false,
      "will_delete" boolean DEFAULT false,
      "joined_at" timestamp
    );

    -- this will create the required table for connect-pg to store session data
    CREATE TABLE IF NOT EXISTS "session" (
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
