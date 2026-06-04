const sql = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(80) UNIQUE NOT NULL,
  "password" VARCHAR(1000) NOT NULL,
  "active" boolean DEFAULT false,
  "admin" boolean DEFAULT false,
  "approved" boolean DEFAULT false,
  "will_delete" boolean DEFAULT false,
  "joined_at" timestamp
);

CREATE TABLE IF NOT EXISTS "user_api" (
  "API_ID" SERIAL PRIMARY KEY,
  "userID" integer,
  "CB_SECRET" VARCHAR(1000),
  "CB_ACCESS_KEY" VARCHAR(1000),
  "CB_ACCESS_PASSPHRASE" VARCHAR(1000),
  "API_URI" VARCHAR(1000),
  "bot_type" VARCHAR NOT NULL DEFAULT 'grid',
  "name" text,
  "privateKey" text
);

ALTER TABLE "user_api" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "user_api" ADD COLUMN IF NOT EXISTS "privateKey" text;

CREATE TABLE IF NOT EXISTS "user_settings" (
  "userID" integer,
  "paused" boolean DEFAULT false,
  "kill_locked" boolean DEFAULT false,
  "theme" character varying DEFAULT 'original',
  "reinvest" boolean DEFAULT false,
  "reinvest_ratio" integer DEFAULT 0,
  "post_max_reinvest_ratio" integer DEFAULT 0,
  "reserve" numeric(32,8) DEFAULT 0,
  "maker_fee" numeric(32,8) DEFAULT 0,
  "taker_fee" numeric(32,8) DEFAULT 0,
  "usd_volume" numeric(32,8) DEFAULT 0,
  "max_trade" boolean DEFAULT false,
  "max_trade_size" numeric(32,8) DEFAULT 0,
  "max_trade_load" integer DEFAULT 100,
  "sync_quantity" integer DEFAULT 100,
  "profit_accuracy" integer DEFAULT 16,
  "can_chat" boolean DEFAULT false,
  "auto_setup_number" integer DEFAULT 1,
  "profit_reset" timestamp
);

CREATE TABLE IF NOT EXISTS "products" (
  "product_id" character varying COLLATE pg_catalog."default" NOT NULL,
  "user_id" character varying COLLATE pg_catalog."default" NOT NULL,
  "active_for_user" boolean DEFAULT false,
  "activated_at" timestamptz,
  "quote_currency_id" character varying COLLATE pg_catalog."default",
  "base_currency_id" character varying COLLATE pg_catalog."default",
  "price" numeric(32,16),
  "price_percentage_change_24h" numeric(32,16),
  "volume_24h" numeric(32,16),
  "volume_percentage_change_24h" numeric(32,16),
  "base_increment" numeric(32,16),
  "quote_increment" numeric(32,16),
  "quote_min_size" numeric(32,16),
  "quote_max_size" numeric(32,16),
  "base_min_size" numeric(32,16),
  "base_max_size" numeric(32,16),
  "base_name" character varying COLLATE pg_catalog."default",
  "quote_name" character varying COLLATE pg_catalog."default",
  "watched" boolean DEFAULT false,
  "is_disabled" boolean DEFAULT false,
  "new" boolean DEFAULT false,
  "status" character varying COLLATE pg_catalog."default",
  "cancel_only" boolean DEFAULT false,
  "limit_only" boolean DEFAULT false,
  "post_only" boolean DEFAULT false,
  "trading_disabled" boolean DEFAULT false,
  "auction_mode" boolean DEFAULT false,
  "product_type" character varying COLLATE pg_catalog."default",
  "fcm_trading_session_details" character varying COLLATE pg_catalog."default",
  "mid_market_price" numeric(32,16),
  "base_increment_decimals" numeric(32,16),
  "quote_increment_decimals" numeric(32,16),
  "quote_inverse_increment" numeric(32,16),
  "base_inverse_increment" numeric(32,16),
  "price_rounding" numeric(32,16),
  "pbd" numeric,
  "pqd" numeric
);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_increment_decimals" numeric(32,16);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "quote_increment_decimals" numeric(32,16);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "quote_inverse_increment" numeric(32,16);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_inverse_increment" numeric(32,16);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_rounding" numeric(32,16);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pbd" numeric;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pqd" numeric;

CREATE TABLE IF NOT EXISTS "market_candles" (
  "candle_id" character varying PRIMARY KEY COLLATE pg_catalog."default" NOT NULL,
  "product_id" character varying COLLATE pg_catalog."default" NOT NULL,
  "granularity" character varying COLLATE pg_catalog."default" NOT NULL,
  "start" integer NOT NULL,
  "low" numeric(32,16) NOT NULL,
  "high" numeric(32,16) NOT NULL,
  "high_low_ratio" numeric(32,16) NOT NULL,
  "open" numeric(32,16) NOT NULL,
  "close" numeric(32,16) NOT NULL,
  "volume" numeric(32,16) NOT NULL
);

CREATE TABLE IF NOT EXISTS "bot_settings" (
  "loop_speed" integer DEFAULT 1,
  "orders_to_sync" integer DEFAULT 100,
  "full_sync" integer DEFAULT 10,
  "maintenance" boolean DEFAULT false,
  "registration_open" boolean DEFAULT true
);

ALTER TABLE "bot_settings" ADD COLUMN IF NOT EXISTS "registration_open" boolean DEFAULT true;

INSERT INTO "bot_settings" ("loop_speed", "orders_to_sync", "full_sync", "maintenance", "registration_open")
SELECT 1, 100, 10, false, true
WHERE NOT EXISTS (SELECT 1 FROM "bot_settings");

CREATE TABLE IF NOT EXISTS "limit_orders" (
  "order_id" character varying COLLATE pg_catalog."default" NOT NULL,
  "userID" integer,
  "original_buy_price" numeric(32,16),
  "original_sell_price" numeric(32,16),
  "trade_pair_ratio" numeric(32,8),
  "flipped" boolean DEFAULT false,
  "flipped_at" timestamptz,
  "filled_at" timestamptz,
  "reorder" boolean DEFAULT false,
  "include_in_profit" boolean DEFAULT true,
  "will_cancel" boolean DEFAULT false,
  "product_id" character varying COLLATE pg_catalog."default",
  "coinbase_user_id" character varying COLLATE pg_catalog."default",
  "base_size" numeric(32,8),
  "limit_price" numeric(32,8),
  "post_only" boolean,
  "side" character varying COLLATE pg_catalog."default",
  "client_order_id" character varying COLLATE pg_catalog."default",
  "next_client_order_id" character varying COLLATE pg_catalog."default",
  "status" character varying COLLATE pg_catalog."default",
  "time_in_force" character varying COLLATE pg_catalog."default",
  "created_time" timestamptz,
  "completion_percentage" numeric(32,8),
  "filled_size" numeric(32,8),
  "average_filled_price" numeric(32,8),
  "fee" numeric(32,8),
  "number_of_fills" numeric(32,8),
  "filled_value" numeric(32,8),
  "pending_cancel" boolean,
  "size_in_quote" boolean,
  "total_fees" numeric(32,16),
  "previous_total_fees" numeric(32,16),
  "size_inclusive_of_fees" boolean,
  "total_value_after_fees" numeric(32,16),
  "trigger_status" character varying COLLATE pg_catalog."default",
  "order_type" character varying COLLATE pg_catalog."default",
  "reject_reason" character varying COLLATE pg_catalog."default",
  "settled" boolean DEFAULT false,
  "product_type" character varying COLLATE pg_catalog."default",
  "reject_message" character varying COLLATE pg_catalog."default",
  "cancel_message" character varying COLLATE pg_catalog."default",
  CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

CREATE TABLE IF NOT EXISTS "feedback" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer,
  "subject" character varying COLLATE pg_catalog."default",
  "description" character varying COLLATE pg_catalog."default",
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer,
  "endpoint" character varying COLLATE pg_catalog."default" UNIQUE NOT NULL,
  "keys" json,
  "expiration_time" timestamp,
  "created_at" timestamp DEFAULT now(),
  "daily_notifications" boolean DEFAULT false,
  "notification_time" timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer,
  "type" VARCHAR(255),
  "text" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "from" VARCHAR(255),
  "to" VARCHAR(255),
  "deleted" BOOLEAN DEFAULT false,
  "read" BOOLEAN DEFAULT false,
  "data" JSONB
);

ALTER TABLE "messages" ALTER COLUMN "to" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session"
    ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_user_id_fkey'
  ) THEN
    ALTER TABLE "feedback"
    ADD CONSTRAINT "feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'limit_orders_user_id_fkey'
  ) THEN
    ALTER TABLE "limit_orders"
    ADD CONSTRAINT "limit_orders_user_id_fkey"
    FOREIGN KEY ("userID") REFERENCES "user" ("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
CREATE INDEX IF NOT EXISTS "reorders" ON "limit_orders" ("side", "flipped", "will_cancel", "userID", "settled");
CREATE INDEX IF NOT EXISTS "user_active" ON "products" ("user_id", "quote_currency_id", "active_for_user");
CREATE INDEX IF NOT EXISTS "candles" ON "market_candles" ("product_id", "granularity", "start");
`;

export default {
  id: '001_baseline_schema',
  name: 'Baseline application schema',
  async up(client) {
    await client.query(sql);
  },
};
