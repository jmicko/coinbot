const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot');
const coinbaseClient = require('../modules/coinbaseClient');
const cache = require('../modules/cache');


/**
 * GET route for testing functions in development
 */
router.get('/test', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const userID = user.id
  // only admin can do this
  if (user.admin) {
    try {
      console.log('test route hit');


      // const tradeDetails = {
      //   product_id: "BTC-EUR",
      //   side: "BUY",
      //   order_configuration: {
      //     market_market_ioc: {
      //       base_size: "0.0001"
      //     }
      //   }
      // };

      // const IDs = '';

      // const response = await coinbaseClient.placeOrderNew(userID, tradeDetails);
      const response = await coinbaseClient.getOrderNew(userID, '');
      // const response = await coinbaseClient.getProducts(userID);
      // const response = await coinbaseClient.cancelOrderNew(userID, [IDs]);
      // const response = await coinbaseClient.getOpenOrdersNew(userID);
      // const response = await databaseClient.getTradesByIDs(userID, IDs);
      // response.products.forEach(product => {
      //   if (product.new) {
          
      //   }
      //   console.log(product,'response');
        
      // });
      console.log(response, 'response from test');




      res.sendStatus(200);
    } catch (err) {
      console.log(err, 'test route failed');
      res.sendStatus(500);
    }
  } else {
    console.log('user is not admin!');
    res.sendStatus(403)
  }
});

/**
 * GET route getting all settings
 */
router.get('/', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  // only admin can do this
  if (user.admin) {
    try {
      const queryText = `SELECT * FROM "bot_settings";`;
      const results = await pool.query(queryText);
      res.send(results.rows[0]);
    } catch (err) {
      console.log('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    console.log('user is not admin!');
    res.sendStatus(403)
  }
});

/**
 * PUT route updating bot speed
 */
router.put('/loopSpeed', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const loopSpeed = req.body.loopSpeed;
  if (user.admin && loopSpeed <= 100 && loopSpeed >= 1) {
    try {
      const queryText = `UPDATE "bot_settings" SET "loop_speed" = $1;`;
      await pool.query(queryText, [loopSpeed]);

      botSettings = await databaseClient.getBotSettings();
      // console.log(botSettings);
      cache.setKey(0, 'botSettings', botSettings);

      res.sendStatus(200);
    } catch (err) {
      console.log('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    console.log('user is not admin!');
    res.sendStatus(403)
  }
});

/**
 * PUT route updating fullSync
 */
router.put('/fullSync', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let fullSync = Math.round(req.body.fullSync);

  if (fullSync < 1) {
    fullSync = 1;
  } else if (fullSync > 100) {
    fullSync = 100;
  }

  console.log('FULL SYNC', fullSync);

  if (user.admin && fullSync <= 100 && fullSync >= 1) {
    try {
      console.log('full_sync route hit', fullSync);
      const queryText = `UPDATE "bot_settings" SET "full_sync" = $1;`;
      await pool.query(queryText, [fullSync]);

      botSettings = await databaseClient.getBotSettings();
      // console.log(botSettings);
      cache.setKey(0, 'botSettings', botSettings);

      res.sendStatus(200);
    } catch (err) {
      console.log('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    console.log('user is not admin!');
    res.sendStatus(403)
  }
});

/**
 * PUT route updating orders_to_sync
 */
router.put('/orderSyncQuantity', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let orders_to_sync = Math.round(req.body.syncQuantity);

  if (orders_to_sync < 1) {
    orders_to_sync = 1;
  } else if (orders_to_sync > 200) {
    orders_to_sync = 200;
  }

  if (user.admin && orders_to_sync <= 200 && orders_to_sync >= 1) {
    try {
      const queryText = `UPDATE "bot_settings" SET "orders_to_sync" = $1;`;
      await pool.query(queryText, [orders_to_sync]);

      botSettings = await databaseClient.getBotSettings();
      // console.log(botSettings);
      cache.setKey(0, 'botSettings', botSettings);

      res.sendStatus(200);
    } catch (err) {
      console.log('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    if (!user.admin) {
      console.log('user is not admin!');
      res.sendStatus(403)
    } else {
      res.sendStatus(500)
    }
  }
});

/**
 * PUT route toggling maintenance mode
 */
router.put('/toggleMaintenance', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  if (user.admin) {
    try {
      await databaseClient.toggleMaintenance();
      robot.alertAllUsers('Toggling maintenance mode!');

      botSettings = await databaseClient.getBotSettings();
      // console.log(botSettings);
      cache.setKey(0, 'botSettings', botSettings);

      res.sendStatus(200);
    } catch (err) {
      console.log(err, 'error with toggleMaintenance route');
      res.sendStatus(500);
    }
  } else {
    console.log('user is not admin!');
    res.sendStatus(403)
  }
});

/**
 * PUT route setting Trade Load Max
 */
router.put('/tradeLoadMax', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "max_trade_load" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.max_trade_load, user.id]);
    await cache.refreshUser(user.id);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'error with tradeLoadMax route');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/postMaxReinvestRatio', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    console.log("postMaxReinvestRatio route hit", req.body);
    const queryText = `UPDATE "user_settings" SET "post_max_reinvest_ratio" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.postMaxReinvestRatio, user.id]);
    await cache.refreshUser(user.id);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in postMaxReinvestRatio ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to set reserve
*/
router.put('/reserve', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "reserve" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.reserve, user.id]);
    await cache.refreshUser(user.id);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in reserve ROUTE');
    res.sendStatus(500);
  }
});

/**
 * PUT route setting profit accuracy
 */
router.put('/profitAccuracy', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const accuracy = () => {
    if (req.body.profit_accuracy > 16) {
      return 16
    } else if (req.body.profit_accuracy < 0) {
      return 0
    } else {
      return Math.round(req.body.profit_accuracy)
    }
  }
  try {
    console.log('profit_accuracy route hit', req.body);
    const queryText = `UPDATE "user_settings" SET "profit_accuracy" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [accuracy(), user.id]);
    await cache.refreshUser(user.id);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'error with profit accuracy route');
    res.sendStatus(500);
  }
});

/**
 * PUT route to change status of kill_lock
 */
router.put('/killLock', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    databaseClient.setKillLock(!user.kill_locked, user.id);
    await cache.refreshUser(user.id);
    console.log('kill lock route hit', user);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in kill lock ROUTE');
    res.sendStatus(500);
  }
});

/**
 * PUT route bulk updating trade pair ratio
 */
router.put('/bulkPairRatio', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const userID = req.user.id;
  const previousPauseStatus = req.user.paused;
  const bulk_pair_ratio = req.body.bulk_pair_ratio;
  try {
    // pause trading before cancelling all orders or it will reorder them before done, making it take longer
    await databaseClient.setPause(true, userID);
    await cache.refreshUser(user.id);

    // wait 5 seconds to give the sync loop more time to finish
    await robot.sleep(5000);

    // update the trade-pair ratio for all trades for that user
    const updateTradesQueryText = `UPDATE orders
    SET "trade_pair_ratio" = $1
    WHERE "settled" = false AND "userID" = $2;`

    await pool.query(updateTradesQueryText, [
      bulk_pair_ratio,
      user.id
    ]);

    // update original sell price after ratio is set
    const updateOGSellPriceQueryText = `UPDATE orders
    SET "original_sell_price" = ROUND(((original_buy_price * ("trade_pair_ratio" + 100)) / 100), 2)
    WHERE "settled" = false AND "userID" = $1;`

    await pool.query(updateOGSellPriceQueryText, [
      user.id
    ]);

    // need to update the current price on all sells after changing numbers on all trades
    const updateSellsPriceQueryText = `UPDATE orders
    SET "price" = "original_sell_price"
    WHERE "side" = 'sell' AND "userID" = $1;`;

    await pool.query(updateSellsPriceQueryText, [user.id]);

    // Now cancel all trades so they can be reordered with the new numbers
    // mark all open orders as reorder
    await databaseClient.setReorder(userID);

    // cancel all orders. The sync loop will take care of replacing them
    await coinbaseClient.cancelAllOrders(userID);

    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID);
    await cache.refreshUser(user.id);

    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'error with bulk updating trade pair ratio route');
    res.sendStatus(500);
  }
});

/**
* POST route to reset the orders table
*/
router.post('/ordersReset', rejectUnauthenticated, async (req, res) => {
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
      flipped_at timestamptz,
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
    CREATE INDEX reorders
    ON "orders" ("side", "flipped", "will_cancel", "userID", "settled");`;
    await pool.query(queryText);
    res.sendStatus(200);
  } else {
    res.sendStatus(403)
  }
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
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
      "kill_locked" boolean DEFAULT false,
      "theme" character varying DEFAULT 'original',
      "reinvest" boolean DEFAULT false,
      "reinvest_ratio" integer DEFAULT 0,
      "post_max_reinvest_ratio" integer DEFAULT 0,
      "reserve" numeric(32,8) DEFAULT 0,
      "maker_fee" numeric(32,8) DEFAULT 0,
      "taker_fee" numeric(32,8) DEFAULT 0,
      "usd_volume" numeric(32,8) DEFAULT 0,
      "available_btc" numeric(32,16) DEFAULT 0,
      "available_usd" numeric(32,16) DEFAULT 0,
      "actualavailable_btc" numeric(32,16) DEFAULT 0,
      "actualavailable_usd" numeric(32,16) DEFAULT 0,
      "max_trade" boolean DEFAULT false,
      "max_trade_size" numeric(32,8) DEFAULT 0,
      "max_trade_load" integer DEFAULT 1000,
      "profit_accuracy" integer DEFAULT 16,
      "auto_setup_number" integer DEFAULT 1,
      "profit_reset" timestamp
    );

    CREATE TABLE IF NOT EXISTS "bot_settings"
    (
      "loop_speed" integer DEFAULT 1,
      "orders_to_sync" integer DEFAULT 100,
      "full_sync" integer DEFAULT 10,
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
      flipped_at timestamptz,
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

    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    CREATE INDEX "IDX_session_expire" ON "session" ("expire");

    CREATE INDEX reorders
    ON "orders" ("side", "flipped", "will_cancel", "userID", "settled");`;
    await pool.query(queryText);
    res.sendStatus(200);
  } else {
    res.sendStatus(403)
  }
});

module.exports = router;
