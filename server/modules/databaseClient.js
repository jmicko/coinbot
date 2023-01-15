// const pool = require('./pool');
import { pool } from './pool.js';
// const { v4: uuidv4 } = require('uuid');
import { v4 as uuidv4 } from 'uuid';
import { devLog } from '../../src/shared.js';

// stores the details of a trade-pair. The originalDetails are details that stay with a trade-pair when it is flipped
// flipped_at is the "Time" shown on the interface. It has no other function
const storeTrade = (newOrder, originalDetails, flipped_at) => {
  console.log('NEW ORDER IN STORETRADE', newOrder, 'originalDetails', originalDetails, 'flipped_at', flipped_at);
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37);`;
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
      ])
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

// hahahahahaha may you never have to change this
// update a trade by any set of parameters
const updateTrade = (order) => {
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
      resolve(results.rows[0]);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}


// This function is used when importing trades from the user interface
// IT MUST USE THE USER ID FROM PASSPORT AUTHENTICATION!!!
// otherwise you could import false trades for someone else!
const importTrade = (details, userID) => {
  console.log(details.id, 'details.id in importTrade');
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

// function to insert an array of products into the database for a user
// if the product already exists for the user, everything EXCEPT "active_for_user" is updated.
// if the product_id is BTC-USD, make sure to set active_for_user to true
const insertProducts = (products, userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // first get which products are in the portfolio
      const productsSqlText = `SELECT "product_id" FROM "products" WHERE "user_id" = $1;`;
      const results = await pool.query(productsSqlText, [userID]);
      const productsInPortfolio = results.rows.map((row) => row.product_id);

      // now loop through the products and insert them into the database
      // if they already exist, update them
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (productsInPortfolio.includes(product.product_id)) {
          // update the product
          const updateSqlText = `UPDATE "products" SET
          "quote_currency_id" = $1,
          "base_currency_id" = $2,
          "price" = $3,
          "price_percentage_change_24h" = $4,
          "volume_24h" = $5,
          "volume_percentage_change_24h" = $6,
          "base_increment" = $7,
          "quote_increment" = $8,
          "quote_min_size" = $9,
          "quote_max_size" = $10,
          "base_min_size" = $11,
          "base_max_size" = $12,
          "base_name" = $13,
          "quote_name" = $14,
          "watched" = $15,
          "is_disabled" = $16,
          "new" = $17,
          "status" = $18,
          "cancel_only" = $19,
          "limit_only" = $20,
          "post_only" = $21,
          "trading_disabled" = $22,
          "auction_mode" = $23,
          "product_type" = $24,
          "fcm_trading_session_details" = $25,
          "mid_market_price" = $26
          WHERE "product_id" = $27 AND "user_id" = $28;`;
          await pool.query(updateSqlText, [
            product.quote_currency_id,
            product.base_currency_id,
            product.price || null,
            product.price_percentage_change_24h || null,
            product.volume_24h || null,
            product.volume_percentage_change_24h || null,
            product.base_increment || null,
            product.quote_increment || null,
            product.quote_min_size || null,
            product.quote_max_size || null,
            product.base_min_size || null,
            product.base_max_size || null,
            product.base_name,
            product.quote_name,
            product.watched,
            product.is_disabled,
            product.new,
            product.status,
            product.cancel_only,
            product.limit_only,
            product.post_only,
            product.trading_disabled,
            product.auction_mode,
            product.product_type,
            product.fcm_trading_session_details,
            product.mid_market_price || null,
            product.product_id,
            userID,
          ]);
        } else {
          // insert the product
          const insertSqlText = `INSERT INTO "products" (
          "product_id",
          "user_id",
          "quote_currency_id",
          "base_currency_id",
          "price",
          "price_percentage_change_24h",
          "volume_24h",
          "volume_percentage_change_24h",
          "base_increment",
          "quote_increment",
          "quote_min_size",
          "quote_max_size",
          "base_min_size",
          "base_max_size",
          "base_name",
          "quote_name",
          "watched",
          "is_disabled",
          "new",
          "status",
          "cancel_only",
          "limit_only",
          "post_only",
          "trading_disabled",
          "auction_mode",
          "product_type",
          "fcm_trading_session_details",
          "mid_market_price"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);`;
          await pool.query(insertSqlText, [
            product.product_id,
            userID,
            product.quote_currency_id,
            product.base_currency_id,
            product.price || null,
            product.price_percentage_change_24h || null,
            product.volume_24h || null,
            product.volume_percentage_change_24h || null,
            product.base_increment || null,
            product.quote_increment || null,
            product.quote_min_size || null,
            product.quote_max_size || null,
            product.base_min_size || null,
            product.base_max_size || null,
            product.base_name,
            product.quote_name,
            product.watched,
            product.is_disabled,
            product.new,
            product.status,
            product.cancel_only,
            product.limit_only,
            product.post_only,
            product.trading_disabled,
            product.auction_mode,
            product.product_type,
            product.fcm_trading_session_details,
            product.mid_market_price || null,
          ]);
          // if the product_id is BTC-USD, set active_for_user to true
          if (product.product_id === 'BTC-USD') {
            const updateSqlText = `UPDATE "products" SET "active_for_user" = true WHERE "product_id" = $1 AND "user_id" = $2;`;
            await pool.query(updateSqlText, [product.product_id, userID]);
          }
        }
      }
      resolve();
    } catch (error) {
      console.log('Error in updateProducts', error);
      reject(error);
    }
  });
}

// get a product by product id
const getProduct = (productID, userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "products" WHERE "product_id" = $1 AND "user_id" = $2;`;
      const result = await pool.query(sqlText, [productID, userID]);
      resolve(result.rows[0]);
    } catch (error) {
      console.log('Error in getProduct', error);
      reject(error);
    }
  });
}

// get all active products in the portfolio
const getActiveProducts = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "products" WHERE "user_id" = $1 AND "active_for_user" = true ORDER BY "activated_at" ASC;`;
      const result = await pool.query(sqlText, [userID]);
      resolve(result.rows);
    } catch (error) {
      console.log('Error in getActiveProducts', error);
      reject(error);
    }
  });
}


// get all active products in the portfolio
const getActiveProductIDs = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const activeProducts = await getActiveProducts(userID);
      // get the product ids from the results and put them in an array
      const productIDs = [];
      for (let product of activeProducts) {
        productIDs.push(product.product_id);
      }
      resolve(productIDs);
    } catch (error) {
      console.log('Error in getActiveProductIDs', error);
      reject(error);
    }
  });
}

// update the active_for_user column for a product
const updateProductActiveStatus = (userID, productID, active) => {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "products" SET "active_for_user" = $1, "activated_at" = now() WHERE "user_id" = $2 AND "product_id" = $3;`;
      await pool.query(sqlText, [active, userID, productID]);
      resolve();
    } catch (error) {
      console.log('Error in updateProductActiveStatus', error);
      reject(error);
    }
  });
}


// get all products in the portfolio that have USD as the quote currency
// this will be displayed in the client as available products to trade
const getUserProducts = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // get which products are currently traded in the portfolio
      const sqlText = `SELECT * FROM "products" WHERE "user_id"=$1 AND "quote_currency_id" = 'USD' AND "volume_24h" IS NOT NULL ORDER BY "volume_24h"*"price" DESC;`;
      const products = await pool.query(sqlText, [userID]);

      resolve(products.rows);

    } catch (err) {
      reject(err);
    }
  });
}


// gets all open orders in db based on a specified limit. 
// The limit is for each side, so the results will potentially double that
const getLimitedUnsettledTrades = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    // get limit of buys
    // get limit of sells
    try {
      // first get which products are in the portfolio
      const products = await getActiveProductIDs(userID);
      // console.log('products', products);
      let sqlText = `
      (SELECT * FROM "limit_orders" WHERE "side" = 'SELL' AND "flipped" = false AND "settled" = false AND "will_cancel" = false AND "userID" = $1 AND "product_id" = $2 ORDER BY "limit_price" ASC LIMIT $3)
      UNION
      (SELECT * FROM "limit_orders" WHERE "side" = 'BUY' AND "flipped" = false AND "settled" = false AND "will_cancel" = false AND "userID" = $1 AND "product_id" = $2 ORDER BY "limit_price" DESC LIMIT $3)
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


// get a number of open orders in DB based on side. This will return them whether or not they are synced with CBP
// can be limited by how many should be synced, or how many should be shown on the interface 
// depending on where it is being called from
// this is very similar to the function above, but gets only one side at a time so they are easier to split
const getUnsettledTradesByProduct = (side, product, userID, max_trade_load) => {
  return new Promise(async (resolve, reject) => {
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

// get a number of open orders in DB based on side. This will return them whether or not they are synced with CBP
// can be limited by how many should be synced, or how many should be shown on the interface 
// depending on where it is being called from
// this is very similar to the function above, but gets only one side at a time so they are easier to split
const getUnsettledTrades = (side, userID, max_trade_load) => {
  return new Promise(async (resolve, reject) => {
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

// This will get trades that have settled but not yet been flipped, meaning they need to be processed
const getAllSettledTrades = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
      sqlText = `SELECT * FROM "limit_orders" WHERE "settled"=true AND "userID"=$1;`;

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

// This will get trades that have settled but not yet been flipped, meaning they need to be processed
const getSettledTrades = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
      const sqlText = `SELECT * FROM "limit_orders" WHERE "settled"=true AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;

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


// This will get orders for a user
const getAllOrders = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
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
const getUnsettledTradeCounts = (userID, product) => {
  return new Promise(async (resolve, reject) => {
    try {
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

// get all details of an order
const getSingleTrade = (order_id) => {
  return new Promise((resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    sqlText = `SELECT * FROM "limit_orders" WHERE "order_id"=$1;`;
    pool.query(sqlText, [order_id])
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
const getTradesByIDs = (userID, IDs) => {
  return new Promise(async (resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    sqlText = `select *
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

// get all details of an array of order IDs
const getUnsettledTradesByIDs = (userID, IDs) => {
  return new Promise(async (resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    sqlText = `select *
    from limit_orders
    where order_id = ANY ($1) and settled=false and "userID" = $2;`;
    try {
      let result = await pool.query(sqlText, [IDs, userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// get all details of an array of order IDs
const getUnfilledTradesByIDs = (userID, IDs) => {
  return new Promise(async (resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    sqlText = `select *
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


// get the total USD that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
const getSpentUSD = (userID, makerFee) => {
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
const getSpentQuote = (userID, takerFee, product_id) => {
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
const getSpentBase = (userID, product_id) => {
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
const getSpentBTC = (userID) => {
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

// get [limit] number of orders closest to the spread
const getReorders = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    try {
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

// check to see if a trade is being canceled by the user
// when the user kills a trade-pair, the current open order is first set to will_cancel=true 
// this is because it can take a few seconds to connect and cancel on CBP, so the order should be ignored while this is happening
// connecting to the DB and setting will_cancel to true is much faster
const checkIfCancelling = async (order_id) => {
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

// delete a trade from the DB. Generally this should be done in combination with cancelling a trade on CB
// unless it is a settled trade
const deleteTrade = async (order_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "limit_orders" WHERE "order_id"=$1;`;
      let result = await pool.query(queryText, [order_id]);
      resolve(result);
    } catch (err) {
      reject(err)
    }
  });
}

async function deleteMarkedOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "limit_orders" WHERE "will_cancel"=true AND "userID"=$1;`;
      let result = await pool.query(queryText, [userID]);
      resolve(result);
    } catch (err) {
      reject(err)
    }
  });
}

// get user information
async function getUser(userID) {
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
async function getAllUsers() {
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
async function getUserAndSettings(userID) {
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
async function getUserAPI(userID) {
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

// get all bot settings
async function getBotSettings() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `SELECT * FROM "bot_settings";`;
      let result = await pool.query(sqlText);
      const settings = result.rows[0];
      resolve(settings);
    } catch (err) {
      reject(err);
    }
  })
}

// turns maintenance mode on and off to stop trading on all accounts.
// This prevents loss of data if the bot needs to be shut down 
async function toggleMaintenance() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "bot_settings" SET "maintenance" = NOT "maintenance";`;
      await pool.query(sqlText);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// get all the trades that are outside the limit of the synced orders qty setting, 
// but all still probably synced with CB (based on reorder=false)
async function getDeSyncs(userID, limit, side) {
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

// setting an order to reorder will bypass some functions in the bot that check if the order needs to be reordered.
// setting this to true for trades that are desynced from CB will save time later
async function setSingleReorder(order_id) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "limit_orders" SET "reorder" = true WHERE "order_id" = $1;`;
      await pool.query(sqlText, [order_id]);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// setting an order to reorder will bypass some functions in the bot that check if the order needs to be reordered.
// setting this to true for trades that are desynced from CB will save time later
async function setManyReorders(idArray) {
  return new Promise(async (resolve, reject) => {
    console.log(idArray, 'setting many reorders');
    try {
      const sqlText = `UPDATE limit_orders
      SET "reorder" = true 
      WHERE "order_id" = ANY ($1);`;

      await pool.query(sqlText, [idArray]);
      resolve();
    } catch (err) {
      console.log('failed to set many reorders');
      reject(err);
    }
  })
}

// this will set all trades to be reordered. Used when resyncing all orders
// all orders should be cancelled on CB when doing this
async function setReorder(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "limit_orders" SET "reorder" = true WHERE "settled"=false AND "userID" = $1;`;
      await pool.query(sqlText, [userID]);
      resolve();
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
async function setKillLock(status, userID) {
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


async function setAutoSetupNumber(number, userID) {
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
async function saveFees(fees, userID) {
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

// update the fees and 30 day trade volume
async function markAsFlipped(order_id) {
  return new Promise(async (resolve, reject) => {
    try {
      devLog('marking as flipped', order_id);
      const sqlText = `UPDATE "limit_orders" SET "flipped" = true WHERE "order_id"=$1;`;
      let result = await pool.query(sqlText, [order_id]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// get profit for a product and for all products for a duration of time
async function getProfitForDurationByProduct(userID, product, duration) {
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
async function getProfitForDurationByAllProducts(userID, duration) {
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
async function getProfitSinceDate(userID, date, product) {
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
        duration: 'Since reset',
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

async function getNewestCandle(product_id, granularity) {
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

async function getOldestCandle(product_id, granularity) {
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
async function saveCandlesold(productID, granularity, candles) {
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

async function saveCandles(productID, granularity, candles) {
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


async function getMissingCandles({ productID, granularity }) {
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
async function getCandles(productID, granularity, start, end) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('getting candles FROM DB', userID, productID, granularity, start, end);
      const sqlText = `SELECT * FROM "market_candles" WHERE "product_id" = $1 AND "granularity" = $2 AND "start" BETWEEN $3 AND $4;`;
      let result = await pool.query(sqlText, [productID, granularity, start, end]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

// get the candle with the lowest start that is higher than the given start
async function getNextCandles(productID, granularity, start) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('getting next candles FROM DB', userID, productID, granularity, start);
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
async function getCandlesAverage(productID, granularity) {
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



const databaseClient = {
  storeTrade: storeTrade,
  updateTrade: updateTrade,
  importTrade: importTrade,
  getLimitedUnsettledTrades: getLimitedUnsettledTrades,
  getUnsettledTrades: getUnsettledTrades,
  getUnsettledTradesByProduct: getUnsettledTradesByProduct,
  getSettledTrades: getSettledTrades,
  getAllOrders: getAllOrders,
  insertProducts: insertProducts,
  getActiveProducts: getActiveProducts,
  getActiveProductIDs: getActiveProductIDs,
  getUserProducts: getUserProducts,
  updateProductActiveStatus: updateProductActiveStatus,
  getAllSettledTrades: getAllSettledTrades,
  getUnsettledTradeCounts: getUnsettledTradeCounts,
  getSingleTrade: getSingleTrade,
  getTradesByIDs: getTradesByIDs,
  getUnsettledTradesByIDs: getUnsettledTradesByIDs,
  getUnfilledTradesByIDs: getUnfilledTradesByIDs,
  getSpentUSD: getSpentUSD,
  getSpentBTC: getSpentBTC,
  getSpentBase: getSpentBase,
  getSpentQuote: getSpentQuote,
  getReorders: getReorders,
  deleteTrade: deleteTrade,
  deleteMarkedOrders: deleteMarkedOrders,
  getUser: getUser,
  getAllUsers: getAllUsers,
  getUserAndSettings: getUserAndSettings,
  checkIfCancelling: checkIfCancelling,
  getUserAPI: getUserAPI,
  getBotSettings: getBotSettings,
  toggleMaintenance: toggleMaintenance,
  getDeSyncs: getDeSyncs,
  setSingleReorder: setSingleReorder,
  setReorder: setReorder,
  setManyReorders: setManyReorders,
  setPause: setPause,
  setKillLock: setKillLock,
  setAutoSetupNumber: setAutoSetupNumber,
  saveFees: saveFees,
  markAsFlipped: markAsFlipped,
  getProfitForDurationByProduct: getProfitForDurationByProduct,
  getProfitForDurationByAllProducts: getProfitForDurationByAllProducts,
  getProfitSinceDate: getProfitSinceDate,
  getNewestCandle: getNewestCandle,
  getOldestCandle: getOldestCandle,
  saveCandles: saveCandles,
  getCandles: getCandles,
  getCandlesAverage: getCandlesAverage,
  getNextCandles: getNextCandles,
  getMissingCandles: getMissingCandles,
  getProduct: getProduct,
};

export { databaseClient };