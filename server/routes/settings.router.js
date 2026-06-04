// const express = require('express');
import express from 'express';
const router = express.Router();
import { pool } from '../modules/pool.js';
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
import { databaseClient } from '../modules/databaseClient.js';
import { botSettings, cbClients, userStorage, messenger } from '../modules/runtime/index.js';
import { devLog } from '../modules/utilities.js';

/**
 * GET route for testing connection to server. No auth required
 */
router.get('/connection', async (req, res) => {
  try {
    const user = req.user ? true : false;
    // devLog(user, 'connection route hit');
    // devLog('connection route hit');
    res.status(200).send({ connection: true, loggedIn: user });
  } catch (err) {
    devLog(err, 'connection route failed');
    res.sendStatus(500);
  }
});

/**
 * GET route for checking if registration is open
 * No auth required
 */



router.get('/registration', async (req, res) => {
  try {
    let open = await databaseClient.getRegistrationOpen();

    const admins = await databaseClient.getAdminCount();
    if (admins === 0) {
      open = true;
    };
    res.status(200).send({ registrationOpen: open });
  } catch (err) {
    devLog(err, 'error with registration route');
    res.sendStatus(500);
  }
});


/**
 * GET route for testing functions in development
 */
router.get('/test/:parmesan', rejectUnauthenticated, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    res.sendStatus(403);
    return;
  }

  const user = req.user;
  const userID = user.id;
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

      // devLog(startDate, endDate)

      // devLog(marketCandles);



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
  devLog('get all settings route hit', user.admin);
  // only admin can do this
  if (user.admin) {
    try {
      const settings = await databaseClient.getBotSettings();
      devLog('settings', settings);
      res.send(settings);
    } catch (err) {
      devLog('error with get all settings route', err);
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
  try {
    devLog('pause route');
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    await databaseClient.setPause(!user.paused, user.id);

    console.log('pause route', user.id, identifier);

    await userStorage.refreshUser(user.id, identifier);

    // tell user to update user
    // messenger[req.user.id].userUpdate(identifier);
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
  try {
    const user = req.user;
    const theme = req.body.theme;
    const identifier = req.headers['x-identifier'];
    devLog('theme route', theme);
    await databaseClient.updateTheme(theme, user.id);
    await userStorage.refreshUser(user.id, identifier);
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
  try {
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    const maxTradeLoad = req.body.max_trade_load;
    await databaseClient.updateTradeLoadMax(maxTradeLoad, user.id);
    await userStorage.refreshUser(user.id, identifier);
    // update orders on client
    messenger[user.id].newMessage({
      type: 'general',
      text: `Max trades to load updated to ${maxTradeLoad}`,
      orderUpdate: true,
      identifier: identifier
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
  try {
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    // const accuracy = () => {
    //   if (req.body.profit_accuracy > 16) {
    //     return 16
    //   } else if (req.body.profit_accuracy < 0) {
    //     return 0
    //   } else {
    //     return Math.round(req.body.profit_accuracy)
    //   }
    // }
    const accuracy = Math.round(Math.min(Math.max(req.body.profit_accuracy, 0), 16));
    devLog('profit_accuracy route hit', req.body);
    await databaseClient.updateProfitAccuracy(accuracy, user.id);
    await userStorage.refreshUser(user.id, identifier);
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
  try {
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    await databaseClient.setKillLock(!user.kill_locked, user.id);
    await userStorage.refreshUser(user.id, identifier);
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
    const identifier = req.headers['x-identifier'];
    let qty = req.body.sync_quantity;
    // get the bot settings
    const bot = botSettings.get();
    devLog(bot.orders_to_sync, 'bot settings');
    if (qty > bot.orders_to_sync) {
      qty = bot.orders_to_sync;
    }
    if (qty < 1) {
      qty = 1;
    }
    devLog('syncQuantity route', user.username);
    await databaseClient.updateSyncQuantity(qty, user.id);
    await userStorage.refreshUser(user.id, identifier);
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
  const admin = req.user.admin;
  const subject = req.body.subject;
  // const description = JSON.stringify(req.body.description);
  const description = req.body.description;

  devLog('feedback route', user.id, subject, description);

  // ensure that there is a subject and description, and that they are strings
  if (!subject || !description || typeof subject !== 'string' || typeof description !== 'string') {
    res.sendStatus(400);
    return;
  }

  // verify that the subject and description are less than 5000 characters
  if (subject.length > 5000 || description.length > 5000) {
    res.sendStatus(400);
    return;
  }


  try {
    // check if the user already has 5 feedbacks
    const count = await databaseClient.getFeedbackCount(user.id);
    devLog(count, 'count of feedbacks');

    // if they do, send back a 403, else continue
    // admin can make unlimited feedbacks
    if (count >= 5 && !admin) {
      res.sendStatus(403);
      return;
    }


    // store the feedback in the database
    await databaseClient.storeFeedback(user.id, subject, description);

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
      const results = await databaseClient.getFeedbackForAllUsers();

      res.send(results.rows);
    } else {
      // get feedback for the user
      const results = await databaseClient.getFeedbackForUser(user.id);
      res.send(results);
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
      await databaseClient.deleteFeedback(id);
      res.sendStatus(200);
    } else {
      // delete feedback for the user
      await databaseClient.deleteSingleFeedbackForUser(user.id, id);
      res.sendStatus(200);
    }
  } catch (err) {
    devLog(err, 'error with feedback route');
    res.sendStatus(500);
  }
});



export default router;
