const obsoleteProductColumns = [
  'price',
  'price_percentage_change_24h',
  'volume_24h',
  'volume_percentage_change_24h',
  'base_increment',
  'quote_increment',
  'quote_min_size',
  'quote_max_size',
  'base_min_size',
  'base_max_size',
  'base_name',
  'quote_name',
  'watched',
  'is_disabled',
  'new',
  'status',
  'cancel_only',
  'limit_only',
  'post_only',
  'trading_disabled',
  'auction_mode',
  'product_type',
  'fcm_trading_session_details',
  'mid_market_price',
  'base_increment_decimals',
  'quote_increment_decimals',
  'quote_inverse_increment',
  'base_inverse_increment',
  'price_rounding',
  'pbd',
  'pqd',
];

export default {
  id: '002_simplify_products',
  name: 'Keep product identity, availability, and activation state',
  async up(client) {
    await client.query(`
      WITH ranked AS (
        SELECT
          ctid,
          row_number() OVER (
            PARTITION BY "user_id", "product_id"
            ORDER BY
              "active_for_user" DESC NULLS LAST,
              "activated_at" DESC NULLS LAST,
              ctid
          ) AS row_number
        FROM "products"
      )
      DELETE FROM "products"
      WHERE ctid IN (
        SELECT ctid FROM ranked WHERE row_number > 1
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "products_user_product_unique"
      ON "products" ("user_id", "product_id");
    `);

    for (const column of obsoleteProductColumns) {
      await client.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "${column}";`);
    }

    await client.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "available_for_user" boolean NOT NULL DEFAULT true;
    `);
  },
};
