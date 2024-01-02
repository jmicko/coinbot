import { pool } from '../pool.js';

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