import { devLog } from '../utilities.js';
import { pool } from '../pool.js';

export const updateFeedbackTable = async () => {
  const user_id_fkey_rows = await pool.query(`
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'feedback_user_id_fkey'
  `);

  if (user_id_fkey_rows.rows.length === 0) {
    devLog('<><> adding feedback_user_id_fkey constraint <><>');
    await pool.query(`
      ALTER TABLE feedback 
      ADD CONSTRAINT feedback_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE;
    `);
  } else {
    devLog('<><> feedback_user_id_fkey constraint already exists <><>');
  }
}

export async function getFeedbackCount(userID) {
  const queryText = `SELECT COUNT(*) FROM "feedback" WHERE "user_id" = $1;`;
  const countResults = await pool.query(queryText, [userID]);
  return countResults.rows[0].count;
}

export async function getFeedbackForUser(userID) {
  const queryText = `SELECT * FROM "feedback" WHERE "user_id" = $1 ORDER BY "id" DESC;`;
  const feedbackResults = await pool.query(queryText, [userID]);
  return feedbackResults.rows;
}

export async function getFeedbackForAllUsers() {
  const queryText = `SELECT "feedback".*, "user"."username" FROM "feedback" JOIN "user" ON "feedback"."user_id" = "user"."id" ORDER BY "id" DESC;`;
  const feedbackResults = await pool.query(queryText);
  return feedbackResults.rows;
}

export async function storeFeedback(userID, subject, description) {
  const queryText = `INSERT INTO "feedback" ("user_id", "subject", "description") VALUES ($1, $2, $3);`;
  await pool.query(queryText, [userID, subject, description]);
  emitCacheEvent(cacheEvents.FEEDBACK_UPDATED, userID);
}

export async function deleteFeedback(id) {
  const queryText = `DELETE FROM "feedback" WHERE "id" = $1;`;
  await pool.query(queryText, [id]);
  emitCacheEvent(cacheEvents.FEEDBACK_UPDATED, userID);
}

export async function deleteSingleFeedbackForUser(userID, id) {
  const queryText = `DELETE FROM "feedback" WHERE "id" = $1 AND "user_id" = $2;`;
  await pool.query(queryText, [id, userID]);
  emitCacheEvent(cacheEvents.FEEDBACK_UPDATED, userID);
}
