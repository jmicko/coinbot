import { pool } from "../pool.js";


export const updateLimitOrdersTable = async () => {
  const  user_id_fkey_rows  = await pool.query(`
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'limit_orders_user_id_fkey'
  `);

  if (user_id_fkey_rows.rows.length === 0) {
    console.log('<><> Adding limit_orders_user_id_fkey constraint <><>');
    await pool.query(`
      ALTER TABLE limit_orders 
      ADD CONSTRAINT limit_orders_user_id_fkey 
      FOREIGN KEY ("userID") REFERENCES "user" (id) ON DELETE SET NULL;
    `);
  } else {
    console.log('<><> limit_orders_user_id_fkey constraint already exists <><>');
  }
}