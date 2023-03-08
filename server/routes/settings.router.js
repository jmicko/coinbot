// const express = require('express');
import express from 'express';
const router = express.Router();
// const pool = require('../modules/pool');
import { pool } from '../modules/pool.js';
// const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
// const databaseClient = require('../modules/databaseClient');
import { databaseClient } from '../modules/databaseClient.js';
// const robot = require('../modules/robot');
import { robot } from '../modules/robot.js';
// const { cache, botSettings, cbClients, userStorage, messenger } = require('../modules/cache');
import { cache, botSettings, cbClients, userStorage, messenger } from '../modules/cache.js';
// const { sleep } = require('../../src/shared');
import { sleep } from '../../src/shared.js';
import { devLog } from '../modules/utilities.js';


/**
 * GET route for testing functions in development
 */
router.get('/test/:parmesan', rejectUnauthenticated, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    res.sendStatus(403);
    return;
  }

  const user = req.user;
  const userID = user.id
  // only admin can do this
  if (user.admin) {
    try {
      devLog(userID, 'test route hit');

      // get the current date converted to unix time in seconds
      const endDate = Math.round(new Date().getTime() / 1000);
      // const endDate = Math.round((new Date().getTime() - (1000 * 60 * 60 * 24 * 50)) / 1000);
      // const endDate = 1670_529_094
      // subtract 4 hours
      const startDate = endDate - (60 * 60 * 4);
      // const startDate = 1670_525_505
      // const startDate = 1672_578_875903
      // const startDate = 1672_539_84648400
      devLog(endDate);
      // get market candles
      const marketCandles = await cbClients[userID].getMarketCandles({
        product_id: 'BTC-USD',
        // start date in unix time
        start: startDate.toString(),
        // end date in unix time
        end: endDate.toString(),
        granularity: 'ONE_MINUTE'
      });

      devLog(startDate, endDate)

      devLog(marketCandles);



      res.sendStatus(200);
    } catch (err) {
      devLog(err, 'test route failed');
      res.sendStatus(500);
    }
  } else {
    devLog('user is not admin!');
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
      devLog('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    devLog('user is not admin!');
    res.sendStatus(403)
  }
});


/**
 * PUT route to change status of pause
 */
router.put('/pause', rejectUnauthenticated, async (req, res) => {
  devLog('pause route');
  const user = req.user;
  try {
    await databaseClient.setPause(!user.paused, user.id);

    await userStorage[user.id].update();

    // tell user to update user
    messenger[req.user.id].userUpdate();
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in PAUSE ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change theme
*/
router.put('/theme', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const theme = req.body.theme;
  devLog('theme route', theme);
  try {
    const queryText = `UPDATE "user_settings" SET "theme" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [theme, user.id]);
    await userStorage[user.id].update();
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in THEME ROUTE');
    res.sendStatus(500);
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
    devLog(err, 'error with tradeLoadMax route');
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
    devLog('profit_accuracy route hit', req.body);
    const queryText = `UPDATE "user_settings" SET "profit_accuracy" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [accuracy(), user.id]);
    await userStorage[user.id].update();
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'error with profit accuracy route');
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
    devLog('kill lock route hit', user);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in kill lock ROUTE');
    res.sendStatus(500);
  }
});

/**
 * PUT route to change number of trades to sync with coinbase
 */
router.put('/syncQuantity', rejectUnauthenticated, async (req, res) => {
  try {
    const user = req.user;
    let newQuantity = req.body.sync_quantity;
    // get the bot settings
    const bot = botSettings.get();
    devLog(bot.orders_to_sync, 'bot settings');
    if (newQuantity > bot.orders_to_sync) {
      newQuantity = bot.orders_to_sync;
    }
    if (newQuantity < 1) {
      newQuantity = 1;
    }
    devLog('syncQuantity route', user.username);
    const queryText = `UPDATE "user_settings" SET "sync_quantity" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [newQuantity, user.id]);
    await userStorage[user.id].update();
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'error with syncTrades route');
    res.sendStatus(500);
  }
});

/**
 * POST route to leave feedback or feature request
 */
router.post('/feedback', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const subject = req.body.subject;
  // const description = JSON.stringify(req.body.description);
  const description = req.body.description;
  devLog('feedback route', user.id, subject, description);

  // ensure that there is a subject and description, and that they are strings
  if (!subject || !description || typeof subject !== 'string' || typeof description !== 'string') {
    res.sendStatus(400);
    return;
  }

  try {
    // check if the user already has 5 feedbacks
    const queryTextCount = `SELECT COUNT(*) FROM "feedback" WHERE "user_id" = $1;`;
    const countResults = await pool.query(queryTextCount, [user.id]);
    devLog(countResults.rows[0].count, 'count of feedbacks');
    
    // if they do, send back a 403, else continue
    if (countResults.rows[0].count >= 5) {
      res.sendStatus(403);
      return;
    }
    
    
    // store the feedback in the database
    const queryText = `INSERT INTO "feedback" ("user_id", "subject", "description") VALUES ($1, $2, $3);`;

    await pool.query(queryText, [user.id, subject, description]);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'error with feedback route');
    res.sendStatus(500);
  }

});

/**
 * GET route to get old feedback
 * If user is admin, get feedback for all users. Otherwise, get feedback for the user
 */
router.get('/feedback', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const admin = req.user.admin;
  devLog('feedback route', user.id, admin);

  try {
    // check if the user is an admin
    if (admin) {
      // get all feedback, join with user table to get username
      // const queryText = `SELECT * FROM "feedback" ORDER BY "id" DESC;`;
      const queryText = `SELECT "feedback".*, "user"."username" FROM "feedback" JOIN "user" ON "feedback"."user_id" = "user"."id" ORDER BY "id" DESC;`;
      const results = await pool.query(queryText);
      // log each feedback description
      results.rows.forEach((feedback) => {
        devLog(feedback.description, 'feedback description');
      });
      
      res.send(results.rows);
    } else {
      // get feedback for the user
      const queryText = `SELECT * FROM "feedback" WHERE "user_id" = $1 ORDER BY "id" DESC;`;
      const results = await pool.query(queryText, [user.id]);
      res.send(results.rows);
    }
  } catch (err) {
    devLog(err, 'error with feedback route');
    res.sendStatus(500);
  }
});

/**
 * Delete route to delete feedback
 * If user is admin, can delete any feedback. Otherwise, can only delete their own feedback
 */
router.delete('/feedback/:id', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const admin = req.user.admin;
  const id = req.params.id;
  devLog('feedback route', user.id, admin, id);

  try {
    // check if the user is an admin
    if (admin) {
      // delete the feedback
      const queryText = `DELETE FROM "feedback" WHERE "id" = $1;`;

      const results = await pool.query(queryText, [id]);
      res.sendStatus(200);
    } else {
      // delete feedback for the user
      const queryText = `DELETE FROM "feedback" WHERE "id" = $1 AND "user_id" = $2;`;
      const results = await pool.query(queryText, [id, user.id]);
      res.sendStatus(200);
    }
  } catch (err) {
    devLog(err, 'error with feedback route');
    res.sendStatus(500);
  }
});



export default router;
