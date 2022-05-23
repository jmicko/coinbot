const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const coinbaseClient = require('../modules/coinbaseClient');
const socketClient = require('../modules/socketClient');
const xlsx = require('json-as-xlsx');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');
const cache = require('../modules/cache');
// const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * GET route to get all accounts info
 */
router.get('/', async (req, res) => {

  const user = req.user;
  const userID = req.user.id;
  // user needs to be active or they will not have an API key to use
  if (user.active) {
    try {
      let accounts = await coinbaseClient.getAccounts(userID);
      let spentUSD = await databaseClient.getSpentUSD(userID);

      res.send(
        {
          accounts: accounts,
          spentUSD: spentUSD
        }
      );
    }
    catch (err) {
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
        console.log(err, 'error getting accounts:');
      }
      res.sendStatus(500)
    }
  } else {
    res.sendStatus(404)
  }
});


/**
* GET route to get total profit estimate
*/
router.get('/profits', rejectUnauthenticated, async (req, res) => {
  // console.log('profits get route');
  const userID = req.user.id;

  try {
    // console.log('update funds before profits');
    await robot.updateFunds(userID)
  } catch (err) {
    console.log(err, 'problem updating funds in account/profits route');
  }

  // for sum since a day ago
  const lastDayQueryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" + "previous_fill_fees")) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true' AND "userID" = $1 AND "done_at" > now() - interval '1 day';`;
  // for sum since a week ago
  const lastWeekQueryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" + "previous_fill_fees")) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true' AND "userID" = $1 AND "done_at" > now() - interval '1 week';`;
  // for sum since 30 days ago
  const lastThirtyDayQueryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" + "previous_fill_fees")) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true' AND "userID" = $1 AND "done_at" > now() - interval '30 day';`;
  // // for sum since reset
  const sinceResetQueryText = `SELECT SUM(("original_sell_price" * "size") - ("original_buy_price" * "size") - ("fill_fees" + "previous_fill_fees")) 
  FROM public.orders 
  WHERE "side" = 'sell' AND "settled" = 'true' AND "include_in_profit" = 'true' AND "userID" = $1;`;
  try {

    let profits = [];

    let dayResult = await pool.query(lastDayQueryText, [userID]);
    let weekResult = await pool.query(lastWeekQueryText, [userID]);
    let monthResult = await pool.query(lastThirtyDayQueryText, [userID]);
    let sinceResetResult = await pool.query(sinceResetQueryText, [userID]);

    profits.push(dayResult.rows[0]);
    profits.push(weekResult.rows[0]);
    profits.push(monthResult.rows[0]);
    profits.push(sinceResetResult.rows[0]);
    res.send(profits);
  } catch (err) {
    console.log(err, 'error in profits route:');
    res.sendStatus(500)
  }
});

/**
* GET route to export xlsx history of orders
*/
router.get('/exportXlsx', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  try {
    let sqlText = `SELECT * FROM "orders" WHERE "userID"=$1;`;
    let result = await pool.query(sqlText, [userID]);
    const allOrders = result.rows;

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
    res.sendStatus(500);
  }
});

/**
* GET route to log status of a user's loop
*/
router.get('/debug', rejectUnauthenticated, async (req, res) => {
  const userID = req.query.id;
  if (req.user.admin) {
    try {
      const userInfo = cache.getSafeStorage(userID);
      const userErrors = cache.getErrors(userID);
      console.log('debug - full storage', userInfo);
      console.log('errors', userErrors);
      res.send(userInfo);
    } catch (err) {
      console.log(err, 'problem debug route');
      res.sendStatus(500)
    }
  } else {
    console.log('error debug user route - not admin');
    res.sendStatus(403);
  }
});

/**
* GET route to get user's errors from cache
*/
router.get('/errors', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  try {
    const userErrors = cache.getErrors(userID);
    console.log('getting errors', userErrors);
    res.send(userErrors);
  } catch (err) {
    console.log(err, 'problem debug route');
    res.sendStatus(500)
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
    console.log(err, 'problem in PAUSE ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change theme
*/
router.put('/theme', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "theme" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.theme, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in THEME ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment
*/
router.put('/reinvest', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "reinvest" = $1 WHERE "userID" = $2`;
    let result = await pool.query(queryText, [!user.reinvest, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in REINVEST ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/reinvestRatio', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "reinvest_ratio" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.reinvest_ratio, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in REINVEST ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment
*/
router.put('/tradeMax', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "max_trade" = $1 WHERE "userID" = $2`;
    let result = await pool.query(queryText, [!user.max_trade, user.id]);
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in tradeMax ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/maxTradeSize', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  try {
    if (req.body.max_trade_size >= 0) {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [req.body.max_trade_size, user.id]);
    } else {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [0, user.id]);
    }
    res.sendStatus(200);
  } catch (err) {
    console.log(err, 'problem in maxTradeSize ROUTE');
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
    console.log(err, 'problem resetting profit');
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
      return "https://api-public.sandbox.exchange.coinbase.com";
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
      console.log(err, 'problem updating api details');
      res.sendStatus(500);
    }
  }
});


module.exports = router;
