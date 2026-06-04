import { pool } from '../pool.js';
import { cacheEvents, emitCacheEvent } from '../cacheEvents.js';

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
  emitCacheEvent(cacheEvents.FEEDBACK_UPDATED);
}

export async function deleteSingleFeedbackForUser(userID, id) {
  const queryText = `DELETE FROM "feedback" WHERE "id" = $1 AND "user_id" = $2;`;
  await pool.query(queryText, [id, userID]);
  emitCacheEvent(cacheEvents.FEEDBACK_UPDATED, userID);
}
