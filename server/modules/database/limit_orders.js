import { pool } from "../pool.js";
import { devLog as devLogUtilities } from "../utilities.js";
import { v4 as uuidv4 } from 'uuid';
import { getActiveProductIDs } from "./products.js";

let showLogs = true;
const logTypes = {
  GETTER: true,
  SETTER: true,
  UPDATER: true,
  OTHER: false,
  ERROR: true
}

export function toggleLimitOrderDBLogs(bool) {
  showLogs = bool;
}

function devLog(...message) {
  if (showLogs && logTypes[message[0]] !== false) {
    // if the first message is a log type, remove it
    if (logTypes[message[0]]) {
      message.shift();
    }
    devLogUtilities(...message);
  }
}

export const updateLimitOrdersTable = async () => {
  const user_id_fkey_rows = await pool.query(`
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'limit_orders_user_id_fkey'
  `);

  if (user_id_fkey_rows.rows.length === 0) {
    devLog('<><> Adding limit_orders_user_id_fkey constraint <><>');
    await pool.query(`
      ALTER TABLE limit_orders 
      ADD CONSTRAINT limit_orders_user_id_fkey 
      FOREIGN KEY ("userID") REFERENCES "user" (id) ON DELETE SET NULL;
    `);
  } else {
    devLog('<><> limit_orders_user_id_fkey constraint already exists <><>');
  }
}

// cache
const limitOrdersCache = {
  // For single trades by order_id
  singleTrades: new Map(), // userID -> order_id -> trade

  // For user-based queries
  userTrades: new Map(),   // userID -> {
  // settled: null,         //   Settled trades for user
  // unsettled: null,      //   Unsettled trades for user
  // limited: null,        //   Limited unsettled trades
  // all: null             //   All orders for user
  // }

  // for counting deleted trades
  // when the delete trade route is called, it will increment the count for the userID
  // then when deleteMarkedOrders is called, it will decrement the count for the userID
  // deleteMarkedOrders will only run if the count is greater than 0
  deletedTrades: {}, // userID -> count
};

// get the user cache for a user
function getUserTradesCache(userID) {
  if (!limitOrdersCache.userTrades.has(userID)) {
    limitOrdersCache.userTrades.set(userID, {
      settled: null,
      unsettled: null,
      unsettledTradesByIDs: new Map(),
      limited: null,
      all: null
    });
  }
  return limitOrdersCache.userTrades.get(userID);
}

// clear the user cache for a user
function clearUserTradesCache(userID) {
  if (userID) {
    limitOrdersCache.userTrades.delete(userID);
  }
}

function clearAllUserCaches(userID) {
  clearUserTradesCache(userID);
  clearSingleTradeCache(userID);
}

function getSingleTradeCache(userID, order_id) {
  if (!limitOrdersCache.singleTrades.has(userID)) {
    limitOrdersCache.singleTrades.set(userID, new Map());
  }
  return limitOrdersCache.singleTrades.get(userID).get(order_id);
}

// clear the single trade cache for an order_id
function clearSingleTradeCache(userID) {
  if (userID) {
    limitOrdersCache.singleTrades.delete(userID);
  }
}

// helper function to get the count of deleted trades for a user
function getDeletedTradeCount(userID) {
  if (!limitOrdersCache.deletedTrades[userID]) {
    limitOrdersCache.deletedTrades[userID] = 0;
  }
  return limitOrdersCache.deletedTrades[userID];
}

// helper function to increment the count of deleted trades for a user
function incrementDeletedTradeCount(userID) {
  if (limitOrdersCache.deletedTrades[userID] === undefined) {
    limitOrdersCache.deletedTrades[userID] = 0;
  }
  limitOrdersCache.deletedTrades[userID]++;
}

// helper function to decrement the count of deleted trades for a user
function decrementDeletedTradeCount(userID) {
  if (limitOrdersCache.deletedTrades[userID] > 0) {
    limitOrdersCache.deletedTrades[userID]--;
  }
}

// get all details of an order
export const getSingleTrade = (order_id, userID) => {
  return new Promise((resolve, reject) => {
    devLog('getSingleTrade', 'GETTER');
    const sqlText = `SELECT * FROM "limit_orders" WHERE "order_id"=$1 AND "userID"=$2;`;
    pool.query(sqlText, [order_id, userID])
      .then((results) => {
        const [singleTrade] = results.rows;
        // promise returns promise from pool if success
        resolve(singleTrade);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}

// get all details of an array of orders
export const getTradesByIDs = (userID, IDs) => {
  return new Promise(async (resolve, reject) => {
    devLog('getTradesByIDs', 'GETTER');
    const sqlText = `select *
    from limit_orders
    where order_id = ANY ($1) and "userID" = $2;`;
    try {
      let result = await pool.query(sqlText, [IDs, userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// This will get trades that have settled but not yet been flipped, meaning they need to be processed
export const getSettledTrades = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userCache = getUserTradesCache(userID);
      if (userCache.settled) {
        // devLog('GETTER', 'getSettledTrades CACHE HIT');
        resolve(userCache.settled);
        return;
      }
      devLog('GETTER', 'getSettledTrades CACHE MISS');
      // check all trades in db that are both settled and NOT flipped
      const sqlText = `SELECT * FROM "limit_orders" WHERE "settled"=true AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;

      const results = await pool.query(sqlText, [userID])
      // .then((results) => {
      const settled = results.rows;
      // update the user cache
      userCache.settled = settled;
      // promise returns promise from pool if success
      devLog('GETTER', 'getSettledTrades CACHE SET');
      resolve(settled);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
    // const end = performance.now();
    // devLog(`getSettledTrades took ${end - start}ms`);
  });
}

// get a number of open orders in DB based on side. This will return them whether or not they are synced with CBP
// can be limited by how many should be synced, or how many should be shown on the interface 
// depending on where it is being called from
// this is very similar to the function above, but gets only one side at a time so they are easier to split
export const getUnsettledTrades = (side, userID, max_trade_load) => {
  return new Promise(async (resolve, reject) => {
    devLog('GETTER', 'getUnsettledTrades');
    let sqlText;
    // the only time 'BUY' or 'SELL' is passed is when the frontend is calling for all trades. 
    // can request a limited amount of data to save on network costs
    if (side == 'BUY') {
      // gets all unsettled buys, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "limit_price" DESC
      LIMIT $2;`;
      pool.query(sqlText, [userID, max_trade_load])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'SELL') {
      // gets all unsettled sells, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "limit_price" ASC
      LIMIT $2;`;
      pool.query(sqlText, [userID, max_trade_load])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'all') {
      // gets all unsettled trades, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "limit_price" ASC;`;
      pool.query(sqlText, [userID])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else {
      reject({ error: `no "side" parameter. Use 'BUY' 'SELL' or 'all'` })
    }
  });
}

// gets all open orders in db based on a specified limit. 
// The limit is for each side, so the results will potentially double that
export const getLimitedUnsettledTrades = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    // get limit of buys
    // get limit of sells
    try {
      devLog('GETTER', 'getLimitedUnsettledTrades');
      // first get which products are in the portfolio
      const products = await getActiveProductIDs(userID);
      // devLog('products', products);
      let sqlText = `
      (SELECT * FROM "limit_orders" 
      WHERE "side" = 'SELL' AND "flipped" = false AND "settled" = false AND "will_cancel" = false AND "userID" = $1 AND "product_id" = $2 ORDER BY "limit_price" ASC LIMIT $3)
      UNION
      (SELECT * FROM "limit_orders" 
      WHERE "side" = 'BUY' AND "flipped" = false AND "settled" = false AND "will_cancel" = false AND "userID" = $1 AND "product_id" = $2 ORDER BY "limit_price" DESC LIMIT $3)
      ORDER BY "limit_price" DESC; `;
      let results = [];
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productResults = await pool.query(sqlText,
          [userID, product, limit]);
        results = [...results, ...productResults.rows];
      }
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

// get all details of an array of order IDs
export const getUnsettledTradesByIDs = (userID, IDs, IDsString) => {
  return new Promise(async (resolve, reject) => {
    // devLog('GETTER', 'getUnsettledTradesByIDs', IDsString);
    const cache = getUserTradesCache(userID);
    const cacheKey = `${userID}-${IDsString}`;
    if (cache.unsettledTradesByIDs.has(cacheKey)) {
      resolve(cache.unsettledTradesByIDs.get(cacheKey));
      return;
    }
    const sqlText = `select *
    from limit_orders
    where order_id = ANY ($1) and settled=false and "userID" = $2;`;
    try {
      let result = await pool.query(sqlText, [IDs, userID]);
      cache.unsettledTradesByIDs.set(cacheKey, result.rows);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// This will get trades that have settled but not yet been flipped, meaning they need to be processed
export const getAllSettledTrades = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('GETTER', 'getAllSettledTrades');
      // check all trades in db that are settled
      const sqlText = `SELECT * FROM "limit_orders" WHERE "settled"=true AND "userID"=$1;`;

      const results = await pool.query(sqlText, [userID])
      // .then((results) => {
      const settled = results.rows;
      // promise returns promise from pool if success
      resolve(settled);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// get all details of an array of order IDs
export const getUnfilledTradesByIDs = (userID, IDs) => {
  return new Promise(async (resolve, reject) => {
    devLog('GETTER', 'getUnfilledTradesByIDs');
    const sqlText = `select *
    from limit_orders
    where order_id = ANY ($1) and filled_at IS NULL and settled=true and "userID" = $2;`;
    try {
      let result = await pool.query(sqlText, [IDs, userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// This will get orders for a user
export const getAllOrders = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('GETTER', 'getAllOrders');
      const sqlText = `SELECT * FROM "limit_orders" WHERE "userID"=$1;`;

      const results = await pool.query(sqlText, [userID])
      // .then((results) => {
      const settled = results.rows;
      // promise returns promise from pool if success
      resolve(settled);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// get the number of open orders from the DB
export const getUnsettledTradeCounts = (userID, product) => {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('GETTER', 'getUnsettledTradeCounts');
      // get total open buys
      let sqlTextBuys = `SELECT COUNT(*) FROM "limit_orders" WHERE "userID"=$1 AND settled=false AND side='BUY' AND "product_id"=$2;`;

      // get total open sells
      let sqlTextSells = `SELECT COUNT(*) FROM "limit_orders" WHERE "userID"=$1 AND settled=false AND side='SELL' AND "product_id"=$2;`;

      const totals = await Promise.all([
        pool.query(sqlTextBuys, [userID, product]),
        pool.query(sqlTextSells, [userID, product])
      ])
      const [totalOpenBuys] = totals[0].rows;
      const [totalOpenSells] = totals[1].rows;

      // combine buys and sells for total
      const totalOpenOrders = { count: Number(totalOpenBuys.count) + Number(totalOpenSells.count) };

      const unsettledOrderCounts = {
        totalOpenOrders,
        totalOpenBuys,
        totalOpenSells
      }

      // promise returns promise from pool if success
      resolve(unsettledOrderCounts);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// get a number of open orders in DB based on side. This will return them whether or not they are synced with CBP
// can be limited by how many should be synced, or how many should be shown on the interface 
// depending on where it is being called from
// this is very similar to the function above, but gets only one side at a time so they are easier to split
export const getUnsettledTradesByProduct = (side, product, userID, max_trade_load) => {
  return new Promise(async (resolve, reject) => {
    devLog('GETTER', 'getUnsettledTradesByProduct');
    let sqlText;
    // the only time 'BUY' or 'SELL' is passed is when the frontend is calling for all trades. 
    // can request a limited amount of data to save on network costs
    if (side == 'BUY') {
      // gets all unsettled buys, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "product_id"=$1 AND "userID"=$2
      ORDER BY "limit_price" DESC
      LIMIT $3;`;
      pool.query(sqlText, [product, userID, max_trade_load])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'SELL') {
      // gets all unsettled sells, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "product_id"=$1 AND "userID"=$2
      ORDER BY "limit_price" ASC
      LIMIT $3;`;
      pool.query(sqlText, [product, userID, max_trade_load])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'all') {
      // gets all unsettled trades, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "flipped"=false AND "will_cancel"=false AND "product_id"=$1 AND "userID"=$2
      ORDER BY "limit_price" ASC;`;
      pool.query(sqlText, [userID])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else {
      reject({ error: `no "side" parameter. Use 'BUY' 'SELL' or 'all'` })
    }
  });
}

// get [limit] number of orders closest to the spread
export const getReorders = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('GETTER', 'getReorders');
      // first get active products
      const products = await getActiveProductIDs(userID);
      // first select the closest trades on either side according to the limit (which is in the bot settings table)
      // then select from the results any that need to be reordered
      let sqlText = `SELECT * FROM (
        (
        SELECT "order_id", "will_cancel", "userID", "limit_price", "reorder", "userID" 
        FROM "limit_orders" 
        WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "product_id" IN ($1) AND "userID"=$2 
        ORDER BY "limit_price" ASC LIMIT $3)
        UNION
        (
        SELECT "order_id", "will_cancel", "userID", "limit_price", "reorder", "userID" 
        FROM "limit_orders" 
        WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "product_id" IN ($1) AND "userID"=$2 
        ORDER BY "limit_price" DESC LIMIT $3)
        ORDER BY "limit_price" DESC
        ) as reorders
        WHERE "reorder"=true;`;
      const results = await pool.query(sqlText, [products, userID, limit]);
      // get the results from the DB for all products

      // .then((results) => {
      const reorders = results.rows;
      // promise returns promise from pool if success
      resolve(reorders);
      // })
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// get all the trades that are outside the limit of the synced orders qty setting, 
// but all still probably synced with CB (based on reorder=false)
export async function getDeSyncs(userID, limit, side) {
  devLog('GETTER', 'getDeSyncs');
  return new Promise(async (resolve, reject) => {
    try {
      // first get active products
      const products = await getActiveProductIDs(userID);

      let results = []
      if (side === 'buys') {
        // WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
        const sqlTextBuys = `SELECT * FROM "limit_orders" 
        WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "reorder"=false AND "userID"=$1 AND "product_id"=$2
        ORDER BY "limit_price" DESC
        OFFSET $3;`;
        for (let i = 0; i < products.length; i++) {
          const product = products[i].product_id;
          const productResults = await pool.query(sqlTextBuys, [userID, product, limit]);
          results = [...results, ...productResults.rows];
        }
        // results = await pool.query(sqlTextBuys, [userID, limit]);
      } else {
        // WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
        const sqlTextSells = `SELECT * FROM "limit_orders" 
        WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "reorder"=false AND "userID"=$1 AND "product_id"=$2
        ORDER BY "limit_price" ASC
        OFFSET $3;`;
        for (let i = 0; i < products.length; i++) {
          const product = products[i].product_id;
          const productResults = await pool.query(sqlTextSells, [userID, product, limit]);
          results = [...results, ...productResults.rows];
        }
        // results = await pool.query(sqlTextSells, [userID, limit]);
      }
      resolve(results);
    } catch (err) {
      reject(err);
    }
  })
}

// check to see if a trade is being canceled by the user
// when the user kills a trade-pair, the current open order is first set to will_cancel=true 
// this is because it can take a few seconds to connect and cancel on CBP, so the order should be ignored while this is happening
// connecting to the DB and setting will_cancel to true is much faster
export const checkIfCancelling = async (order_id) => {
  devLog('GETTER', 'checkIfCancelling');
  return new Promise(async (resolve, reject) => {
    try {
      let sqlText;
      // put sql stuff here, extending the pool promise to the parent function
      sqlText = `SELECT * FROM "limit_orders" WHERE "order_id"=$1;`;
      let result = await pool.query(sqlText, [order_id]);
      const singleTrade = result.rows[0];
      // promise returns promise from pool if success
      resolve(singleTrade?.will_cancel);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// stores the details of a trade-pair. The originalDetails are details that stay with a trade-pair when it is flipped
// flipped_at is the "Time" shown on the interface. It has no other function
export const storeTrade = (newOrder, originalDetails, flipped_at) => {
  devLog('SETTER', 'storeTrade');
  devLog('NEW ORDER IN STORETRADE', newOrder, 'originalDetails', originalDetails, 'flipped_at', flipped_at);
  return new Promise(async (resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "limit_orders" 
      (
      "order_id",
      "userID",
      "original_buy_price",
      "original_sell_price",
      "trade_pair_ratio",
      "flipped_at",
      "reorder",
      "product_id",
      "coinbase_user_id",
      "base_size",
      "limit_price",
      "post_only",
      "side",
      "client_order_id",
      "next_client_order_id",
      "status",
      "time_in_force",
      "created_time",
      "completion_percentage",
      "filled_size",
      "average_filled_price",
      "fee",
      "number_of_fills",
      "filled_value",
      "pending_cancel",
      "size_in_quote",
      "total_fees",
      "previous_total_fees",
      "size_inclusive_of_fees",
      "total_value_after_fees",
      "trigger_status",
      "order_type",
      "reject_reason",
      "settled",
      "product_type",
      "reject_message",
      "cancel_message"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
      ON CONFLICT ("order_id") DO UPDATE SET 
      "order_id" = EXCLUDED."order_id",
      "userID" = EXCLUDED."userID",
      "original_buy_price" = EXCLUDED."original_buy_price",
      "original_sell_price" = EXCLUDED."original_sell_price",
      "trade_pair_ratio" = EXCLUDED."trade_pair_ratio",
      "flipped_at" = EXCLUDED."flipped_at",
      "reorder" = EXCLUDED."reorder",
      "product_id" = EXCLUDED."product_id",
      "coinbase_user_id" = EXCLUDED."coinbase_user_id",
      "base_size" = EXCLUDED."base_size",
      "limit_price" = EXCLUDED."limit_price",
      "post_only" = EXCLUDED."post_only",
      "side" = EXCLUDED."side",
      "client_order_id" = EXCLUDED."client_order_id",
      "next_client_order_id" = EXCLUDED."next_client_order_id",
      "status" = EXCLUDED."status",
      "time_in_force" = EXCLUDED."time_in_force",
      "created_time" = EXCLUDED."created_time",
      "completion_percentage" = EXCLUDED."completion_percentage",
      "filled_size" = EXCLUDED."filled_size",
      "average_filled_price" = EXCLUDED."average_filled_price",
      "fee" = EXCLUDED."fee",
      "number_of_fills" = EXCLUDED."number_of_fills",
      "filled_value" = EXCLUDED."filled_value",
      "pending_cancel" = EXCLUDED."pending_cancel",
      "size_in_quote" = EXCLUDED."size_in_quote",
      "total_fees" = EXCLUDED."total_fees",
      "previous_total_fees" = EXCLUDED."previous_total_fees",
      "size_inclusive_of_fees" = EXCLUDED."size_inclusive_of_fees",
      "total_value_after_fees" = EXCLUDED."total_value_after_fees",
      "trigger_status" = EXCLUDED."trigger_status",
      "order_type" = EXCLUDED."order_type",
      "reject_reason" = EXCLUDED."reject_reason",
      "settled" = EXCLUDED."settled",
      "product_type" = EXCLUDED."product_type",
      "reject_message" = EXCLUDED."reject_message",
      "cancel_message" = EXCLUDED."cancel_message";`;
    try {
      const results = await pool.query(sqlText, [
        newOrder.order_id,
        originalDetails.userID,
        originalDetails.original_buy_price,
        originalDetails.original_sell_price,
        originalDetails.trade_pair_ratio,
        flipped_at,
        newOrder.reorder || false,
        newOrder.product_id,
        newOrder.coinbase_user_id,
        newOrder.order_configuration.limit_limit_gtc.base_size,
        newOrder.order_configuration.limit_limit_gtc.limit_price,
        newOrder.order_configuration.limit_limit_gtc.post_only,
        newOrder.side,
        newOrder.client_order_id,
        newOrder.next_client_order_id || uuidv4(),
        newOrder.status,
        newOrder.time_in_force,
        newOrder.created_time,
        newOrder.completion_percentage,
        newOrder.filled_size,
        newOrder.average_filled_price,
        Number(newOrder.fee),
        newOrder.number_of_fills,
        newOrder.filled_value,
        newOrder.pending_cancel,
        newOrder.size_in_quote,
        newOrder.total_fees,
        // bring the fees from the previous order to the new one for more accurate profit calculation
        originalDetails.total_fees,
        newOrder.size_inclusive_of_fees,
        newOrder.total_value_after_fees,
        newOrder.trigger_status,
        newOrder.order_type,
        newOrder.reject_reason,
        newOrder.settled,
        newOrder.product_type,
        newOrder.reject_message,
        newOrder.cancel_message,
      ]);
      // update the user cache
      clearAllUserCaches(originalDetails.userID);
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

// hahahahahaha may you never have to change this
// update a trade by any set of parameters
export const updateTrade = (order) => {
  devLog('UPDATER', 'updateTrade');
  return new Promise(async (resolve, reject) => {
    const columns = []
    // add new order to the database
    let first = true;
    let singleSqlText = `UPDATE "limit_orders" SET `;
    let multiSqlText = `UPDATE "limit_orders" SET (`;
    let sqlText = ``;
    if (order.original_buy_price) {
      first ? first = false : sqlText += ', '
      order.original_buy_price && (sqlText += `"original_buy_price"`) && columns.push(order.original_buy_price);
    }
    if (order.original_sell_price) {
      first ? first = false : sqlText += ', '
      order.original_sell_price && (sqlText += `"original_sell_price"`) && columns.push(order.original_sell_price);
    }
    if (order.trade_pair_ratio) {
      first ? first = false : sqlText += ', '
      order.trade_pair_ratio && (sqlText += `"trade_pair_ratio"`) && columns.push(order.trade_pair_ratio);
    }
    if (order.flipped_at) {
      first ? first = false : sqlText += ', '
      order.flipped_at && (sqlText += `"flipped_at"`) && columns.push(order.flipped_at);
    }
    if (order.filled_at) {
      first ? first = false : sqlText += ', '
      order.filled_at && (sqlText += `"filled_at"`) && columns.push(order.filled_at);
    }
    if (order.reorder != null) {
      first ? first = false : sqlText += ', '
      order.reorder != null && (sqlText += `"reorder"`) && columns.push(order.reorder);
    }
    if (order.product_id) {
      first ? first = false : sqlText += ', '
      order.product_id && (sqlText += `"product_id"`) && columns.push(order.product_id);
    }
    if (order.coinbase_user_id) {
      first ? first = false : sqlText += ', '
      order.coinbase_user_id && (sqlText += `"coinbase_user_id"`) && columns.push(order.coinbase_user_id);
    }
    if (order.base_size != null || order.order_configuration?.limit_limit_gtc?.base_size != null) {
      first ? first = false : sqlText += ', '
      order.base_size != null
        ? (sqlText += `"base_size"`) && columns.push(order.base_size)
        : order.order_configuration?.limit_limit_gtc?.base_size != null && (sqlText += `"base_size"`) && columns.push(order.order_configuration?.limit_limit_gtc?.base_size);
    }
    if (order.limit_price != null || order.order_configuration?.limit_limit_gtc?.limit_price != null) {
      first ? first = false : sqlText += ', '
      order.limit_price != null
        ? (sqlText += `"limit_price"`) && columns.push(order.limit_price)
        : order.order_configuration?.limit_limit_gtc?.limit_price != null && (sqlText += `"limit_price"`) && columns.push(order.order_configuration?.limit_limit_gtc?.limit_price);
    }
    if (order.post_only != null || order.order_configuration?.limit_limit_gtc?.post_only != null) {
      first ? first = false : sqlText += ', '

      order.post_only != null
        ? (sqlText += `"post_only"`) && columns.push(order.post_only)
        : order.order_configuration?.limit_limit_gtc?.post_only != null && (sqlText += `"post_only"`) && columns.push(order.order_configuration?.limit_limit_gtc?.post_only);
    }
    if (order.side) {
      first ? first = false : sqlText += ', '
      order.side && (sqlText += `"side"`) && columns.push(order.side);
    }
    if (order.client_order_id) {
      first ? first = false : sqlText += ', '
      order.client_order_id && (sqlText += `"client_order_id"`) && columns.push(order.client_order_id);
    }
    if (order.next_client_order_id) {
      first ? first = false : sqlText += ', '
      order.next_client_order_id && (sqlText += `"next_client_order_id"`) && columns.push(order.next_client_order_id);
    }
    if (order.status) {
      first ? first = false : sqlText += ', '
      order.status && (sqlText += `"status"`) && columns.push(order.status);
    }
    if (order.time_in_force) {
      first ? first = false : sqlText += ', '
      order.time_in_force && (sqlText += `"time_in_force"`) && columns.push(order.time_in_force);
    }
    if (order.created_time) {
      first ? first = false : sqlText += ', '
      order.created_time && (sqlText += `"created_time"`) && columns.push(order.created_time);
    }
    if (order.completion_percentage) {
      first ? first = false : sqlText += ', '
      order.completion_percentage && (sqlText += `"completion_percentage"`) && columns.push(order.completion_percentage);
    }
    if (order.filled_size) {
      first ? first = false : sqlText += ', '
      order.filled_size && (sqlText += `"filled_size"`) && columns.push(order.filled_size);
    }
    if (order.average_filled_price) {
      first ? first = false : sqlText += ', '
      order.average_filled_price && (sqlText += `"average_filled_price"`) && columns.push(order.average_filled_price);
    }
    if (order.fee) {
      first ? first = false : sqlText += ', '
      order.fee && (sqlText += `"fee"`) && columns.push(order.fee);
    }
    if (order.number_of_fills) {
      first ? first = false : sqlText += ', '
      order.number_of_fills && (sqlText += `"number_of_fills"`) && columns.push(order.number_of_fills);
    }
    if (order.filled_value) {
      first ? first = false : sqlText += ', '
      order.filled_value && (sqlText += `"filled_value"`) && columns.push(order.filled_value);
    }
    if (order.pending_cancel != null) {
      first ? first = false : sqlText += ', '
      order.pending_cancel != null && (sqlText += `"pending_cancel"`) && columns.push(order.pending_cancel);
    }
    if (order.will_cancel != null) {
      first ? first = false : sqlText += ', '
      order.will_cancel != null && (sqlText += `"will_cancel"`) && columns.push(order.will_cancel);
    }
    if (order.size_in_quote != null) {
      first ? first = false : sqlText += ', '
      order.size_in_quote != null && (sqlText += `"size_in_quote"`) && columns.push(order.size_in_quote);
    }
    if (order.total_fees) {
      first ? first = false : sqlText += ', '
      order.total_fees && (sqlText += `"total_fees"`) && columns.push(order.total_fees);
    }
    if (order.previous_total_fees) {
      first ? first = false : sqlText += ', '
      order.previous_total_fees && (sqlText += `"previous_total_fees"`) && columns.push(order.previous_total_fees);
    }
    if (order.size_inclusive_of_fees != null) {
      first ? first = false : sqlText += ', '
      order.size_inclusive_of_fees != null && (sqlText += `"size_inclusive_of_fees"`) && columns.push(order.size_inclusive_of_fees);
    }
    if (order.total_value_after_fees) {
      first ? first = false : sqlText += ', '
      order.total_value_after_fees && (sqlText += `"total_value_after_fees"`) && columns.push(order.total_value_after_fees);
    }
    if (order.trigger_status) {
      first ? first = false : sqlText += ', '
      order.trigger_status && (sqlText += `"trigger_status"`) && columns.push(order.trigger_status);
    }
    if (order.order_type) {
      first ? first = false : sqlText += ', '
      order.order_type && (sqlText += `"order_type"`) && columns.push(order.order_type);
    }
    if (order.reject_reason) {
      first ? first = false : sqlText += ', '
      order.reject_reason && (sqlText += `"reject_reason"`) && columns.push(order.reject_reason);
    }
    if (order.settled != null) {
      first ? first = false : sqlText += ', '
      order.settled != null && (sqlText += `"settled"`) && columns.push(order.settled);
    }
    if (order.product_type) {
      first ? first = false : sqlText += ', '
      order.product_type && (sqlText += `"product_type"`) && columns.push(order.product_type);
    }
    if (order.reject_message) {
      first ? first = false : sqlText += ', '
      order.reject_message && (sqlText += `"reject_message"`) && columns.push(order.reject_message);
    }
    if (order.cancel_message) {
      first ? first = false : sqlText += ', '
      order.cancel_message && (sqlText += `"cancel_message"`) && columns.push(order.cancel_message);
    }

    let finalSqlText = (columns.length === 1)
      ? singleSqlText + sqlText + ` = `
      : multiSqlText + sqlText + `) = (`

    first = true;
    // now loop through array of values and keep building the string
    for (let i = 0; i < columns.length; i++) {
      const value = columns[i];
      first ? first = false : finalSqlText += ', '
      finalSqlText += `$${i + 1}`
    }
    finalSqlText += (columns.length === 1)
      ? `\nWHERE "order_id" = $${columns.length + 1}\nRETURNING *;`
      : `)\nWHERE "order_id" = $${columns.length + 1}\nRETURNING *;`;

    columns.push(order.order_id)


    if (columns.length === 2) {

    }

    try {
      const results = await pool.query(finalSqlText, columns)
      // update the user cache
      clearAllUserCaches(order.userID);
      resolve(results.rows[0]);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}


// setting an order to reorder will bypass some functions in the bot that check if the order needs to be reordered.
// setting this to true for trades that are desynced from CB will save time later
export async function setSingleReorder(order_id, userID) {
  devLog('UPDATER', 'setSingleReorder');
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "limit_orders" SET "reorder" = true WHERE "order_id" = $1;`;
      await pool.query(sqlText, [order_id]);
      // update the user cache
      clearAllUserCaches(userID);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// setting an order to reorder will bypass some functions in the bot that check if the order needs to be reordered.
// setting this to true for trades that are desynced from CB will save time later
export async function setManyReorders(idArray, userID) {
  devLog('UPDATER', 'setManyReorders');
  return new Promise(async (resolve, reject) => {
    devLog(idArray, 'setting many reorders');
    try {
      const sqlText = `UPDATE limit_orders
      SET "reorder" = true 
      WHERE "order_id" = ANY ($1);`;

      await pool.query(sqlText, [idArray]);
      // update the user cache
      clearAllUserCaches(userID);
      resolve();
    } catch (err) {
      devLog('failed to set many reorders', 'ERROR');
      reject(err);
    }
  })
}

// this will set all trades to be reordered. Used when resyncing all orders
// all orders should be cancelled on CB when doing this
export async function setReorder(userID) {
  devLog('UPDATER', 'setReorder');
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "limit_orders" SET "reorder" = true WHERE "settled"=false AND "userID" = $1;`;
      await pool.query(sqlText, [userID]);
      // update the user cache
      clearAllUserCaches(userID);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// mark an order as flipped. This means the order has been flipped from a buy to a sell or vice versa
export async function markAsFlipped(order_id, userID) {
  devLog('UPDATER', 'markAsFlipped');
  return new Promise(async (resolve, reject) => {
    try {
      devLog('marking as flipped', order_id);
      const sqlText = `UPDATE "limit_orders" SET "flipped" = true WHERE "order_id"=$1;`;
      let result = await pool.query(sqlText, [order_id]);
      // update the user cache
      clearAllUserCaches(userID);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// delete a trade from the DB. Generally this should be done in combination with cancelling a trade on CB
// unless it is a settled trade
export async function deleteTrade(order_id, userID) {
  devLog('UPDATER', 'deleteTrade');
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "limit_orders" WHERE "order_id"=$1;`;
      let result = await pool.query(queryText, [order_id]);
      // update the user cache
      clearAllUserCaches(userID);
      resolve(result);
    } catch (err) {
      reject(err)
    }
  });
}

export async function markForCancel(userID, order_id) {
  incrementDeletedTradeCount(userID);
  devLog('UPDATER', 'markForCancel');
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `UPDATE "limit_orders" 
      SET "will_cancel"=true 
      WHERE "order_id"=$1
      RETURNING *;`;
      let result = await pool.query(queryText, [order_id]);
      // update the user cache
      clearAllUserCaches(userID);
      resolve(result.rows[0]);
    } catch (err) {
      reject(err)
    }
  });
}

// delete all orders that are marked to be cancelled
export async function deleteMarkedOrders(userID) {
  const deletedCount = getDeletedTradeCount(userID);
  if (deletedCount === 0) {
    return;
  }
  devLog('UPDATER', 'deleteMarkedOrders');
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "limit_orders" 
      WHERE "will_cancel"=true AND "userID"=$1
      RETURNING *;`;
      let result = await pool.query(queryText, [userID]);
      devLog(result.rows, 'deleteMarkedOrders result');
      // update the user cache
      clearAllUserCaches(userID);
      resolve(result.rows);
      decrementDeletedTradeCount(userID);
    } catch (err) {
      reject(err)
    }
  });
}
