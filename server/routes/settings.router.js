const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');
const { cache, botSettings, cbClients, userStorage, messenger } = require('../modules/cache');
const { sleep } = require('../../src/shared');


/**
 * GET route for testing functions in development
 */
router.get('/test/:parmesan', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const userID = user.id
  // only admin can do this
  if (user.admin) {
    try {
      console.log(userID, 'test route hit');

      // get the current date converted to unix time in seconds
      const endDate = Math.round(new Date().getTime() / 1000);
      // const endDate = Math.round((new Date().getTime() - (1000 * 60 * 60 * 24 * 50)) / 1000);
      // const endDate = 1670_529_094
      // subtract 4 hours
      const startDate = endDate - (60 * 60 * 4);
      // const startDate = 1670_525_505
      // const startDate = 1672_578_875903
      // const startDate = 1672_539_84648400
      console.log(endDate);
      // get market candles
      const marketCandles = await cbClients[userID].getMarketCandles({
        product_id: 'BTC-USD',
        // start date in unix time
        start: startDate.toString(),
        // end date in unix time
        end: endDate.toString(),
        granularity: 'ONE_MINUTE'
      });

      console.log(startDate, endDate)

      console.log(marketCandles);



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
  if (user.admin) {
    if (loopSpeed <= 1000 && loopSpeed >= 1) {

      try {
        const queryText = `UPDATE "bot_settings" SET "loop_speed" = $1;`;
        await pool.query(queryText, [loopSpeed]);

        // botSettings = await databaseClient.getBotSettings();
        botSettings.change({ loop_speed: loopSpeed })

        console.log(botSettings);

        res.sendStatus(200);
      } catch (err) {
        console.log('error with loop speed route', err);
        res.sendStatus(500);
      }
    } else {
      console.log('invalid parameters');
      res.status(500).send('invalid parameters!')
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
      // set the settings in the cache first
      botSettings.change({ full_sync: fullSync })
      // then save to db
      const queryText = `UPDATE "bot_settings" SET "full_sync" = $1;`;
      await pool.query(queryText, [fullSync]);


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
      // save to cache
      botSettings.change({ orders_to_sync: orders_to_sync })
      // save to db
      const queryText = `UPDATE "bot_settings" SET "orders_to_sync" = $1;`;
      await pool.query(queryText, [orders_to_sync]);

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

      // refresh cache
      botSettings.refresh()

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
    await userStorage[user.id].update();
    // update orders on client
    messenger[user.id].newMessage({
      type: 'general',
      text: `Max trades to load updated to ${req.body.max_trade_load}`,
      orderUpdate: true
    })
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
    await userStorage[user.id].update();
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
    await userStorage[user.id].update();
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
    await userStorage[user.id].update();
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
    await userStorage[user.id].update();
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
    await userStorage[user.id].update();

    // wait 5 seconds to give the sync loop more time to finish
    await sleep(5000);

    // update the trade-pair ratio for all trades for that user
    const updateTradesQueryText = `UPDATE limit_orders
    SET "trade_pair_ratio" = $1
    WHERE "settled" = false AND "userID" = $2;`

    await pool.query(updateTradesQueryText, [
      bulk_pair_ratio,
      user.id
    ]);

    // update original sell price after ratio is set
    const updateOGSellPriceQueryText = `UPDATE limit_orders
    SET "original_sell_price" = ROUND(((original_buy_price * ("trade_pair_ratio" + 100)) / 100), 2)
    WHERE "settled" = false AND "userID" = $1;`

    await pool.query(updateOGSellPriceQueryText, [
      user.id
    ]);

    // need to update the current price on all sells after changing numbers on all trades
    const updateSellsPriceQueryText = `UPDATE limit_orders
    SET "limit_price" = "original_sell_price"
    WHERE "side" = 'SELL' AND "userID" = $1;`;

    await pool.query(updateSellsPriceQueryText, [user.id]);

    // Now cancel all trades so they can be reordered with the new numbers
    // mark all open orders as reorder
    await databaseClient.setReorder(userID);

    let openOrders = await databaseClient.getLimitedUnsettledTrades(userID, botSettings.orders_to_sync);

    if (openOrders.length > 0) {
      // build an array of just the IDs that should be set to reorder
      const idArray = [];
      for (let i = 0; i < openOrders.length; i++) {
        const order = openOrders[i];
        idArray.push(order.order_id)
      } //end for loop

      // cancel all orders. The sync loop will take care of replacing them
      await cbClients[userID].cancelOrders(idArray);
    }

    // set pause status to what it was before route was hit
    await databaseClient.setPause(previousPauseStatus, userID);
    await userStorage[user.id].update();
    // update orders on client
    messenger[userID].newMessage({
      type: 'general',
      text: `Bulk trade pair ratio updated to ${bulk_pair_ratio}`,
      orderUpdate: true
    })

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
    const queryText = `DROP TABLE IF EXISTS "limit_orders";
    DROP TABLE IF EXISTS "orders";
    CREATE TABLE IF NOT EXISTS "limit_orders"
    (
      order_id character varying COLLATE pg_catalog."default" NOT NULL,

      "userID" integer,
      original_buy_price numeric(32,16),
      original_sell_price numeric(32,16),
      trade_pair_ratio numeric(32,8),
      flipped boolean DEFAULT false,
      flipped_at timestamptz,
      filled_at timestamptz,
      reorder boolean DEFAULT false,
      include_in_profit boolean DEFAULT true,
      will_cancel boolean DEFAULT false,

      product_id character varying COLLATE pg_catalog."default",
      coinbase_user_id character varying COLLATE pg_catalog."default",
      base_size numeric(32,8),
      limit_price numeric(32,8),
      post_only boolean,
      side character varying COLLATE pg_catalog."default",
      client_order_id character varying COLLATE pg_catalog."default",
      next_client_order_id character varying COLLATE pg_catalog."default",
      "status" character varying COLLATE pg_catalog."default",
      time_in_force character varying COLLATE pg_catalog."default",
      created_time timestamptz,
      completion_percentage numeric(32,8),
      filled_size numeric(32,8),
      average_filled_price numeric(32,8),
      fee numeric(32,8),
      number_of_fills numeric(32,8),
      filled_value numeric(32,8),
      pending_cancel boolean,
      size_in_quote boolean,
      total_fees numeric(32,16),
      previous_total_fees numeric(32,16),
      size_inclusive_of_fees boolean,
      total_value_after_fees numeric(32,16),
      trigger_status character varying COLLATE pg_catalog."default",
      order_type character varying COLLATE pg_catalog."default",
      reject_reason character varying COLLATE pg_catalog."default",
      settled boolean DEFAULT false,
      product_type character varying COLLATE pg_catalog."default",
      reject_message character varying COLLATE pg_catalog."default",
      cancel_message character varying COLLATE pg_catalog."default",

      CONSTRAINT orders_pkey PRIMARY KEY (order_id)
    );
    CREATE INDEX reorders
    ON "limit_orders" ("side", "flipped", "will_cancel", "userID", "settled");`;
    try {
      await pool.query(queryText);
      res.sendStatus(200);
      // update orders on client for all users
      userStorage.getAllUsers().forEach(userID => {
        // update orders on client
        messenger[userID].newMessage({
          type: 'general',
          text: `Orders table reset`,
          orderUpdate: true
        })
      })
    } catch (err) {
      res.sendStatus(500);
      console.log(err, 'error resetting orders table');
    }
  } else {
    res.sendStatus(403)
  }
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
  if (req.user.admin) {
    const queryText = `DROP TABLE IF EXISTS "limit_orders";
    DROP TABLE IF EXISTS "orders";
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
    CREATE TABLE IF NOT EXISTS "limit_orders"
    (
      order_id character varying COLLATE pg_catalog."default" NOT NULL,

      "userID" integer,
      original_buy_price numeric(32,16),
      original_sell_price numeric(32,16),
      trade_pair_ratio numeric(32,8),
      flipped boolean DEFAULT false,
      flipped_at timestamptz,
      filled_at timestamptz,
      reorder boolean DEFAULT false,
      include_in_profit boolean DEFAULT true,
      will_cancel boolean DEFAULT false,
    
      product_id character varying COLLATE pg_catalog."default",
      coinbase_user_id character varying COLLATE pg_catalog."default",
      base_size numeric(32,8),
      limit_price numeric(32,8),
      post_only boolean,
      side character varying COLLATE pg_catalog."default",
      client_order_id character varying COLLATE pg_catalog."default",
      next_client_order_id character varying COLLATE pg_catalog."default",
      "status" character varying COLLATE pg_catalog."default",
      time_in_force character varying COLLATE pg_catalog."default",
      created_time timestamptz,
      completion_percentage numeric(32,8),
      filled_size numeric(32,8),
      average_filled_price numeric(32,8),
      fee numeric(32,8),
      number_of_fills numeric(32,8),
      filled_value numeric(32,8),
      pending_cancel boolean,
      size_in_quote boolean,
      total_fees numeric(32,16),
      previous_total_fees numeric(32,16),
      size_inclusive_of_fees boolean,
      total_value_after_fees numeric(32,16),
      trigger_status character varying COLLATE pg_catalog."default",
      order_type character varying COLLATE pg_catalog."default",
      reject_reason character varying COLLATE pg_catalog."default",
      settled boolean DEFAULT false,
      product_type character varying COLLATE pg_catalog."default",
      reject_message character varying COLLATE pg_catalog."default",
      cancel_message character varying COLLATE pg_catalog."default",
    
      -- price numeric(32,8),
      -- size numeric(32,8),
      -- pending boolean DEFAULT true,
      -- created_at timestamptz,
      -- done_at timestamptz,
      -- done_reason character varying COLLATE pg_catalog."default",
      -- fill_fees numeric(32,16),
      -- previous_fill_fees numeric(32,16),
      -- executed_value numeric(32,16),
      -- "API_ID" character varying,
      CONSTRAINT orders_pkey PRIMARY KEY (order_id)
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
    CREATE INDEX "IDX_session_expire" ON "session" ("expire");
    
    -- this will index the orders table so it is much faster to look for reorders and unsettled trades
    CREATE INDEX reorders
    ON "limit_orders" ("side", "flipped", "will_cancel", "userID", "settled");`;
    try {
      await pool.query(queryText);

      // cache.storage.forEach(async user => {
      //   console.log('refreshing user', user);
      //   if (user.user && user.user?.id !== 0) {
      //     await userStorage[user.id].update();
      //   }
      // })
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
      console.log(err, 'error factory resetting');
    }
  } else {
    res.sendStatus(403)
  }
});

module.exports = router;
