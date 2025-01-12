import express from 'express';
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
import { pool } from '../modules/pool.js';
import { robot } from '../modules/robot.js';
import { databaseClient } from '../modules/databaseClient.js';
import { userStorage, messenger, botSettings } from '../modules/cache.js';
import { devLog } from '../modules/utilities.js';

const router = express.Router();

/**
* GET all user information if user is authenticated and admin
*/
router.get('/users', rejectUnauthenticated, async (req, res) => {
  devLog('get all users route');
  const isAdmin = req.user.admin;
  if (!isAdmin) {
    res.sendStatus(403);
    return;
  }
  try {
    const userList = await databaseClient.getAllUserAndSettings();
    res.send(userList);
  } catch (err) {
    devLog('error sending list of users to admin', err);
    res.sendStatus(500)
  }
});


/**
* GET route to log status of a user's loop
*/
router.get('/debug/:user_id', rejectUnauthenticated, async (req, res) => {
  const userID = req.params.user_id;
  if (req.user.admin) {
    try {
      const userInfo = userStorage[userID].getUser()
      const userErrors = messenger[userID].getErrors();
      // devLog('debug - full storage', userInfo);
      // devLog('errors', userErrors);
      userInfo.userID !== null
        ? res.send(userInfo).status(200)
        : res.sendStatus(500);
    } catch (err) {
      devLog(err, 'problem debug route');
      res.sendStatus(500)
    }
  } else {
    devLog('error debug user route - not admin');
    res.sendStatus(403);
  }
});


/**
* POST route to reset the orders table
*/
router.post('/ordersReset', rejectUnauthenticated, async (req, res) => {
  res.sendStatus(500);
  return;
  // look man, I probably never should have built this route in the first place
  // but it was so useful for testing and I'm too lazy to delete it
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
      devLog(err, 'error resetting orders table');
    }
  } else {
    res.sendStatus(403)
  }
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
  res.sendStatus(500);
  return;
  // This one is even worse but I was young and naive and it's nice when you're testing
  // Could I comment out the entire thing? 
  // Sure, but then I would have to select while scrolling and that's just too much work
  // Thanks for understanding <3
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
      //   devLog('refreshing user', user);
      //   if (user.user && user.user?.id !== 0) {
      //     await userStorage[user.id].update();
      //   }
      // })
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
      devLog(err, 'error factory resetting');
    }
  } else {
    res.sendStatus(403)
  }
});

/**
* PUT route - Approve a single user. Only admin can do this
*/
router.put('/users', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      const userToApprove = req.body.id;
      devLog('in approve user route', userToApprove);
      const queryText = `UPDATE "user" SET "approved" = true WHERE "id" = $1 RETURNING *;`;
      const user = await pool.query(queryText, [userToApprove]);
      userStorage[userToApprove].approve(true);
      res.sendStatus(200);
    } else {
      devLog('you are NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    devLog(err, 'error in approve put route');
    res.sendStatus(500);
  }
});

/**
 * PUT route - changes chat permissions for a single user. Only admin can do this
 */
router.put('/users/chat', rejectUnauthenticated, async (req, res) => {
  try {
    devLog('in chat permission route');
    const isAdmin = req.user.admin;
    if (!isAdmin) {
      devLog('you are NOT admin');
      res.sendStatus(403);
      return;
    }
    const userToChange = req.body.id;
    const chatPermission = req.body.chatPermission;
    devLog('in chat permission route', userToChange, chatPermission);
    const queryText = `UPDATE "user_settings" SET "can_chat" = $1 WHERE "userID" = $2 RETURNING *;`;
    await pool.query(queryText, [chatPermission, userToChange]);
    
    userStorage[userToChange].update();
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'error in chat permission put route');
    res.sendStatus(500);
  }
});



/**
 * PUT route updating bot speed
 */
router.put('/loop_speed', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let loopSpeed = req.body.loopSpeed;
  if (!user.admin) {
    devLog('user is not admin!');
    res.sendStatus(403)
    return;
  }

  if (loopSpeed > 1000) {
    loopSpeed = 1000;
  } else if (loopSpeed < 1) {
    loopSpeed = 1;
  }

  // if (loopSpeed <= 1000 && loopSpeed >= 1) {
  if (!(loopSpeed <= 1000) || !(loopSpeed >= 1)) {
    devLog(loopSpeed, 'invalid parameters');
    res.status(500).send('invalid parameters!')
    return;
  }
  try {
    devLog('loop speed route hit', loopSpeed);
    const queryText = `UPDATE "bot_settings" SET "loop_speed" = $1;`;
    await pool.query(queryText, [loopSpeed]);

    // botSettings = await databaseClient.getBotSettings();
    botSettings.change({ loop_speed: loopSpeed })

    devLog(botSettings, 'bot settings after change');

    res.sendStatus(200);
  } catch (err) {
    devLog('error with loop speed route', err);
    res.sendStatus(500);
  }
});


/**
 * PUT route updating fullSync
 */
router.put('/full_sync', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let fullSync = Math.round(req.body.fullSync);

  if (fullSync < 1) {
    fullSync = 1;
  } else if (fullSync > 100) {
    fullSync = 100;
  }

  devLog('FULL SYNC', fullSync);

  if (user.admin && fullSync <= 100 && fullSync >= 1) {
    try {
      devLog('full_sync route hit', fullSync);
      // set the settings in the cache first
      botSettings.change({ full_sync: fullSync })
      // then save to db
      const queryText = `UPDATE "bot_settings" SET "full_sync" = $1;`;
      await pool.query(queryText, [fullSync]);


      res.sendStatus(200);
    } catch (err) {
      devLog('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    devLog('user is not admin!');
    res.sendStatus(403)
  }
});


/**
 * PUT route updating orders_to_sync
 */
router.put('/order_sync_quantity', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let orders_to_sync = Math.round(req.body.syncQuantity);

  if (orders_to_sync < 1) {
    orders_to_sync = 1;
  } else if (orders_to_sync > 200) {
    orders_to_sync = 200;
  }

  if (user.admin && orders_to_sync <= 200 && orders_to_sync >= 1) {
    // get a client for the transaction
    const client = await pool.connect();
    try {
      // save to cache
      botSettings.change({ orders_to_sync: orders_to_sync })
      // save to db
      const queryTextBot = `UPDATE "bot_settings" SET "orders_to_sync" = $1;`;
      const queryTextUsers = `UPDATE "user_settings" SET "sync_quantity" = $1
      WHERE "sync_quantity" > $1;`


      // await pool.query(queryTextBot, [orders_to_sync]);

      // start a transaction
      await client.query('BEGIN');
      // update bot settings
      await client.query(queryTextBot, [orders_to_sync]);
      // update user settings
      await client.query(queryTextUsers, [orders_to_sync]);
      // commit the transaction
      await client.query('COMMIT');

      res.sendStatus(200);
      // update orders on client for all users
      userStorage.getAllUsers().forEach(userID => {
        // update orders on client
        messenger[userID].newMessage({
          userUpdate: true
        })
      })
    } catch (err) {
      // rollback the transaction
      await client.query('ROLLBACK');

      devLog('error with sync quantity route', err);
      res.sendStatus(500);
    } finally {
      // release the client
      client.release();
    }
  } else {
    if (!user.admin) {
      devLog('user is not admin!');
      res.sendStatus(403)
    } else {
      res.sendStatus(500)
    }
  }
});


/**
 * PUT route toggling maintenance mode
 */
router.put('/maintenance', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  console.log('maintenance route hit');
  if (user.admin) {
    try {
      await databaseClient.toggleMaintenance();
      robot.alertAllUsers('Toggling maintenance mode!');

      // refresh cache
      botSettings.refresh()

      res.sendStatus(200);
    } catch (err) {
      devLog(err, 'error with toggleMaintenance route');
      res.sendStatus(500);
    }
  } else {
    devLog('user is not admin!');
    res.sendStatus(403)
  }
});


/**
 * PUT route toggling registration
 */
router.put('/registration', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      await databaseClient.toggleRegistration();
      botSettings.refresh()
      res.sendStatus(200);
    } else {
      devLog('user is NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    devLog(err, 'error with toggleRegistration route');
    res.sendStatus(500);
    
  }
});


/**
* DELETE route - Delete a single user. Only admin can do this
*/
router.delete('/users/:user_id', rejectUnauthenticated, async (req, res) => {
  const userToDelete = req.params.user_id;
  const userID = req.user.id;
  try {
    devLog('in delete user route');
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      // delete from user table first
      const userQueryText = `DELETE from "user" WHERE "id" = $1;`;
      await pool.query(userQueryText, [userToDelete]);

      // delete from API table 
      const apiQueryText = `DELETE from "user_api" WHERE "userID" = $1;`;
      await pool.query(apiQueryText, [userToDelete]);

      // delete from orders table 
      const ordersQueryText = `DELETE from "limit_orders" WHERE "userID" = $1;`;
      await pool.query(ordersQueryText, [userToDelete]);

      // delete from user settings table 
      const userSettingsQueryText = `DELETE from "user_settings" WHERE "userID" = $1;`;
      await pool.query(userSettingsQueryText, [userToDelete]);

      res.sendStatus(200);
    } else {
      // const userToDelete = req.body.id;
      devLog('you are NOT admin');
      // check to make sure the user ID that was sent is the same as the user requesting the delete

      res.sendStatus(403); // forbidden
    }
  } catch (err) {
    devLog(err, 'error in delete user route');
    res.sendStatus(500);
  } finally {
    userStorage.deleteUser(userToDelete);


  }
});

export default router;
