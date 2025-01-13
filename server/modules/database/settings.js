import { devLog } from '../utilities.js';
import { pool } from '../pool.js';

export const updateSettingsTable = async () => {

  const settingsColumnsResult = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='bot_settings';
  `);

  const columns = settingsColumnsResult.rows.map(row => row.column_name);
  // devLog('<><> columns <><>', columns);

  if (!columns.includes('registration_open')) {
    devLog('<><> adding registration_open column <><>');
    await pool.query(`
    ALTER TABLE bot_settings 
    ADD COLUMN registration_open boolean DEFAULT true;
  `);
  }
}


const settingsCache = new Map();

function refreshSettingsCache() {
  settingsCache.clear();
  devLog('settings cache cleared');
  getBotSettings();
  devLog('settings cache refreshed');
}

// get all bot settings
export async function getBotSettings() {
  return new Promise(async (resolve, reject) => {
    try {
      if (settingsCache.has('bot_settings')) {
        devLog('settings cache hit');
        resolve(settingsCache.get('bot_settings'));
      } else {
        devLog('settings cache miss');
        const sqlText = `SELECT * FROM "bot_settings";`;
        let result = await pool.query(sqlText);
        const settings = result.rows[0];
        settingsCache.set('bot_settings', settings);
        resolve(settings);
      }
    } catch (err) {
      reject(err);
    }
  })
}

// turns maintenance mode on and off to stop trading on all accounts.
// This prevents loss of data if the bot needs to be shut down 
export async function toggleMaintenance() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "bot_settings" SET "maintenance" = NOT "maintenance";`;
      await pool.query(sqlText);
      // clear cache
      refreshSettingsCache();
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// toggle registration of new users on and off
export async function toggleRegistration() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "bot_settings" SET "registration_open" = NOT "registration_open";`;
      await pool.query(sqlText);
      // clear cache
      refreshSettingsCache();
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

export async function getRegistrationOpen() {
  return new Promise(async (resolve, reject) => {
    try {
      const botSettings = await getBotSettings();
      const registrationOpen = botSettings.registration_open;
      resolve(registrationOpen);
    } catch (err) {
      reject(err);
    }
  })
}

export async function updateLoopSpeed(loopSpeed) {
  devLog('updating loop speed', loopSpeed);
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "bot_settings" SET "loop_speed" = $1;`;
      await pool.query(sqlText, [loopSpeed]);
      // clear cache
      refreshSettingsCache();
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

export async function updateFullSync(fullSync) {
  devLog('updating full sync', fullSync);
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "bot_settings" SET "full_sync" = $1;`;
      await pool.query(sqlText, [fullSync]);
      // clear cache
      refreshSettingsCache();
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

export async function updateOrdersToSync(ordersToSync) {
  return new Promise(async (resolve, reject) => {
    // get a client for the transaction
    const client = await pool.connect();
    try {
      const queryTextBot = `UPDATE "bot_settings" SET "orders_to_sync" = $1;`;
      const queryTextUsers = `UPDATE "user_settings" SET "sync_quantity" = $1
            WHERE "sync_quantity" > $1;`

      // start a transaction
      await client.query('BEGIN');
      // update bot settings
      await client.query(queryTextBot, [ordersToSync]);
      // update user settings
      await client.query(queryTextUsers, [ordersToSync]);
      // commit the transaction
      await client.query('COMMIT');
      // clear cache
      refreshSettingsCache();
      // todo - update whatever cache ends up handling the user settings table
      resolve();
    } catch (err) {
      // rollback the transaction
      await client.query('ROLLBACK');
      devLog(err, 'error trying to update orders to sync in db')
      reject(err);
    } finally {
      // release the client
      devLog('releasing client');
      client.release();
    }
  })
}