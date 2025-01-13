import { addProductDecimals, devLog as devLogUtilities } from '../utilities.js';
import { pool } from '../pool.js';
import { cacheEvents, emitCacheEvent } from '../cacheEvents.js';

let showLogs = false;

// todo - add a panel in the admin page to toggle this
export function toggleProductDBLogs(bool) {
  showLogs = bool;
}

function devLog(...message) {
  if (showLogs) {
    devLogUtilities(...message);
  }
}

export const updateProductsTable = async () => {

  const productsColumnsResult = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='products';
  `);

  const columns = productsColumnsResult.rows.map(row => row.column_name);

  if (!columns.includes('base_increment_decimals')) {
    devLog('<><> adding base_increment_decimals column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN base_increment_decimals numeric(32,16);
  `);
  }

  if (!columns.includes('quote_increment_decimals')) {
    devLog('<><> adding quote_increment_decimals column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN quote_increment_decimals numeric(32,16);
  `);
  }


  if (!columns.includes('quote_inverse_increment')) {
    devLog('<><> adding quote_inverse_increment column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN quote_inverse_increment numeric(32,16);
  `);
  }


  if (!columns.includes('base_inverse_increment')) {
    devLog('<><> adding base_inverse_increment column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN base_inverse_increment numeric(32,16);
  `);
  }

  if (!columns.includes('price_rounding')) {
    devLog('<><> adding price_rounding column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN price_rounding numeric(32,16);
  `);
  }

  if (!columns.includes('pbd')) {
    devLog('<><> adding pbd column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN pbd numeric;
  `);
  }

  if (!columns.includes('pqd')) {
    devLog('<><> adding pqd column <><>');
    await pool.query(`
    ALTER TABLE products 
    ADD COLUMN pqd numeric;
  `);
  }
}

const productsCache = new Map();

// helper functions

// get a product cache for a user
function getProductCache(userID) {
  if (!productsCache.has(userID)) {
    productsCache.set(userID, {
      singleProducts: new Map(),
      activeProducts: null,
      activeProductIDs: null,
      userProducts: null
    });
  }
  return productsCache.get(userID);
}

// clear a product cache for a user
function clearProductCache(userID) {
  productsCache.delete(userID);
  emitCacheEvent(cacheEvents.PRODUCTS_UPDATED, userID);
  console.log('products cache cleared for userID', userID, 'event emitted');
}


// get a product by product id
export const getProduct = (productID, userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getProductCache(userID); // if cache is not found, it will be created by the getProductCache function
      if (cache.singleProducts.has(productID)) {
        devLog('product found in cache');
        resolve(cache.singleProducts.get(productID));
      } else {
        devLog('product not found in cache, fetching from DB');
        const sqlText = `SELECT * FROM "products" WHERE "product_id" = $1 AND "user_id" = $2;`;
        const result = await pool.query(sqlText, [productID, userID]);
        const product = result.rows[0];
        if (product) {
          cache.singleProducts.set(productID, product);
        }
        resolve(product);
      }
    } catch (error) {
      devLog('Error in getProduct', error);
      reject(error);
    }
  });
}


// get all active products in the portfolio
export const getActiveProducts = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getProductCache(userID);
      if (cache.activeProducts) {
        devLog('active products found in cache');
        resolve(cache.activeProducts);
      } else {
        devLog('active products not found in cache, fetching from DB');
        const sqlText = `SELECT * FROM "products" WHERE "user_id" = $1 AND "active_for_user" = true ORDER BY "activated_at" ASC;`;
        const result = await pool.query(sqlText, [userID]);
        cache.activeProducts = result.rows;
        resolve(result.rows);
      }
    } catch (error) {
      devLog('Error in getActiveProducts', error);
      reject(error);
    }
  });
}


// get all active products in the portfolio
export const getActiveProductIDs = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getProductCache(userID);
      if (cache.activeProductIDs) {
        devLog('active product IDs found in cache');
        resolve(cache.activeProductIDs);
      } else {
        devLog('active product IDs not found in cache, fetching from DB');
        const activeProducts = await getActiveProducts(userID);
        // get the product ids from the results and put them in an array
        const productIDs = [];
        for (let product of activeProducts) {
        productIDs.push(product.product_id);
        }
        cache.activeProductIDs = productIDs;
        resolve(productIDs);
      }
    } catch (error) {
      devLog('Error in getActiveProductIDs', error);
      reject(error);
    }
  });
}


// get all products in the portfolio that have USD as the quote currency
// this will be displayed in the client as available products to trade
export const getUserProducts = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getProductCache(userID);
      if (cache.userProducts) {
        devLog('user products found in cache');
        resolve(cache.userProducts);
      } else {
        devLog('user products not found in cache, fetching from DB');
        // get which products are currently traded in the portfolio
        const sqlText = `SELECT * FROM "products" WHERE "user_id"=$1 AND "quote_currency_id" = 'USD' AND "volume_24h" IS NOT NULL ORDER BY "volume_24h"*"price" DESC;`;
        const products = await pool.query(sqlText, [userID]);
        cache.userProducts = products.rows;
        resolve(products.rows);
      }
    } catch (err) {
      reject(err);
    }
  });
}


// function to insert an array of products into the database for a user
// if the product already exists for the user, everything EXCEPT "active_for_user" is updated.
// if the product_id is BTC-USD, make sure to set active_for_user to true
export const insertProducts = (products, userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // first get which products are in the portfolio
      const productsSqlText = `SELECT "product_id" FROM "products" WHERE "user_id" = $1;`;
      const results = await pool.query(productsSqlText, [userID]);
      const productsInPortfolio = results.rows.map((row) => row.product_id);

      // now loop through the products and insert them into the database
      // if they already exist, update them
      for (let i = 0; i < products.length; i++) {
        // const product = products[i];
        const product = addProductDecimals(products[i]);
        if (productsInPortfolio.includes(product.product_id)) {
          // devLog('product already exists for user, updating');
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
          "mid_market_price" = $26,
          "base_increment_decimals" = $27,
          "quote_increment_decimals" = $28,
          "quote_inverse_increment" = $29,
          "base_inverse_increment" = $30,
          "price_rounding" = $31,
          "pbd" = $32,
          "pqd" = $33
          WHERE "product_id" = $34 AND "user_id" = $35;`;
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
            product.base_increment_decimals || null,
            product.quote_increment_decimals || null,
            product.quote_inverse_increment || null,
            product.base_inverse_increment || null,
            product.price_rounding || null,
            product.pbd || null,
            product.pqd || null,
            product.product_id,
            userID,
          ]);
        } else {
          // devLog('product does not exist for user, inserting');
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
          "mid_market_price",
          "base_increment_decimals",
          "quote_increment_decimals",
          "quote_inverse_increment",
          "base_inverse_increment",
          "price_rounding",
          "pbd",
          "pqd"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,$29,$30,$31,$32,$33,$34,$35);`;
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
            product.base_increment_decimals || null,
            product.quote_increment_decimals || null,
            product.quote_inverse_increment || null,
            product.base_inverse_increment || null,
            product.price_rounding || null,
            product.pbd || null,
            product.pqd || null,
          ]);
          // if the product_id is BTC-USD, set active_for_user to true
          if (product.product_id === 'BTC-USD') {
            const updateSqlText = `UPDATE "products" SET "active_for_user" = true WHERE "product_id" = $1 AND "user_id" = $2;`;
            await pool.query(updateSqlText, [product.product_id, userID]);
          }
        }
      }
      devLog('clearing product cache');
      clearProductCache(userID);
      resolve();
    } catch (error) {
      devLog('Error in updateProducts', error);
      reject(error);
    }
  });
}





// update the active_for_user column for a product
export const updateProductActiveStatus = (userID, productID, active) => {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "products" SET "active_for_user" = $1, "activated_at" = now() WHERE "user_id" = $2 AND "product_id" = $3;`;
      await pool.query(sqlText, [active, userID, productID]);
      devLog('clearing product cache');
      clearProductCache(userID);
      resolve();
    } catch (error) {
      devLog('Error in updateProductActiveStatus', error);
      reject(error);
    }
  });
}
