import { cacheEvents, emitCacheEvent, onCacheEvent } from '../cacheEvents.js';
import { pool } from '../pool.js';
import { devLog as devLogUtilities } from '../utilities.js';

let showLogs = true;

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
  singleUserCache.get(userID).singleUser = null;
}

function clearSingleUserAndSettingsCache(userID) {
  singleUserCache.get(userID).singleUserAndSettings = null;
}

function clearSingleUserAPICache(userID) {
  singleUserCache.get(userID).singleUserAPI = null;
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

// get all user information minus password
export async function getAllUsers() {
  devLog('GETTER', 'getAllUsers');
  return new Promise(async (resolve, reject) => {
    try {
      const cache = getAllUsersCache();
      // devLog('cache', cache);
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
