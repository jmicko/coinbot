const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const { cache, cbClients, userStorage } = require('../modules/cache');
const { Coinbase } = require('../modules/coinbaseClient');
// const databaseClient = require('../modules/databaseClient/databaseClient');


/**
 * GET route to get all accounts info
 */
router.get('/', rejectUnauthenticated, async (req, res) => {
  console.log('get accounts route hit');
  // todo - DOES THIS ROUTE EVER GET HIT??

  const user = req.user;
  const userID = req.user?.id;
  // user needs to be active or they will not have an API key to use
  if (user?.active) {
    try {
      let accounts = await cbClients[userID].getAccounts({ limit: 250 });
      let spentUSD = await databaseClient.getSpentUSD(userID);

      console.log(accounts, 'accounts from new api');

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
      } else if (err.response?.status === 401) {
        console.log('Invalid API key');
      } else {
        console.log(err, 'error getting accounts:');
      }
      res.sendStatus(500)
    }
  } else {
    res.send(`you never should have come here!`)
    res.sendStatus(404)
  }
});

/** GET route to get user products from db **/
router.get('/products', rejectUnauthenticated, async (req, res) => {
  console.log('get products route hit');
  const userID = req.user.id;
  try {
    // get active products from db
    let activeProducts = await databaseClient.getActiveProducts(userID);
    // get all products from db
    let allProducts = await databaseClient.getUserProducts(userID);
    res.send({ activeProducts, allProducts });
  }
  catch (err) {
    console.log(err, 'error getting products');
    res.sendStatus(500)
  }
});

/** PUT route to toggle product active status **/
router.put('/products', rejectUnauthenticated, async (req, res) => {
  console.log('put products route hit');
  const userID = req.user.id;
  // console.log(req.body, 'req.body');
  const productID = req.body.product_id;
  const active = !req.body.active_for_user;
  console.log(productID, active, 'productID and active');
  try {
    // update product active status in db
    await databaseClient.updateProductActiveStatus(userID, productID, active);
    // get active products from db
    const products = await databaseClient.getActiveProducts(userID);
    // add each product_id to an array product ids
    const productIds = [];
    products.forEach(product => {
      productIds.push(product.product_id);
    });
    // update cbClient with new product ids
    cbClients[userID].setProducts(productIds);
    // close the socket in cbClient. This will force a new connection to be made with the new product ids
    cbClients[userID].closeSocket();
    res.sendStatus(200);
  }
  catch (err) {
    console.log(err, 'error updating product active status');
    res.sendStatus(500)
  }
});


/**
* GET route to get total profit estimate
*/
router.get('/profits/:product', rejectUnauthenticated, async (req, res) => {
  console.log('profits get route');
  const userID = req.user.id;
  const product = req.params.product;
  // console.log(product, 'product');
  // console.log(req.user, 'req.user in profits route');

  const durations = ['24 hour', '1 week', '30 day', '1 year'];
  const profits = [];
  try {
    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i];
      // get profit for each duration by product
      let productProfit = await databaseClient.getProfitForDurationByProduct(userID, product, duration);
      // get profit for each duration by all products
      let allProfit = await databaseClient.getProfitForDurationByAllProducts(userID, duration);
      // add profit to profits array along with duration
      profits.push({ duration, productProfit, allProfit });
    }

    const sinceDate = await databaseClient.getProfitSinceDate(userID, req.user.profit_reset, product)
    // add since reset to profits array
    profits.push(sinceDate);

    // console.log(profits, 'duration profits');
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
    let sqlText = `SELECT * FROM "limit_orders" WHERE "userID"=$1;`;
    let result = await pool.query(sqlText, [userID]);
    const allOrders = result.rows;

    const data = [
      {
        sheet: 'Orders',
        columns: [
          { label: 'Order ID', value: 'order_id' },
          { label: 'Base size', value: 'base_size' },
          { label: 'Limit Price', value: 'limit_price' },
          { label: 'Trade pair ratio', value: 'trade_pair_ratio' },
          { label: 'Side', value: 'side' },
          { label: 'Settled', value: 'settled' },
          { label: 'Flipped', value: 'flipped' },
          { label: 'Include in profit', value: 'include_in_profit' },
          { label: 'Product', value: 'product_id' },
          { label: 'Created at', value: 'created_at' },
          { label: 'Flipped at', value: 'flipped_at' },
          { label: 'Status', value: 'status' },
          { label: 'Total fees', value: 'total_fees' },
          { label: 'Filled size', value: 'filled_size' },
          { label: 'Filled value', value: 'filled_value' },
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
* GET route to export JSON of current orders
*/
router.get('/exportCurrentJSON', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  try {
    let sqlText = `SELECT * FROM "limit_orders" WHERE "userID"=$1;`;
    let result = await pool.query(sqlText, [userID]);
    // const allOrders = JSON.stringify(result.rows);
    const allOrders = await databaseClient.getUnsettledTrades('all', userID);

    console.log(allOrders);

    res.send(allOrders);
  } catch (err) {
    console.log('problem getting all orders');
    res.sendStatus(500);
  }
});

/**
* POST route to import JSON of current orders
*/
router.post('/importCurrentJSON', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  // try {
  //   // console.log(req.body);
  //   const IGNORE_DUPLICATES = req.body.ignoreDuplicates
  //   const JSON_IMPORT = req.body.jsonImport
  //   // console.log(JSON.parse(JSON_IMPORT));
  //   const TRADES_TO_IMPORT = JSON.parse(JSON_IMPORT);

  //   let { errors, newTradeList } = convertJSONImport(TRADES_TO_IMPORT, IGNORE_DUPLICATES);

  //   // if there are no errors, import the new trades into the db
  //   if (!errors) {
  //     // there may still be db errors, so keep track of that
  //     let dbErrors = false;
  //     // import the trades into the db
  //     newTradeList.forEach(async trade => {
  //       // console.log(Date.now());
  //       // console.log(trade.id);
  //       try {
  //         await databaseClient.importTrade(trade, userID);
  //       } catch (error) {
  //         console.log('problem importing a trade');
  //         dbErrors = true;
  //       }
  //     });
  //     if (dbErrors) {
  //       res.sendStatus(500);
  //     } else {
  //       res.sendStatus(200);
  //     }
  //   } else {
  res.sendStatus(500);
  //   }

  // } catch (err) {
  //   console.log('problem getting all orders');
  //   res.sendStatus(500);
  // }
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
      userInfo.userID !== null
        ? res.send(userInfo).status(200)
        : res.sendStatus(500);
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
  console.log('get errors route');
  const userID = req.user.id;
  try {
    const userErrors = cache.getErrors(userID);
    // console.log('getting errors', userErrors);
    res.send(userErrors);
  } catch (err) {
    console.log(err, 'problem debug route');
    res.sendStatus(500)
  }
});

/**
* GET route to get user's messages from cache
*/
router.get('/messages', rejectUnauthenticated, async (req, res) => {
  console.log('get messages route');
  const userID = req.user.id;
  try {
    const userMessages = {}
    userMessages.general = cache.getMessages(userID);
    userMessages.chat = cache.getChatMessages(userID);
    // console.log('getting Messages', userMessages);
    res.send(userMessages);
  } catch (err) {
    console.log(err, 'problem debug route');
    res.sendStatus(500)
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
  console.log('theme route');
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "theme" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.theme, user.id]);
    await userStorage[user.id].update();
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
  console.log('reinvest route');
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "reinvest" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [!user.reinvest, user.id]);

    await userStorage[user.id].update();
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
  console.log('reinvest ratio route');
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "reinvest_ratio" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.reinvest_ratio, user.id]);

    await userStorage[user.id].update();
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
  console.log('trade max route');
  const user = req.user;
  try {
    const queryText = `UPDATE "user_settings" SET "max_trade" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [!user.max_trade, user.id]);

    await userStorage[user.id].update();
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
  console.log('max trade size route');
  const user = req.user;
  try {
    if (req.body.max_trade_size >= 0) {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [req.body.max_trade_size, user.id]);
    } else {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [0, user.id]);
    }

    await userStorage[user.id].update();
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
  console.log('reset profit route');
  const profit_reset = new Date();
  const userID = req.user.id;
  const queryText = `UPDATE "limit_orders" SET "include_in_profit" = false WHERE "userID"=$1 AND "settled"=true;`;
  const timeQuery = `UPDATE "user_settings" SET "profit_reset" = $1 WHERE "userID" = $2;`
  try {
    await pool.query(queryText, [userID]);
    await pool.query(timeQuery, [profit_reset, userID]);

    await userStorage[userID].update();
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
  console.log('store api route');
  const userID = req.user.id;
  function getURI() {
    if (api.URI === "sandbox") {
      return "https://api-public.sandbox.exchange.coinbase.com";
    }
    else if (api.URI === "real") {
      return "https://coinbase.com";
    }
  }
  const api = req.body;
  const URI = getURI();
  try {
    // check if the api works first
    const testClient = new Coinbase(api.key, api.secret);
    const txSummary = await testClient.getTransactionSummary({ user_native_currency: 'USD' });
    console.log(txSummary, 'test api results');
    await databaseClient.saveFees(txSummary, userID);

    // store the api in the db
    const userAPIQueryText = `UPDATE "user_api" SET "CB_SECRET" = $1, "CB_ACCESS_KEY" = $2, "CB_ACCESS_PASSPHRASE" = $3, "API_URI" = $4
    WHERE "userID"=$5;`;
    let userAPIResult = await pool.query(userAPIQueryText, [
      api.secret,
      api.key,
      api.passphrase,
      api.URI,
      userID,
    ]);

    // set the account as active
    const queryText = `UPDATE "user" SET "active" = true
    WHERE "id"=$1 RETURNING *;`;
    let result = await pool.query(queryText, [userID]);
    // refresh the user's cache
    await cbClients.updateAPI(result.rows[0].id);

    res.sendStatus(200);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('Invalid API key');
      res.sendStatus(500);
    } else {
      console.log(err, 'problem updating api details');
      res.sendStatus(500);
    }
  }
});


module.exports = router;
function convertJSONImport(TRADES_TO_IMPORT, IGNORE_DUPLICATES) {
  let errors = false;
  // make a new object so we can ignore any JSON nonsense that should not be there
  let newTradeList = [];

  // verify the integrity of the JSON and only add valid data to new trade details
  for (let i = 0; i < TRADES_TO_IMPORT.length; i++) {
    // make a new object so we can ignore any JSON nonsense that should not be there
    let newTrade = {};
    const trade = TRADES_TO_IMPORT[i];

    // id should be a string
    if (typeof trade.id == "string") {
      console.log('id is a valid string', trade.id);
      newTrade.id = trade.id;
      // if duplicated trades should be ignored, add the current time to the id so they are different
      if (IGNORE_DUPLICATES) {
        newTrade.id = trade.id + Date.now();
      }
    } else {
      console.log('limit_price is NOT a valid string', trade.limit_price);
      errors = true;
    }

    // limit_price should be a number greater than 0 but not too big
    if (Number(trade.limit_price) && (Number(trade.limit_price) < 999999999) && (Number(trade.limit_price) > 0)) {
      // console.log('limit_price is a valid number', trade.limit_price);
      newTrade.limit_price = Number(trade.limit_price);
    } else {
      console.log('limit_price is NOT a valid number', trade.limit_price);
      errors = true;
    }

    // base_size should be a number greater than 0 but not too big
    if (Number(trade.base_size) && (Number(trade.base_size) < 999999999) && (Number(trade.base_size) > 0)) {
      // console.log('base_size is a valid number', trade.base_size);
      newTrade.base_size = trade.base_size;
    } else {
      console.log('base_size is NOT a valid number', trade.base_size);
      errors = true;
    }

    // trade_pair_ratio should be a number greater than 0 but not too big
    if (Number(trade.trade_pair_ratio) && (Number(trade.trade_pair_ratio) < 999999999) && (Number(trade.trade_pair_ratio) > 0)) {
      // console.log('trade_pair_ratio is a number', trade.trade_pair_ratio);
      newTrade.trade_pair_ratio = trade.trade_pair_ratio;
    } else {
      console.log('trade_pair_ratio is NOT a valid number', trade.trade_pair_ratio);
      errors = true;
    }

    // side should be only buy or sell
    if ((trade.side == 'buy') || (trade.side == 'sell')) {
      // console.log('side is a sell or buy', trade.side);
      newTrade.side = trade.side;
    } else {
      console.log('side is NOT a sell or buy', trade.side);
      errors = true;
    }

    // settled must be a boolean
    if (typeof (trade.settled) == "boolean") {
      // console.log('settled is a boolean', trade.settled);
      newTrade.settled = trade.settled;
    } else {
      console.log('settled is NOT a boolean', trade.settled);
      errors = true;
    }

    // created_at must be a date
    if (isDate(trade.created_at)) {
      console.log('created_at is a date', trade.created_at);
      newTrade.created_at = trade.created_at;
    } else {
      console.log('created_at is NOT a date', trade.created_at);
      errors = true;
    }

    // flipped_at must be a date or null
    if (isDate(trade.flipped_at) || (trade.flipped_at == null)) {
      console.log('flipped_at is a date', trade.flipped_at);
      newTrade.flipped_at = trade.flipped_at;
    } else {
      console.log('flipped_at is NOT a date', trade.flipped_at);
      errors = true;
    }

    // done_at must be a date or null
    if (isDate(trade.done_at) || (trade.done_at == null)) {
      console.log('done_at is a date', trade.done_at);
      newTrade.done_at = trade.done_at;
    } else {
      console.log('done_at is NOT a date', trade.done_at);
      errors = true;
    }

    // fill_fees should be a number greater than or equal to 0 but not too big, or null
    // have to check if = 0 separately here because 0 is falsy so it will falsify the chunk of && statements
    if ((Number(trade.fill_fees) && (Number(trade.fill_fees) < 999999999) && (Number(trade.fill_fees) > 0)) || (trade.fill_fees == null) || (Number(trade.fill_fees) == 0)) {
      // console.log('fill_fees is a number', trade.fill_fees);
      newTrade.fill_fees = trade.fill_fees;
    } else {
      console.log('fill_fees is NOT a valid number and is not null', Number(trade.fill_fees) >= 0);
      errors = true;
    }

    // previous_fill_fees should be a number greater than 0 but not too big or null
    if ((Number(trade.previous_fill_fees) && (Number(trade.previous_fill_fees) < 999999999) && (Number(trade.previous_fill_fees) > 0)) || trade.previous_fill_fees == null) {
      // console.log('previous_fill_fees is a number', trade.previous_fill_fees);
      newTrade.previous_fill_fees = trade.previous_fill_fees;
    } else {
      console.log('previous_fill_fees is NOT a valid number and is not null', trade.previous_fill_fees);
      errors = true;
    }

    // filled_size should be a number greater than or equal to 0 but not too big, or null
    // have to check if = 0 separately here because 0 is falsy so it will falsify the chunk of && statements
    if ((Number(trade.filled_size) && (Number(trade.filled_size) < 999999999) && (Number(trade.filled_size) > 0)) || (trade.filled_size == null) || (Number(trade.filled_size) == 0)) {
      // console.log('filled_size is a number', trade.filled_size);
      newTrade.filled_size = trade.filled_size;
    } else {
      console.log('filled_size is NOT a valid number and is not null', Number(trade.filled_size) >= 0);
      errors = true;
    }

    // executed_value should be a number greater than or equal to 0 but not too big, or null
    // have to check if = 0 separately here because 0 is falsy so it will falsify the chunk of && statements
    if ((Number(trade.executed_value) && (Number(trade.executed_value) < 999999999) && (Number(trade.executed_value) > 0)) || (trade.executed_value == null) || (Number(trade.executed_value) == 0)) {
      // console.log('executed_value is a number', trade.executed_value);
      newTrade.executed_value = trade.executed_value;
    } else {
      console.log('executed_value is NOT a valid number and is not null', Number(trade.executed_value) >= 0);
      errors = true;
    }

    // original_buy_price should be a number greater than 0 but not too big
    if (Number(trade.original_buy_price) && (Number(trade.original_buy_price) < 999999999) && (Number(trade.original_buy_price) > 0)) {
      // console.log('original_buy_price is a number', trade.original_buy_price);
      newTrade.original_buy_price = trade.original_buy_price;
    } else {
      console.log('original_buy_price is NOT a valid number', trade.original_buy_price);
      errors = true;
    }

    // original_sell_price should be a number greater than 0 but not too big
    if (Number(trade.original_sell_price) && (Number(trade.original_sell_price) < 999999999) && (Number(trade.original_sell_price) > 0)) {
      // console.log('original_sell_price is a number', trade.original_sell_price);
      newTrade.original_sell_price = trade.original_sell_price;
    } else {
      console.log('original_sell_price is NOT a valid number', trade.original_sell_price);
      errors = true;
    }


    // dates are tricky. Don't want to just check if string, so convert the date object and see if that works
    function isDate(date) {
      let result = new Date(date).getTime();

      // date should not already be a number. it should be a string
      if (typeof date == "number") {
        console.log('already a number');
        return false;
      }
      // after converting the date, it should be a number greater than 0. If NaN, it will not compute.
      // only a valid date or number will compute, and numbers already return false.
      if (result > 0) {
        console.log('GOOD DATE');
        return true;
      }
      console.log('date is not valid', date);
      return false;

      // console.log("is it a number", typeof date == "number");
      // let badResult = new Date("date").getTime();
      // console.log('HERE IS THE good DATE', result > 0);
      // console.log('HERE IS THE bad DATE', badResult > 0);
    }


    // console.log('CHECK DATA', new Date("trade.created_at").getTime(), Date.now(), typeof trade.created_at);
    // some of the trade details should be fixed
    newTrade.time_in_force = "GTC";
    // product_id should not be fixed, need to verify that it is a valid product_id when reimplementing JSON import/export
    newTrade.product_id = "BTC-USD";


    newTradeList.push(newTrade);
  }
  console.log('errors in import?', errors);
  return { errors, newTradeList };
}

