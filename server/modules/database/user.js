import { userStorage } from '../cache.js';
import { cacheEvents, emitCacheEvent, onCacheEvent } from '../cacheEvents.js';
import { pool } from '../pool.js';
import { devLog as devLogUtilities } from '../utilities.js';

let showLogs = false; // set to true to show logs, false to hide them

const logTypes = {
  GETTER: true,
  SETTER: true,
  UPDATER: true,
  OTHER: false,
  ERROR: true
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

// add collumns to store new format of api keys
// Looks like this:
// {
//   "name": "organizations/11111111-2222-3333-4444-555555555555/apiKeys/fasgf345-sfe3-423f-4576-hryjhfd3ty35",
//   "privateKey": "-----BEGIN EC PRIVATE KEY-----\nxxxxx\nxxxx\nxxxx\n-----END EC PRIVATE KEY-----\n"
// }

export async function updateUserTables() {
  devLog('<><> updating user tables <><>');

  const userAPIColumnsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='user_api';
    `);
  const userAPIColumns = userAPIColumnsResult.rows.map(row => row.column_name);
  devLog(userAPIColumns, '<><> user_api columns <><>');

  if (!userAPIColumns.includes('name')) {
    devLog('<><> adding name column to user_api <><>');
    let sqlText = `
    ALTER TABLE "user_api"
    ADD COLUMN "name" text;`;
    await pool.query(sqlText);
  }

  if (!userAPIColumns.includes('privateKey')) {
    devLog('<><> adding privateKey column to user_api <><>');
    let sqlText = `
    ALTER TABLE "user_api"
    ADD COLUMN "privateKey" text;`;
    await pool.query(sqlText);
  }
}

// cache

const singleUserCache = new Map();
const allUsersCache = {
  allUsers: null,
  allUsersAndSettings: null,
};

// helper functions

function getSingleUserCache(userID) {
  if (!singleUserCache.has(userID)) {
    singleUserCache.set(userID, {
      singleUser: null,
      singleUserAndSettings: null,
      singleUserAPI: null,
    });
  }
  return singleUserCache.get(userID);
}

function clearSingleUserCache(userID) {
  devLog('clearSingleUserCache', userID);
  if (!singleUserCache.has(userID)) {
    devLog('singleUserCache does not have userID', userID);
  } else {
    singleUserCache.get(userID).singleUser = null;
  }
}

function clearSingleUserAndSettingsCache(userID) {
  if (!singleUserCache.has(userID)) {
    devLog('singleUserCache does not have userID', userID);
  } else {
    singleUserCache.get(userID).singleUserAndSettings = null;
  }
}

function clearSingleUserAPICache(userID) {
  if (!singleUserCache.has(userID)) {
    devLog('singleUserCache does not have userID', userID);
  } else {
    singleUserCache.get(userID).singleUserAPI = null;
  }
}

function clearAllSingleUserCaches(userID) {
  devLog('clearAllSingleUserCaches', userID);
  clearSingleUserCache(userID);
  clearSingleUserAndSettingsCache(userID);
  clearSingleUserAPICache(userID);
}

function getAllUsersCache() {
  if (!allUsersCache) {
    allUsersCache = {
      allUsers: null,
      allUsersAndSettings: null,
    };
  }
  return allUsersCache;
}

function clearAllUsersCache() {
  allUsersCache.allUsers = null;
}

function clearAllUsersAndSettingsCache() {
  allUsersCache.allUsersAndSettings = null;
}

onCacheEvent(cacheEvents.USER_UPDATED, (userID) => {
  devLog('USER_UPDATED event received', userID);
  clearAllSingleUserCaches(userID);
  clearAllUsersCache();
  clearAllUsersAndSettingsCache();
});

onCacheEvent(cacheEvents.USER_API_UPDATED, (userID) => {
  devLog('USER_API_UPDATED event received', userID);
  clearSingleUserAPICache(userID);
});

onCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, (userID) => {
  devLog('USER_SETTINGS_UPDATED event received', userID);
  clearSingleUserAndSettingsCache(userID);
  clearAllUsersAndSettingsCache();
});




// get user information
export async function getUser(userID) {
  devLog('GETTER', 'getUser');
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getSingleUserCache(userID);
      if (cache.singleUser !== null) {
        devLog('user found in cache');
        resolve(cache.singleUser);
      } else {
        const sqlText = `SELECT * FROM "user" WHERE "id"=$1;`;
        let result = await pool.query(sqlText, [userID]);
        const user = result.rows[0];
        cache.singleUser = user;
        resolve(user);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// get all user information and settings except for the API details. 
// Keeping them separate helps prevent accidentally sending an API outside the server
export async function getUserAndSettings(userID, caller) {
  devLog('GETTER', 'getUserAndSettings', caller ? `called from ${caller}` : 'unknown calling function');
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getSingleUserCache(userID);
      if (cache.singleUserAndSettings !== null) {
        devLog('user and settings found in cache');
        resolve(cache.singleUserAndSettings);
      } else {
        devLog('CACHE MISS! user and settings not found in cache, fetching from DB');
        const sqlText = `SELECT * 
        FROM "user" 
        JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
        WHERE id = $1;`;
        let result = await pool.query(sqlText, [userID]);
        const user = result.rows[0];
        cache.singleUserAndSettings = user;
        resolve(user);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export async function getUserAndSettingsByUsername(username) {
  devLog('GETTER', 'getUserAndSettingsByUsername');
  try {
    const sqlText = `
      SELECT * 
      FROM "user" 
      JOIN "user_settings" 
      ON ("user"."id" = "user_settings"."userID") 
      WHERE "username" = $1;`;
    let result = await pool.query(sqlText, [username]);
    return result.rows[0];
  } catch (err) {
    devLog('problem getting user and settings by username');
    throw err;
  }
}


// get the API details for a user
export async function getUserAPI(userID) {
  devLog('GETTER', 'getUserAPI');
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getSingleUserCache(userID);
      if (cache.singleUserAPI !== null) {
        devLog('user API found in cache');
        resolve(cache.singleUserAPI);
      } else {
        const sqlText = `SELECT * FROM "user_api" WHERE "userID"=$1;`;
        let result = await pool.query(sqlText, [userID]);
        const userAPI = result.rows[0];
        cache.singleUserAPI = userAPI;
        resolve(userAPI);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// pause the bot for a user. Actually causes the bot to ignore all functions and continue looping while doing nothing
export async function setPause(status, userID) {
  devLog('UPDATER', 'setPause');
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" 
      SET "paused" = $1 
      WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [status, userID]);
      emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

// toggles the kill button on the tradelist on the interface
// turning it on will not show the kill button, preventing accidental trade-pair cancellation
export async function setKillLock(status, userID) {
  devLog('UPDATER', 'setKillLock');
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" 
      SET "kill_locked" = $1 
      WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [status, userID]);
      emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}


export async function setAutoSetupNumber(number, userID) {
  devLog('UPDATER', 'setAutoSetupNumber');
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" 
      SET "auto_setup_number" = $1 
      WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [number, userID]);
      emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

// update the fees and 30 day trade volume
export async function saveFees(fees, userID) {
  devLog('UPDATER', 'saveFees');
  return new Promise(async (resolve, reject) => {
    try {
      const totalVolume = Number(fees.advanced_trade_only_volume) + Number(fees.coinbase_pro_volume);
      const sqlText = `UPDATE "user_settings" SET "maker_fee" = $1, "taker_fee" = $2, "usd_volume" = $3  WHERE "userID" = $4`;
      let result = await pool.query(sqlText, [fees.fee_tier.maker_fee_rate, fees.fee_tier.taker_fee_rate, totalVolume, userID]);
      emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

export async function setProfitReset(date, userID) {
  devLog('UPDATER', 'setProfitReset');
  const sqlText = `UPDATE "user_settings" SET "profit_reset" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [date, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function setReinvest(status, userID) {
  devLog('UPDATER', 'setReinvest');
  const sqlText = `UPDATE "user_settings" SET "reinvest" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [status, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function setReinvestRatio(ratio, userID) {
  devLog('UPDATER', 'setReinvestRatio');
  const sqlText = `UPDATE "user_settings" SET "reinvest_ratio" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [ratio, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function setTradeMax(max, userID) {
  devLog('UPDATER', 'setTradeMax');
  const sqlText = `UPDATE "user_settings" SET "max_trade" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [max, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function setMaxTradeSize(size, userID) {
  devLog('UPDATER', 'setMaxTradeSize');
  const sqlText = `UPDATE "user_settings" SET "max_trade_size" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [size, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function setReserve(reserve, userID) {
  devLog('UPDATER', 'setReserve');
  const sqlText = `UPDATE "user_settings" SET "reserve" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [reserve, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function setPostMaxReinvestRatio(ratio, userID) {
  devLog('UPDATER', 'setPostMaxReinvestRatio');
  const sqlText = `UPDATE "user_settings" SET "post_max_reinvest_ratio" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [ratio, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function updateAPIKey(apiKey, userID) {
  devLog('UPDATER', 'updateAPIKey');
  const sqlText = `UPDATE "user_api" SET "name" = $1, "privateKey" = $2 WHERE "userID" = $3`;
  let result = await pool.query(sqlText, [apiKey.name, apiKey.privateKey, userID]);
  emitCacheEvent(cacheEvents.USER_API_UPDATED, userID);
  return result;
}

export async function updateTheme(theme, userID) {
  devLog('UPDATER', 'updateTheme');
  const sqlText = `UPDATE "user_settings" SET "theme" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [theme, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function updateTradeLoadMax(max, userID) {
  devLog('UPDATER', 'updateTradeLoadMax');
  const sqlText = `UPDATE "user_settings" SET "max_trade_load" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [max, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function updateProfitAccuracy(accuracy, userID) {
  devLog('UPDATER', 'updateProfitAccuracy');
  const sqlText = `UPDATE "user_settings" SET "profit_accuracy" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [accuracy, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function updateSyncQuantity(quantity, userID) {
  devLog('UPDATER', 'updateSyncQuantity');
  const sqlText = `UPDATE "user_settings" SET "sync_quantity" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [quantity, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function approveUser(userID) {
  devLog('UPDATER', 'approveUser');
  const sqlText = `UPDATE "user" SET "approved" = true WHERE "id" = $1 RETURNING *;`;
  let result = await pool.query(sqlText, [userID]);
  emitCacheEvent(cacheEvents.USER_UPDATED, userID);
  return result.rows[0];
}

export async function updateChatPermission(chatPermission, userID) {
  devLog('UPDATER', 'updateChatPermission');
  const sqlText = `UPDATE "user_settings" SET "can_chat" = $1 WHERE "userID" = $2`;
  let result = await pool.query(sqlText, [chatPermission, userID]);
  emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  return result;
}

export async function deleteUser(userID) {
  devLog('UPDATER', 'deleteUser');
  // open a client for the transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // delete the user from tables: user, user_api, limit_orders, user_settings
    await client.query(`DELETE FROM "user" WHERE "id" = $1`, [userID]);
    await client.query(`DELETE FROM "user_api" WHERE "userID" = $1`, [userID]);
    await client.query(`DELETE FROM "limit_orders" WHERE "userID" = $1`, [userID]);
    await client.query(`DELETE FROM "user_settings" WHERE "userID" = $1`, [userID]);
    await client.query('COMMIT');
    emitCacheEvent(cacheEvents.USER_UPDATED, userID);
    emitCacheEvent(cacheEvents.USER_API_UPDATED, userID);
    emitCacheEvent(cacheEvents.LIMIT_ORDERS_UPDATED, userID);
    emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, userID);
  } catch (err) {
    // rollback the transaction on error
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// get all user information minus password
export async function getAllUsers() {
  devLog('GETTER', 'getAllUsers');
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getAllUsersCache();
      if (cache.allUsers) {
        devLog('all users found in cache');
        resolve(cache.allUsers);
      } else {
        devLog('CACHE MISS! all users not found in cache, fetching from DB');
        const sqlText = `SELECT "id", "username", "active", "admin", "approved", "joined_at" FROM "user";`;
        let result = await pool.query(sqlText);
        const users = result.rows;
        cache.allUsers = users;
        resolve(users);
      }
    } catch (err) {
      reject(err);
    }
  });
}


// get all user information and settings except for the API details. 
// Keeping them separate helps prevent accidentally sending an API outside the server
export async function getAllUserAndSettings() {
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getAllUsersCache();
      if (cache.allUsersAndSettings) {
        devLog('all users and settings found in cache');
        resolve(cache.allUsersAndSettings);
      } else {
        devLog('CACHE MISS! all users and settings not found in cache, fetching from DB');
        const sqlText = `SELECT * 
        FROM "user" 
        JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
        ORDER BY "user"."id";`;
        let result = await pool.query(sqlText);
        const users = result.rows;
        cache.allUsersAndSettings = users;
        resolve(users);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export async function getUserCount() {
  const sqlText = `SELECT COUNT(*) FROM "user";`;
  let result = await pool.query(sqlText);
  return result.rows[0].count;
}

// function to check if there are any admin users
export async function getAdminCount() {
  const queryText = `SELECT count(*) FROM "user" WHERE "admin"=true;`;
  try {
    let result = await pool.query(queryText);
    return result.rows[0].count;
  } catch (err) {
    devLog('problem getting number of admins', err);
  }
}

export async function createUser(username, password, admin, approved, joined_at) {
  devLog('SETTER', 'createUser', username, admin, approved, joined_at);
  // this should all be done in a transaction so that it can be rolled back if any of the steps fail
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    // create the user
    const userText = `INSERT INTO "user" (username, password, admin, approved, joined_at) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    let userResult = await client.query(userText, [username, password, admin, approved, joined_at]);
    let user = userResult.rows[0];
    // create the user_api entry
    const userAPIText = `INSERT INTO "user_api" ("userID") VALUES ($1);`;
    await client.query(userAPIText, [user.id]);
    // create the user_settings entry
    const userSettingsText = `INSERT INTO "user_settings" ("userID", "profit_reset") VALUES ($1, $2) RETURNING *;`;
    let userSettingsResult = await client.query(userSettingsText, [user.id, joined_at]);
    await client.query('COMMIT');
    emitCacheEvent(cacheEvents.USER_UPDATED, user.id);
    emitCacheEvent(cacheEvents.USER_API_UPDATED, user.id);
    emitCacheEvent(cacheEvents.USER_SETTINGS_UPDATED, user.id);
    user = { ...user, ...userSettingsResult.rows[0] }
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateUserApproved(approved, userID) {
  const sqlText = `UPDATE "user" SET "approved" = $1 WHERE "id" = $2 RETURNING *;`;
  let result = await pool.query(sqlText, [approved, userID]);
  emitCacheEvent(cacheEvents.USER_UPDATED, userID);
  return result.rows[0];
}
