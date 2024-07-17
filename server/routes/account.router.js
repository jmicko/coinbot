import express from 'express';
const router = express.Router();
import { pool } from '../modules/pool.js';
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
import { databaseClient } from '../modules/databaseClient.js';
import { cbClients, userStorage, messenger } from '../modules/cache.js';
import { Coinbase } from '../modules/coinbaseClient.js';
import excel from 'exceljs';
import { granularities } from '../modules/utilities.js';
import { fork } from 'child_process';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { devLog } from '../modules/utilities.js';
import { deleteMessage } from '../modules/database/messages.js';
const __dirname = dirname(fileURLToPath(import.meta.url));


/**
 * GET route to get all accounts info
 */
router.get('/', rejectUnauthenticated, async (req, res) => {
  devLog('get accounts route hit');
  // todo - DOES THIS ROUTE EVER GET HIT??

  const user = req.user;
  const userID = req.user?.id;
  // user needs to be active or they will not have an API key to use
  if (user?.active) {
    try {
      let accounts = await cbClients[userID].getAccounts({ limit: 250 });
      let spentUSD = await databaseClient.getSpentUSD(userID);

      devLog(accounts, 'accounts from new api');

      res.send(
        {
          accounts: accounts,
          spentUSD: spentUSD
        }
      );
    }
    catch (err) {
      if (err.response?.status === 500) {
        devLog('internal server error from coinbase');
      } else if (err.response?.status === 401) {
        devLog('Invalid API key');
      } else {
        devLog(err, 'error getting accounts:');
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
  // devLog(req.user.username, 'get products route hit+++++++++++++++++++++++++++++');
  const userID = req.user.id;
  try {
    // get active products from db
    let activeProducts = await databaseClient.getActiveProducts(userID);
    // for each active product, get the candle average and add it to the product object
    for (let product of activeProducts) {
      let average = await databaseClient.getCandlesAverage(product.product_id, 'SIX_HOUR');
      devLog(average, 'average');
      product.average = average.average;
    }
    // get all products from db
    let allProducts = await databaseClient.getUserProducts(userID);
    const products = { activeProducts, allProducts }
    res.send(products).status(200);
  }
  catch (err) {
    devLog(err, 'error getting products');
    res.sendStatus(500)
  }
});

/** PUT route to toggle product active status **/
router.put('/products', rejectUnauthenticated, async (req, res) => {
  devLog('put products route hit');
  const userID = req.user.id;
  devLog(req.body, 'req.body');
  const productID = req.body.product_id;
  const active = !req.body.active_for_user;
  devLog(productID, active, 'productID and active');
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
    devLog(err, 'error updating product active status');
    res.sendStatus(500)
  }
});


/**
* GET route to get total profit estimate
*/
router.get('/profit/:product_id', rejectUnauthenticated, async (req, res) => {
  try {
    devLog('profits get route');
    const userID = req.user.id;
    const product_id = req.params.product_id;

    const durations = ['24 Hour', '7 Day', '30 Day', '90 Day', '1 Year'];
    const profits = [];
    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i];
      // get profit for each duration by product
      let productProfit = await databaseClient.getProfitForDurationByProduct(userID, product_id, duration);
      // get profit for each duration by all products
      let allProfit = await databaseClient.getProfitForDurationByAllProducts(userID, duration);
      // add profit to profits array along with duration
      profits.push({ duration, productProfit, allProfit });
    }

    const weeklyAverage = await databaseClient.getWeeklyAverageProfit(userID, product_id);
    profits.push(weeklyAverage);

    const sinceDate = await databaseClient.getProfitSinceDate(userID, req.user.profit_reset, product_id)
    // add since reset to profits array
    profits.push(sinceDate);

    res.send(profits);
  } catch (err) {
    devLog(err, 'error in profits route:');
    res.sendStatus(500)
  }
});

/**
* PUT route to reset profits
*/
// todo - add profit reset date column to products table and enable resetting per product
// also this should take in a date in the params so the user can reset profits for a specific date
router.put('/profit/:product_id', rejectUnauthenticated, async (req, res) => {
  try {
    devLog('reset profit route');
    const identifier = req.headers['x-identifier'];
    // get the object keys

    const profit_reset = new Date(req.body.profit_reset);
    // console.log(date, 'date');

    // const profit_reset = new Date(date);
    // const profit_reset = new Date();
    console.log(profit_reset, 'profit reset date');
    const userID = req.user.id;
    const queryText = `UPDATE "limit_orders" SET "include_in_profit" = false WHERE "userID"=$1 AND "settled"=true;`;
    const timeQuery = `UPDATE "user_settings" SET "profit_reset" = $1 WHERE "userID" = $2;`
    await pool.query(queryText, [userID]);
    await pool.query(timeQuery, [profit_reset, userID]);

    await userStorage[userID].update(identifier);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem resetting profit');
    res.sendStatus(500);
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
    devLog('problem getting all orders');
    res.sendStatus(500);
  }
});

/**
* PUT route to export xlsx of candle data
*/


router.put('/exportCandles', rejectUnauthenticated, async (req, res) => {
  try {
    devLog(req.user, 'export candles route hit');
    // get the userID, product, and granularity from the query params
    const userID = req.user.id;
    const username = req.user.username;
    const product = req.body.product;
    const granularity = req.body.granularity;
    // get the start and end dates from the query body and convert them to unix timestamps
    const start = new Date(req.body.start).getTime() / 1000;
    // const start = req.body.start;
    const end = new Date(req.body.end).getTime() / 1000;
    // const end = req.body.end;

    devLog(userID, product, granularity, start, end, end - start, 'export candles params');
    // ensure that all params are present and valid
    if (!userID || !product || !granularity || !start || !end) {
      devLog('missing params');
      res.sendStatus(400);
      return;
    }
    // ensure that the start and end dates are valid dates and that the start date is before the end date
    if (isNaN(start) || isNaN(end) || start > end) {
      devLog('invalid dates');
      res.sendStatus(400);
      return;
    }
    // ensure that the start and end dates are within 1 year and 2 days of each other and that there is at least 1 day of data
    if (end - start > 31536000 || end - start < 86400) {
      devLog('invalid date range');
      res.sendStatus(400);
      return;
    }
    // ensure that the user is not already exporting data
    if (userStorage[userID].exporting) {
      devLog('already exporting');
      res.sendStatus(400);
      return;
    }
    // set exporting to true
    userStorage[userID].exporting = true;

    // process the data on a separate thread
    // create a new worker
    const worker = fork('./server/modules/exportWorker.js');
    worker.send({
      type: 'candles',
      params: { userID, username, product, granularity, start, end }
    });
    worker.on('message', (fileName) => {
      devLog(fileName, 'message from worker');
      // if there is a filename, tell client to update files
      if (fileName) {
        messenger[userID].fileUpdate();
      }
      // kill the worker
      worker.kill();
      // set exporting to false
      userStorage[userID].exporting = false;
    });
    worker.on('exit', (code) => {
      devLog('worker exited');
      if (code !== 0) {
        devLog(`Worker stopped with exit code ${code}`);
      }
    });

    // send okay status to client
    res.sendStatus(200);


  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});



/**
 * GET route to find all files in the exports folder with the user's username in the filename
 * send the file names to the client
*/
router.get('/exportableFiles', rejectUnauthenticated, async (req, res) => {
  devLog('export files files files files files route hit');
  try {
    const username = req.user.username;
    const files = await fs.readdirSync('server/exports');
    const userFiles = files.filter(file => file.includes(username));
    res.send(userFiles);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// serve the file to the client
router.get('/downloadFile/:fileName', rejectUnauthenticated, async (req, res) => {
  devLog('download file route hit');
  try {
    const userID = req.user.id;
    const username = req.user.username;
    const fileName = req.params.fileName;
    // check that the file name does not contain a path
    if (fileName.includes('/')) {
      res.sendStatus(403);
      return;
    }
    // verify that the file exists in the exports folder
    // and that the file name starts with the user id and username
    // get all files in the exports folder
    const files = await fs.readdirSync('server/exports');
    // filter the files to only include files with the user's username in the file name
    const fileStart = `${userID}-${username}`;
    // the beginning of the file name should be a concatenation of the user id and username
    // check the beginning of the file name to make sure it matches the user id and username
    if (!fileName.startsWith(fileStart)) {
      res.sendStatus(403);
      return;
    }
    const userFiles = files.filter(file => file.startsWith(fileStart));
    // make sure that the file exists
    if (userFiles.length === 0) {
      res.sendStatus(404);
      return;
    }
    // make sure that the file is the only file in the array
    const singleFile = userFiles.filter(file => file === fileName);
    devLog(singleFile, 'single file');
    // if there is a file, serve it
    if (singleFile.length > 0) {
      // serve the file
      res.sendFile(path.join(__dirname, `../exports/${fileName}`));

    } else {
      // send a 404 not found status if the file doesn't exist
      res.sendStatus(404);
    }
  } catch (error) {
    console.error(error);
    // send a 500 internal server error status if there is an error
    res.sendStatus(500);
  }
});


/**
* GET route to export JSON of current orders
*/
router.get('/exportCurrentJSON', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  try {
    // let sqlText = `SELECT * FROM "limit_orders" WHERE "userID"=$1;`;
    // let result = await pool.query(sqlText, [userID]);
    // const allOrders = JSON.stringify(result.rows);
    const allOrders = await databaseClient.getUnsettledTrades('all', userID);

    devLog(allOrders);

    res.send(allOrders);
  } catch (err) {
    devLog('problem getting all orders');
    res.sendStatus(500);
  }
});

/**
* POST route to import JSON of current orders
*/
router.post('/importCurrentJSON', rejectUnauthenticated, async (req, res) => {
  const userID = req.user.id;
  // try {
  //   // devLog(req.body);
  //   const IGNORE_DUPLICATES = req.body.ignoreDuplicates
  //   const JSON_IMPORT = req.body.jsonImport
  //   // devLog(JSON.parse(JSON_IMPORT));
  //   const TRADES_TO_IMPORT = JSON.parse(JSON_IMPORT);

  //   let { errors, newTradeList } = convertJSONImport(TRADES_TO_IMPORT, IGNORE_DUPLICATES);

  //   // if there are no errors, import the new trades into the db
  //   if (!errors) {
  //     // there may still be db errors, so keep track of that
  //     let dbErrors = false;
  //     // import the trades into the db
  //     newTradeList.forEach(async trade => {
  //       // devLog(Date.now());
  //       // devLog(trade.id);
  //       try {
  //         await databaseClient.importTrade(trade, userID);
  //       } catch (error) {
  //         devLog('problem importing a trade');
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
  //   devLog('problem getting all orders');
  //   res.sendStatus(500);
  // }
});


/**
* GET route to get user's errors from cache
*/
router.get('/errors', rejectUnauthenticated, async (req, res) => {
  devLog('get errors route');
  const userID = req.user.id;
  try {
    const userErrors = messenger[userID].getErrors();
    // console.log(userErrors, '< userErrors');
    res.send(userErrors);
  } catch (err) {
    devLog(err, 'problem debug route');
    res.sendStatus(500)
  }
});

/**
* GET route to get user's messages from cache
*/
router.get('/messages', rejectUnauthenticated, async (req, res) => {
  devLog('get messages route');
  const userID = req.user.id;
  try {
    const userMessages = {}
    userMessages.botMessages = messenger[userID].getMessages();
    userMessages.chatMessages = messenger[userID].getChatMessages();
    if (userMessages.chatMessages.length > 1000) {
      userMessages.chatMessages.length = 1000;
    }
    if (userMessages.botMessages.length > 1000) {
      userMessages.botMessages.length = 1000;
    }
    console.log(userMessages.chatMessages.length, '< userMessages');
    res.send(userMessages);
  } catch (err) {
    devLog(err, 'problem in get messages route');
    res.sendStatus(500)
  }
});

/**
 * POST route to send a chat message
 */
router.post('/messages', rejectUnauthenticated, async (req, res) => {
  devLog('post messages route');
  try {
    const user = req.user;
    if (!user.can_chat) {
      res.sendStatus(403);
      return;
    }

    const userID = user.id;
    const message = req.body;

    devLog(message, 'message to send to all');

    if (message.type === 'chat') {
      const allUsers = userStorage.getAllUsers()
      devLog(allUsers, 'ALL OF THE user', user.username);


      const savedMessage = await messenger[userID].newMessage({
        from: user.username,
        text: message.data,
        type: 'chat'
      });

      console.log(savedMessage, '< savedMessage');

      allUsers.forEach(otherUserID => {
        if (otherUserID === userID) return;
        messenger[otherUserID].newChatFromOther(savedMessage);
      });
    }

    // const userMessages = cache.getChatMessages(userID);
    // userMessages.push(message);
    // cache.setChatMessages(userID, userMessages);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in post messages route');
    res.sendStatus(500)
  }
});

/**
 * DELETE route to delete a chat message
 */

router.delete('/messages/:message_id', rejectUnauthenticated, async (req, res) => {
  devLog('delete messages route');
  try {
    const user = req.user;
    if (!user.can_chat) {
      res.sendStatus(403);
      return;
    }
    const userID = user.id;
    const messageID = req.params.message_id;
    devLog(messageID, 'messageID');
    await deleteMessage(userID, messageID);

    // all users should resaturate their messages
    const allUsers = userStorage.getAllUsers()
    devLog(allUsers, 'ALL OF THE user', user.username);
    allUsers.forEach(async (userID) => {
      await messenger[userID].saturateMessages();
      messenger[userID].messageUpdate();
    });

    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in delete messages route');
    res.sendStatus(500)
  }
});



/**
* PUT route to change status of reinvestment
*/
router.put('/reinvest', rejectUnauthenticated, async (req, res) => {
  devLog('reinvest route');
  try {
    const identifier = req.headers['x-identifier'];
    const user = req.user;
    const queryText = `UPDATE "user_settings" SET "reinvest" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [!user.reinvest, user.id]);

    await userStorage[user.id].update(identifier);
    // messenger[user.id].userUpdate(identifier);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in REINVEST ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/reinvestRatio', rejectUnauthenticated, async (req, res) => {
  devLog('reinvest ratio route');
  try {
    const identifier = req.headers['x-identifier'];
    const user = req.user;
    const queryText = `UPDATE "user_settings" SET "reinvest_ratio" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.reinvest_ratio, user.id]);

    await userStorage[user.id].update(identifier);
    // messenger[user.id].userUpdate(identifier);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in REINVEST ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change maximum size of trades
*/
router.put('/tradeMax', rejectUnauthenticated, async (req, res) => {
  devLog('trade max route');
  try {
    const identifier = req.headers['x-identifier'];
    const user = req.user;
    const queryText = `UPDATE "user_settings" SET "max_trade" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [!user.max_trade, user.id]);

    await userStorage[user.id].update(identifier);
    // messenger[user.id].userUpdate(identifier);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in tradeMax ROUTE');
    res.sendStatus(500);
  }
});


/**
* PUT route to set reserve
*/
router.put('/reserve', rejectUnauthenticated, async (req, res) => {
  try {
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    const queryText = `UPDATE "user_settings" SET "reserve" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.reserve, user.id]);
    await userStorage[user.id].update(identifier);
    res.sendStatus(200);
    // messenger[user.id].userUpdate(identifier);
  } catch (err) {
    devLog(err, 'problem in reserve ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/maxTradeSize', rejectUnauthenticated, async (req, res) => {
  devLog('max trade size route');
  try {
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    if (req.body.max_trade_size >= 0) {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [req.body.max_trade_size, user.id]);
    } else {
      const queryText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
      await pool.query(queryText, [0, user.id]);
    }

    await userStorage[user.id].update(identifier);
    // messenger[user.id].userUpdate(identifier);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in maxTradeSize ROUTE');
    res.sendStatus(500);
  }
});

/**
* PUT route to change status of reinvestment ratio
*/
router.put('/postMaxReinvestRatio', rejectUnauthenticated, async (req, res) => {
  try {
    const user = req.user;
    const identifier = req.headers['x-identifier'];
    devLog("postMaxReinvestRatio route hit", req.body);
    const queryText = `UPDATE "user_settings" SET "post_max_reinvest_ratio" = $1 WHERE "userID" = $2`;
    await pool.query(queryText, [req.body.postMaxReinvestRatio, user.id]);
    await userStorage[user.id].update(identifier);
    // messenger[user.id].userUpdate(identifier);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'problem in postMaxReinvestRatio ROUTE');
    res.sendStatus(500);
  }
});


/**
* POST route to store API details
*/
router.post('/storeApi', rejectUnauthenticated, async (req, res) => {
  devLog('store api route');
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
    devLog(txSummary, 'test api results');
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
      devLog('Invalid API key');
      res.sendStatus(401);
    } else {
      devLog(err, 'problem updating api details');
      res.sendStatus(500);
    }
  }
});


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
      devLog('id is a valid string', trade.id);
      newTrade.id = trade.id;
      // if duplicated trades should be ignored, add the current time to the id so they are different
      if (IGNORE_DUPLICATES) {
        newTrade.id = trade.id + Date.now();
      }
    } else {
      devLog('limit_price is NOT a valid string', trade.limit_price);
      errors = true;
    }

    // limit_price should be a number greater than 0 but not too big
    if (Number(trade.limit_price) && (Number(trade.limit_price) < 999999999) && (Number(trade.limit_price) > 0)) {
      // devLog('limit_price is a valid number', trade.limit_price);
      newTrade.limit_price = Number(trade.limit_price);
    } else {
      devLog('limit_price is NOT a valid number', trade.limit_price);
      errors = true;
    }

    // base_size should be a number greater than 0 but not too big
    if (Number(trade.base_size) && (Number(trade.base_size) < 999999999) && (Number(trade.base_size) > 0)) {
      // devLog('base_size is a valid number', trade.base_size);
      newTrade.base_size = trade.base_size;
    } else {
      devLog('base_size is NOT a valid number', trade.base_size);
      errors = true;
    }

    // trade_pair_ratio should be a number greater than 0 but not too big
    if (Number(trade.trade_pair_ratio) && (Number(trade.trade_pair_ratio) < 999999999) && (Number(trade.trade_pair_ratio) > 0)) {
      // devLog('trade_pair_ratio is a number', trade.trade_pair_ratio);
      newTrade.trade_pair_ratio = trade.trade_pair_ratio;
    } else {
      devLog('trade_pair_ratio is NOT a valid number', trade.trade_pair_ratio);
      errors = true;
    }

    // side should be only buy or sell
    if ((trade.side == 'buy') || (trade.side == 'sell')) {
      // devLog('side is a sell or buy', trade.side);
      newTrade.side = trade.side;
    } else {
      devLog('side is NOT a sell or buy', trade.side);
      errors = true;
    }

    // settled must be a boolean
    if (typeof (trade.settled) == "boolean") {
      // devLog('settled is a boolean', trade.settled);
      newTrade.settled = trade.settled;
    } else {
      devLog('settled is NOT a boolean', trade.settled);
      errors = true;
    }

    // created_at must be a date
    if (isDate(trade.created_at)) {
      devLog('created_at is a date', trade.created_at);
      newTrade.created_at = trade.created_at;
    } else {
      devLog('created_at is NOT a date', trade.created_at);
      errors = true;
    }

    // flipped_at must be a date or null
    if (isDate(trade.flipped_at) || (trade.flipped_at == null)) {
      devLog('flipped_at is a date', trade.flipped_at);
      newTrade.flipped_at = trade.flipped_at;
    } else {
      devLog('flipped_at is NOT a date', trade.flipped_at);
      errors = true;
    }

    // done_at must be a date or null
    if (isDate(trade.done_at) || (trade.done_at == null)) {
      devLog('done_at is a date', trade.done_at);
      newTrade.done_at = trade.done_at;
    } else {
      devLog('done_at is NOT a date', trade.done_at);
      errors = true;
    }

    // fill_fees should be a number greater than or equal to 0 but not too big, or null
    // have to check if = 0 separately here because 0 is falsy so it will falsify the chunk of && statements
    if ((Number(trade.fill_fees) && (Number(trade.fill_fees) < 999999999) && (Number(trade.fill_fees) > 0)) || (trade.fill_fees == null) || (Number(trade.fill_fees) == 0)) {
      // devLog('fill_fees is a number', trade.fill_fees);
      newTrade.fill_fees = trade.fill_fees;
    } else {
      devLog('fill_fees is NOT a valid number and is not null', Number(trade.fill_fees) >= 0);
      errors = true;
    }

    // previous_fill_fees should be a number greater than 0 but not too big or null
    if ((Number(trade.previous_fill_fees) && (Number(trade.previous_fill_fees) < 999999999) && (Number(trade.previous_fill_fees) > 0)) || trade.previous_fill_fees == null) {
      // devLog('previous_fill_fees is a number', trade.previous_fill_fees);
      newTrade.previous_fill_fees = trade.previous_fill_fees;
    } else {
      devLog('previous_fill_fees is NOT a valid number and is not null', trade.previous_fill_fees);
      errors = true;
    }

    // filled_size should be a number greater than or equal to 0 but not too big, or null
    // have to check if = 0 separately here because 0 is falsy so it will falsify the chunk of && statements
    if ((Number(trade.filled_size) && (Number(trade.filled_size) < 999999999) && (Number(trade.filled_size) > 0)) || (trade.filled_size == null) || (Number(trade.filled_size) == 0)) {
      // devLog('filled_size is a number', trade.filled_size);
      newTrade.filled_size = trade.filled_size;
    } else {
      devLog('filled_size is NOT a valid number and is not null', Number(trade.filled_size) >= 0);
      errors = true;
    }

    // executed_value should be a number greater than or equal to 0 but not too big, or null
    // have to check if = 0 separately here because 0 is falsy so it will falsify the chunk of && statements
    if ((Number(trade.executed_value) && (Number(trade.executed_value) < 999999999) && (Number(trade.executed_value) > 0)) || (trade.executed_value == null) || (Number(trade.executed_value) == 0)) {
      // devLog('executed_value is a number', trade.executed_value);
      newTrade.executed_value = trade.executed_value;
    } else {
      devLog('executed_value is NOT a valid number and is not null', Number(trade.executed_value) >= 0);
      errors = true;
    }

    // original_buy_price should be a number greater than 0 but not too big
    if (Number(trade.original_buy_price) && (Number(trade.original_buy_price) < 999999999) && (Number(trade.original_buy_price) > 0)) {
      // devLog('original_buy_price is a number', trade.original_buy_price);
      newTrade.original_buy_price = trade.original_buy_price;
    } else {
      devLog('original_buy_price is NOT a valid number', trade.original_buy_price);
      errors = true;
    }

    // original_sell_price should be a number greater than 0 but not too big
    if (Number(trade.original_sell_price) && (Number(trade.original_sell_price) < 999999999) && (Number(trade.original_sell_price) > 0)) {
      // devLog('original_sell_price is a number', trade.original_sell_price);
      newTrade.original_sell_price = trade.original_sell_price;
    } else {
      devLog('original_sell_price is NOT a valid number', trade.original_sell_price);
      errors = true;
    }


    // dates are tricky. Don't want to just check if string, so convert the date object and see if that works
    function isDate(date) {
      let result = new Date(date).getTime();

      // date should not already be a number. it should be a string
      if (typeof date == "number") {
        devLog('already a number');
        return false;
      }
      // after converting the date, it should be a number greater than 0. If NaN, it will not compute.
      // only a valid date or number will compute, and numbers already return false.
      if (result > 0) {
        devLog('GOOD DATE');
        return true;
      }
      devLog('date is not valid', date);
      return false;

      // devLog("is it a number", typeof date == "number");
      // let badResult = new Date("date").getTime();
      // devLog('HERE IS THE good DATE', result > 0);
      // devLog('HERE IS THE bad DATE', badResult > 0);
    }


    // devLog('CHECK DATA', new Date("trade.created_at").getTime(), Date.now(), typeof trade.created_at);
    // some of the trade details should be fixed
    newTrade.time_in_force = "GTC";
    // product_id should not be fixed, need to verify that it is a valid product_id when reimplementing JSON import/export
    newTrade.product_id = "BTC-USD";


    newTradeList.push(newTrade);
  }
  devLog('errors in import?', errors);
  return { errors, newTradeList };
}

export default router;