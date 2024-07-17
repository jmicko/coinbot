import { pool } from '../pool.js';

export const createMessagesTable = async () => {
  // Hey there, friend! 
  // Remove the '--' from the first line if you want to reset the messages table.
  // DON'T FORGET TO PUT IT BACK WHEN YOU'RE DONE!
  await pool.query(`
    -- DROP TABLE IF EXISTS messages;
    CREATE TABLE IF NOT EXISTS "messages" (
      id SERIAL PRIMARY KEY,
      "user_id" integer,
      "type" VARCHAR(255),
      "text" TEXT,
      "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "from" VARCHAR(255),
      "to" VARCHAR(255) DEFAULT 'all',
      "deleted" BOOLEAN DEFAULT false,
      "read" BOOLEAN DEFAULT false,
      "data" JSONB
    );
  `);
}


export async function getAllMessages(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
      SELECT * 
      FROM "messages" 
      WHERE ("user_id" = $1 OR ("to" = $2 OR "to" = 'all')) AND "type" != 'error' AND "type" != 'chat'
      ORDER BY "timestamp" DESC LIMIT 1000;`;
      const result = await pool.query(sqlText, [userID, userID.toString()]);

      const chatSQLText = `
      SELECT *
      FROM "messages"
      WHERE ("user_id" = $1 OR ("to" = $2 OR "to" = 'all')) AND "type" = 'chat'
      ORDER BY "timestamp" DESC LIMIT 1000;`;
      const chatResult = await pool.query(chatSQLText, [userID, userID.toString()]);
      resolve([...result.rows, ...chatResult.rows]);

      // resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

// get only the bot messages
export async function getBotMessages(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
      SELECT * 
      FROM "messages" 
      WHERE ("user_id" = $1 OR ("to" = $2 OR "to" = 'all')) AND "type" != 'error' AND "type" != 'chat'
      ORDER BY "timestamp" DESC LIMIT 1000;`;
      const result = await pool.query(sqlText, [userID, userID.toString()]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

export async function getAllErrorMessages(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
      SELECT * 
      FROM "messages" 
      WHERE "user_id" = $1 AND "type" = 'error'
      ORDER BY "timestamp" DESC LIMIT 1000;`;
      const result = await pool.query(sqlText, [userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

export async function getChatMessages(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
      SELECT * 
      FROM "messages" 
      WHERE "type" = 'chat' AND ("to" = $1 OR "to" = 'all')
      ORDER BY "timestamp" DESC LIMIT 1000; `;
      const result = await pool.query(sqlText, [userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  })
}

export async function saveMessage(userID, message) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
        INSERT INTO "messages" ("user_id", "type", "text", "from", "to") 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;`;
      const result = await pool.query(sqlText, [userID, message.type, message.text, message.from, message.to]);
      resolve(result.rows[0]);
    } catch (err) {
      reject(err);
    }
  })
}

export async function deleteMessage(userID, messageID) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('messageID', messageID, 'userID', userID);
      const sqlText = `
        UPDATE "messages" 
        SET "deleted" = true,
        "read" = true,
        "text" = 'deleted'
        WHERE "id" = $1 AND "user_id" = $2
        RETURNING *;`;
      const result = await pool.query(sqlText, [messageID, userID]);
      console.log(result.rows, 'result.rows');
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

export async function deletePrevious30DaysMessages() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `
        DELETE FROM "messages"
        WHERE "type" != 'chat' AND "timestamp" < NOW() - INTERVAL '30 days';`;
      const result = await pool.query(sqlText);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}