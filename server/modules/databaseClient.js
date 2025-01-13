// const pool = require('./pool');
import { pool } from './pool.js';
// const { v4: uuidv4 } = require('uuid');
import { v4 as uuidv4 } from 'uuid';
import { addProductDecimals, devLog as devLogUtilities } from './utilities.js';
// import { updateProductsTable } from './database/products.js';
import { createMessagesTable } from './database/messages.js';
import { updateMessagesTable } from './database/messages.js';
import { updateFeedbackTable } from './database/feedback.js';
// import limit_orders functions
import {
  getSingleTrade,
  getTradesByIDs,
  getSettledTrades,
  getUnsettledTrades,
  getLimitedUnsettledTrades,
  getUnsettledTradesByIDs,
  getAllSettledTrades,
  getUnfilledTradesByIDs,
  getAllOrders,
  getUnsettledTradeCounts,
  getUnsettledTradesByProduct,
  getReorders,
  getDeSyncs,
  checkIfCancelling,
  storeTrade,
  updateTrade,
  setSingleReorder,
  setManyReorders,
  setReorder,
  markAsFlipped,
  deleteTrade,
  markForCancel,
  deleteMarkedOrders,
} from './database/limit_orders.js';
// Import all settings functions
import {
  updateSettingsTable,
  getBotSettings,
  toggleMaintenance,
  toggleRegistration,
  getRegistrationOpen,
  updateLoopSpeed,
  updateFullSync,
  updateOrdersToSync
} from './database/settings.js';
// import all products functions
import {
  updateProductsTable,
  getProduct,
  getActiveProducts,
  getActiveProductIDs,
  getUserProducts,
  insertProducts,
  updateProductActiveStatus,
} from './database/products.js';

let showLogs = true;

export function toggleDBLogs(bool) {
  showLogs = bool;
}

function devLog(message) {
  if (showLogs) {
    devLogUtilities(message);
  }
}

export const dbUpgrade = async () => {
  console.log('<><> dbUpgrade <><>');

  try {
    await updateProductsTable();
    await createMessagesTable();
    await updateMessagesTable();
    await updateFeedbackTable();
    await updateLimitOrdersTable();
    await updateSettingsTable();

    devLog('<><> dbUpgrade complete <><>');
  } catch (error) {
    devLog('error in dbUpgrade', error);
  }
}


// This function is used when importing trades from the user interface
// IT MUST USE THE USER ID FROM PASSPORT AUTHENTICATION!!!
// otherwise you could import false trades for someone else!
export const importTrade = (details, userID) => {
  devLog(details.id, 'details.id in importTrade');
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders"
    ("id", "userID", "price", "size", "trade_pair_ratio", "side", "settled", "product_id", "time_in_force",
      "created_at", "flipped_at", "done_at", "fill_fees", "previous_fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price", "reorder")
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19); `;
    pool.query(sqlText, [
      details.id,
      userID,
      details.price,
      details.size,
      details.trade_pair_ratio,
      details.side,
      details.settled,
      details.product_id,
      details.time_in_force,
      details.created_at,
      details.flipped_at,
      details.done_at,
      details.fill_fees,
      details.previous_fill_fees,
      details.filled_size,
      details.executed_value,
      details.original_buy_price,
      details.original_sell_price,
      true
    ])
      .then((results) => {
        resolve(results);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// get the total USD that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
export const getSpentUSD = (userID, makerFee) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("limit_price"*"base_size"*$1)
    FROM "limit_orders"
    WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$2;`;
    pool.query(sqlText, [makerFee, userID])
      .then((results) => {
        const [volume_usd] = results.rows;
        // promise returns promise from pool if success
        resolve(volume_usd);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}


// get the total USD that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
export const getSpentQuote = (userID, takerFee, product_id) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("limit_price"*"base_size"*$1)
    FROM "limit_orders"
    WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$2 AND "product_id"=$3;`;
    pool.query(sqlText, [takerFee, userID, product_id])
      .then((results) => {
        const [volume_quote] = results.rows;
        // promise returns promise from pool if success
        resolve(Number(volume_quote.sum));
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}


// get the total BTC that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
export const getSpentBase = (userID, product_id) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("base_size")
    FROM "limit_orders"
    WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 AND "product_id"=$2;`;
    pool.query(sqlText, [userID, product_id])
      .then((results) => {
        const [volume_base] = results.rows;
        // promise returns promise from pool if success
        resolve(Number(volume_base.sum));
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}


// get the total BTC that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
export const getSpentBTC = (userID) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("base_size")
    FROM "limit_orders"
    WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;
    pool.query(sqlText, [userID])
      .then((results) => {
        const [volume_btc] = results.rows;
        // promise returns promise from pool if success
        resolve(volume_btc);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}

// get user information
export async function getUser(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "user" WHERE "id"=$1;`;
      let result = await pool.query(sqlText, [userID]);
      const user = result.rows[0];
      resolve(user);
    } catch (err) {
      reject(err);
    }
  })
}

// get all user information minus password
export async function getAllUsers() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT "id", "username", "active", "admin", "approved", "joined_at" FROM "user";`;
      let result = await pool.query(sqlText);
      const users = result.rows;
      resolve(users);
    } catch (err) {
      reject(err);
    }
  })
}

// get all user information and settings except for the API details. 
// Keeping them separate helps prevent accidentally sending an API outside the server
export async function getAllUserAndSettings() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * 
      FROM "user" JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
      ORDER BY "user"."id";`;
      let result = await pool.query(sqlText);
      const users = result.rows;
      resolve(users);
    } catch (err) {
      reject(err);
    }
  })
}


// get all user information and settings except for the API details. 
// Keeping them separate helps prevent accidentally sending an API outside the server
export async function getUserAndSettings(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * 
      FROM "user" JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
      WHERE id = $1;`;
      let result = await pool.query(sqlText, [userID]);
      const user = result.rows[0];
      resolve(user);
    } catch (err) {
      reject(err);
    }
  })
}

// get the API details for a user
export async function getUserAPI(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "user_api" WHERE "userID"=$1;`;
      let result = await pool.query(sqlText, [userID]);
      const userAPI = result.rows[0];
      resolve(userAPI);
    } catch (err) {
      reject(err);
    }
  })
}


// pause the bot for a user. Actually causes the bot to ignore all functions and continue looping while doing nothing
async function setPause(status, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "paused" = $1 WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [status, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// toggles the kill button on the tradelist on the interface
// turning it on will not show the kill button, preventing accidental trade-pair cancellation
export async function setKillLock(status, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "kill_locked" = $1 WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [status, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}


export async function setAutoSetupNumber(number, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "auto_setup_number" = $1 WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [number, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// update the fees and 30 day trade volume
export async function saveFees(fees, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const totalVolume = Number(fees.advanced_trade_only_volume) + Number(fees.coinbase_pro_volume);
      const sqlText = `UPDATE "user_settings" SET "maker_fee" = $1, "taker_fee" = $2, "usd_volume" = $3  WHERE "userID" = $4`;
      let result = await pool.query(sqlText, [fees.fee_tier.maker_fee_rate, fees.fee_tier.taker_fee_rate, totalVolume, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// get profit for a product and for all products for a duration of time
export async function getProfitForDurationByProduct(userID, product, duration) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT SUM(("original_sell_price" * "base_size") - ("original_buy_price" * "base_size") - ("total_fees" + "previous_total_fees")) 
      FROM limit_orders 
      WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "product_id" = $2 AND "filled_at" > now() - $3::interval;`;
      let result = await pool.query(sqlText, [userID, product, duration]);

      resolve(result.rows[0].sum);
    } catch (err) {
      reject(err);
    }
  })
}

// get profit for a product and for all products for a duration of time
export async function getProfitForDurationByAllProducts(userID, duration) {
  devLog('getting profit for duration by all products', userID, duration);
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT SUM(("original_sell_price" * "base_size") - ("original_buy_price" * "base_size") - ("total_fees" + "previous_total_fees")) 
      FROM limit_orders 
      WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "filled_at" > now() - $2::interval;`;
      let result = await pool.query(sqlText, [userID, duration]);
      resolve(result.rows[0].sum);
    } catch (err) {
      reject(err);
    }
  })
}

// get profit for a product and for all products for a duration of time
export async function getProfitSinceDate(userID, date, product) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT SUM(("original_sell_price" * "base_size") - ("original_buy_price" * "base_size") - ("total_fees" + "previous_total_fees")) 
      FROM limit_orders 
      WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "filled_at" BETWEEN $2 AND now();`;
      let result = await pool.query(sqlText, [userID, date]);

      const productSqlText = `SELECT SUM(("original_sell_price" * "base_size") - ("original_buy_price" * "base_size") - ("total_fees" + "previous_total_fees")) 
      FROM limit_orders 
      WHERE "side" = 'SELL' AND "settled" = 'true' AND "product_id" = $1 AND "userID" = $2 AND "filled_at" BETWEEN $3 AND now();`;
      let productResult = await pool.query(productSqlText, [product, userID, date]);

      // add both results to an object and resolve
      const profit = {
        duration: 'Since Reset',
        allProfit: result.rows[0].sum || 0,
        productProfit: productResult.rows[0].sum || 0
      }
      devLog('profit', profit);
      resolve(profit);
    } catch (err) {
      reject(err);
    }
  })
}

// get the weekly average profit for a product for the last 4 weeks
export async function getWeeklyAverageProfit(userID, product) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT SUM(("original_sell_price" * "base_size") - ("original_buy_price" * "base_size") - ("total_fees" + "previous_total_fees")) / 12 AS "average_profit"
      FROM limit_orders
      WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "filled_at" > now() - '12 weeks'::interval;`;
      // WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "filled_at" > now() - '4 weeks'::interval;`;
      const result = await pool.query(sqlText, [userID]);

      const productSqlText = `SELECT SUM(("original_sell_price" * "base_size") - ("original_buy_price" * "base_size") - ("total_fees" + "previous_total_fees")) / 12 AS "average_profit"
      FROM limit_orders
      WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "product_id" = $2 AND "filled_at" > now() - '12 weeks'::interval;`;
      // WHERE "side" = 'SELL' AND "settled" = 'true' AND "userID" = $1 AND "product_id" = $2 AND "filled_at" > now() - '4 weeks'::interval;`;
      const productResult = await pool.query(productSqlText, [userID, product]);
      const profit = {
        duration: '12 Week Avg',
        allProfit: result.rows[0].average_profit || 0,
        productProfit: productResult.rows[0].average_profit || 0
      }
      resolve(profit);
    } catch (err) {
      reject(err);
    }
  })
}



export async function getNewestCandle(product_id, granularity) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
      SELECT * FROM "market_candles" 
      WHERE "product_id" = $1 AND "granularity" = $2
      ORDER BY "start" DESC LIMIT 1;`;
      const result = await pool.query(sqlText, [product_id, granularity]);
      resolve(result.rows[0]);
    } catch (err) {
      devLog('error getting most recent candle', err);
      reject(err);
    }
  })
}

export async function getOldestCandle(product_id, granularity) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
      SELECT * FROM "market_candles" 
      WHERE "product_id" = $1 AND "granularity" = $2
      ORDER BY "start" ASC LIMIT 1;`;
      const result = await pool.query(sqlText, [product_id, granularity]);
      resolve(result.rows[0]);
    } catch (err) {
      devLog('error getting oldest candle', err);
      reject(err);
    }
  })
}

// save an array of candles to the database
export async function saveCandlesOld(productID, granularity, candles) {
  return new Promise(async (resolve, reject) => {
    try {
      // save each candle to the database unless it already exists
      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        // devLog('candle', candle, productID, granularity);
        // candleID is a concatenation of the productID, the granularity and the start time
        const candleID = productID + granularity + candle.start;
        const insertSqlText = `INSERT INTO market_candles (candle_id, product_id, granularity, start, low, high, high_low_ratio, open, close, volume)
          VALUES ($1, $2, $3, $4, $5, $6, ($6::numeric / $5::numeric), $7, $8, $9)
          ON CONFLICT (candle_id) DO NOTHING;`;
        await pool.query(insertSqlText, [candleID, productID, granularity, candle.start, candle.low, candle.high, candle.open, candle.close, candle.volume]);
        // }
      }
      resolve();
    } catch (err) {
      devLog('error saving candles');
      reject(err);
    }
  })
}

export async function saveCandles(productID, granularity, candles) {
  return new Promise(async (resolve, reject) => {
    try {
      // candles is an array of objects with properties that correspond to the columns in the database
      // sql loop to insert all candles at once from the candles array without closing the connection
      let insertSqlText = `INSERT INTO market_candles (candle_id, product_id, granularity, start, low, high, high_low_ratio, open, close, volume)
      VALUES `;
      let values = [];
      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        // candleID is a concatenation of the productID, the granularity and the start time
        const candleID = productID + granularity + candle.start;
        values.push(candleID, productID, granularity, candle.start, candle.low, candle.high, candle.open, candle.close, candle.volume);
        if (i < candles.length - 1) {
          insertSqlText += `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, ($${i * 9 + 6}::numeric / $${i * 9 + 5}::numeric), $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9}), `;
        } else {
          insertSqlText += `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, ($${i * 9 + 6}::numeric / $${i * 9 + 5}::numeric), $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})
          ON CONFLICT (candle_id) DO NOTHING;`;
        }
      }
      // devLog('insertSqlText', insertSqlText);
      await pool.query(insertSqlText, values);
      resolve();
    } catch (err) {
      devLog('error saving candles');
      reject(err);
    }
  })
}


export async function getMissingCandles({ productID, granularity }) {
  return new Promise(async (resolve, reject) => {
    try {
      // get start value for all candles in the database
      const sqlText = `SELECT "start" FROM "market_candles" WHERE "product_id" = $1 AND "granularity" = $2 ORDER BY "start" ASC;`;
      const result = await pool.query(sqlText, [productID, granularity.name]);
      // devLog('result.rows', result.rows);
      const candleStarts = result.rows.map(candle => candle.start);

      // if there are more than one candle, 
      // ensure that the distance between each candle is the same as the seconds of granularity as defined in the granularitySeconds object
      const missing = [];
      if (candleStarts.length > 1) {
        devLog(`checking ${candleStarts.length} candleStarts for integrity`)
        let integrity = true;
        for (let i = 1; i < candleStarts.length; i++) {
          const currentStart = Number(candleStarts[i]);
          const previousStart = Number(candleStarts[i - 1]);
          const distance = currentStart - previousStart;
          const distanceNeeded = granularity.value;
          if (distance !== distanceNeeded) {
            // devLog('distance', distance, 'distanceNeeded', distanceNeeded);
            integrity = false;
            // if the integrity is compromised, find the missing candleStarts
            for (let j = previousStart + distanceNeeded; j < currentStart; j += distanceNeeded) {
              missing.push(j);

            }
          }
        }
        if (integrity) {
          devLog('candleStarts array integrity is GOOD');
        } else {
          devLog('candleStarts array integrity is compromised,', missing.length, 'missing candleStarts');
        }
      }


      devLog('candleStarts', candleStarts.length);
      resolve(missing);
    } catch (err) {
      devLog('error getting missing candles', err);
      reject(err);
    }
  })
}








// get all candles for a product and granularity
export async function getCandles(productID, granularity, start, end) {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('getting candles FROM DB', productID, granularity, start, end);
      const sqlText = `SELECT * FROM "market_candles" WHERE "product_id" = $1 AND "granularity" = $2 AND "start" BETWEEN $3 AND $4;`;
      let result = await pool.query(sqlText, [productID, granularity, start, end]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

// get the candle with the lowest start that is higher than the given start
export async function getNextCandles(productID, granularity, start) {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('getting next candles FROM DB', productID, granularity, start);
      const sqlText = `
      SELECT * FROM "market_candles" 
      WHERE "product_id" = $1 AND "granularity" = $2 AND "start" > $3 
      ORDER BY "start" ASC;`;
      let result = await pool.query(sqlText, [productID, granularity, start]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

// get average high low ratio for a product and granularity
export async function getCandlesAverage(productID, granularity) {
  return new Promise(async (resolve, reject) => {
    try {
      // get the unix date in seconds for 30 days ago
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 30);
      // get the average high low ratio for the last 30 days
      const sqlText = `SELECT AVG("high_low_ratio") AS "average" FROM "market_candles" WHERE "product_id" = $1 AND "granularity" = $2 AND "start" > $3;`;
      let result = await pool.query(sqlText, [productID, granularity, thirtyDaysAgo]);
      resolve(result.rows[0]);
    } catch (err) {
      reject(err);
    }
  })
}


export async function addSubscription({ subscription, notificationSettings, user_id }) {
  return new Promise(async (resolve, reject) => {
    try {
      // insert the subscription into the database, or update it if it already exists, then return the result
      const sqlText = `INSERT INTO "subscriptions" ("user_id", "endpoint", "expiration_time", "keys", "daily_notifications", "notification_time")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("endpoint") DO UPDATE SET "user_id" = $1, "expiration_time" = $3, "keys" = $4, "daily_notifications" = $5, "notification_time" = $6
      RETURNING *;`;
      const values = [user_id, subscription.endpoint, subscription.expirationTime, JSON.stringify(subscription.keys), notificationSettings.dailyNotifications, notificationSettings.dailyNotificationsTime];
      const result = await pool.query(sqlText, values);
      resolve(result);
    } catch (err) {
      devLog('error adding or updating subscription in db', err);
      reject(err);
    }
  })
}

export async function getSubscriptionsForUser(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "subscriptions" WHERE "user_id" = $1;`;
      const result = await pool.query(sqlText, [userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

export async function getAllSubscriptions() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "subscriptions";`;
      const result = await pool.query(sqlText);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}



const databaseClient = {
  importTrade: importTrade,
  
  // products
  insertProducts: insertProducts,
  getProduct: getProduct,
  getActiveProducts: getActiveProducts,
  getActiveProductIDs: getActiveProductIDs,
  getUserProducts: getUserProducts,
  updateProductActiveStatus: updateProductActiveStatus,
  
  
  // limit orders
  getSingleTrade,
  getTradesByIDs,
  getSettledTrades,
  getUnsettledTrades,
  getLimitedUnsettledTrades,
  getUnsettledTradesByIDs,
  getAllSettledTrades,
  getUnfilledTradesByIDs,
  getAllOrders,
  getUnsettledTradeCounts,
  getUnsettledTradesByProduct,
  getReorders,
  getDeSyncs,
  checkIfCancelling,
  storeTrade,
  updateTrade,
  setSingleReorder,
  setManyReorders,
  setReorder,
  markAsFlipped,
  deleteTrade,
  markForCancel,
  deleteMarkedOrders,
  


  getSpentUSD: getSpentUSD,
  getSpentBTC: getSpentBTC,
  getSpentBase: getSpentBase,
  getSpentQuote: getSpentQuote,
  getUser: getUser,
  getAllUsers: getAllUsers,
  getAllUserAndSettings: getAllUserAndSettings,
  getUserAndSettings: getUserAndSettings,
  getUserAPI: getUserAPI,

  // bot settings
  getBotSettings: getBotSettings,
  toggleMaintenance: toggleMaintenance,
  toggleRegistration: toggleRegistration,
  getRegistrationOpen: getRegistrationOpen,
  updateLoopSpeed: updateLoopSpeed,
  updateFullSync: updateFullSync,
  updateOrdersToSync: updateOrdersToSync,

  setPause: setPause,
  setKillLock: setKillLock,
  setAutoSetupNumber: setAutoSetupNumber,
  saveFees: saveFees,
  getProfitForDurationByProduct: getProfitForDurationByProduct,
  getProfitForDurationByAllProducts: getProfitForDurationByAllProducts,
  getProfitSinceDate: getProfitSinceDate,
  getWeeklyAverageProfit: getWeeklyAverageProfit,
  getNewestCandle: getNewestCandle,
  getOldestCandle: getOldestCandle,
  saveCandles: saveCandles,
  getCandles: getCandles,
  getCandlesAverage: getCandlesAverage,
  getNextCandles: getNextCandles,
  getMissingCandles: getMissingCandles,
  addSubscription: addSubscription,
  getSubscriptionsForUser: getSubscriptionsForUser,
  getAllSubscriptions: getAllSubscriptions,
};
export { databaseClient };