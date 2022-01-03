const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot');
const coinbaseClient = require('../modules/coinbaseClient');


/**
 * GET route getting all settings
 */
router.get('/', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const user = req.user;
  if (user.admin) {
    console.log('GET all settings route hit!');
    try {

      const queryText = `SELECT * FROM "bot_settings";`;

      const results = await pool.query(queryText);
      console.log('results of GET ALL SETTINGS', results.rows[0]);

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
  // POST route code here
  const user = req.user;
  const loopSpeed = req.body.loopSpeed;
  if (user.admin && loopSpeed <= 100 && loopSpeed >= 1) {
    console.log('loop speed route hit! SPEED:', loopSpeed);
    try {

      const queryText = `UPDATE "bot_settings" SET "loop_speed" = $1;`;

      await pool.query(queryText, [loopSpeed]);

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
 * PUT route bulk updating trade pair ratio
 */
router.put('/bulkPairRatio', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const user = req.user;
  // console.log("user is", user);
  const bulk_pair_ratio = req.body.bulk_pair_ratio;
  console.log('bulk updating trade pair ratio route hit!', bulk_pair_ratio);
  try {

    const newbulk_pair_ratio = Number(bulk_pair_ratio);

    const updateTradesQueryText = `UPDATE orders
    SET "trade_pair_ratio" = $1
    WHERE "settled" = false AND "userID" = $2;`

    await pool.query(updateTradesQueryText, [
      bulk_pair_ratio,
      user.id
    ]);

    // update original sell price after ratio is set
    const updateOGSellPriceQueryText = `UPDATE orders
    SET original_sell_price = ROUND(((original_buy_price * ("trade_pair_ratio" + 100)) / 100), 2)
    WHERE "settled" = false AND "userID" = $1;`

    await pool.query(updateOGSellPriceQueryText, [
      user.id
    ]);

    // need to update the current price on all sells after changing numbers on all trades
    const updateSellsPriceQueryText = `UPDATE orders
    SET "price" = "original_sell_price"
    WHERE "side" = 'sell' AND "userID" = $1;`;

    await pool.query(updateSellsPriceQueryText, [

      user.id
    ]);

    // Now cancel all trades so they can be reordered with the new numbers

    coinbaseClient.cancelAllOrders(user.id);

    res.sendStatus(200);
  } catch (err) {
    console.log('error with bulk updating trade pair ratio route', err);
    res.sendStatus(500);
  }
});



module.exports = router;
