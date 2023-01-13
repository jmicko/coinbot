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
 * PUT route to change status of pause
 */
router.put('/pause', rejectUnauthenticated, async (req, res) => {
  console.log('pause route');
  const user = req.user;
  try {
    await databaseClient.setPause(!user.paused, user.id);

    await userStorage[user.id].update();

    // tell user to update user
    messenger[req.user.id].userUpdate();
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in PAUSE ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change theme
*/
router.put('/theme', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  const theme = req.body.theme;
  console.log('theme route', theme);
  try {
    const queryText = `UPDATE "user_settings" SET "theme" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [theme, user.id]);
    await userStorage[user.id].update();
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in THEME ROUTE');
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
    console.log(err, 'error with tradeLoadMax route');
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



module.exports = router;
