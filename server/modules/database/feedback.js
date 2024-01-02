import { devLog } from '../../../src/shared.js';
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