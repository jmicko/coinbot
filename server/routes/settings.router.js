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


module.exports = router;
