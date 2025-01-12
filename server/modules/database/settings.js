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