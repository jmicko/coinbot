DROP TABLE IF EXISTS "limit_orders";
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "user_api";
DROP TABLE IF EXISTS "user_settings";
DROP TABLE IF EXISTS "bot_settings";

CREATE TABLE IF NOT EXISTS "user_api"
(
  "API_ID" SERIAL PRIMARY KEY,
  "userID" integer,
  "CB_SECRET" VARCHAR (1000),
  "CB_ACCESS_KEY" VARCHAR (1000),
  "CB_ACCESS_PASSPHRASE" VARCHAR (1000),
  "API_URI" VARCHAR (1000),
  "bot_type" VARCHAR NOT NULL DEFAULT 'grid'
);

CREATE TABLE IF NOT EXISTS "user_settings"
(
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
  "available_btc" numeric(32,16) DEFAULT 0,
  "available_usd" numeric(32,16) DEFAULT 0,
  "actualavailable_btc" numeric(32,16) DEFAULT 0,
  "actualavailable_usd" numeric(32,16) DEFAULT 0,
  "max_trade" boolean DEFAULT false,
  "max_trade_size" numeric(32,8) DEFAULT 0,
  "max_trade_load" integer DEFAULT 1000,
  "profit_accuracy" integer DEFAULT 16,
  "auto_setup_number" integer DEFAULT 1,
  "profit_reset" timestamp
);

CREATE TABLE IF NOT EXISTS "bot_settings"
(
  "loop_speed" integer DEFAULT 1,
  "orders_to_sync" integer DEFAULT 100,
  "full_sync" integer DEFAULT 10,
  "maintenance" boolean DEFAULT false
);
INSERT INTO "bot_settings" 
  ("loop_speed")
  VALUES (1);

CREATE TABLE IF NOT EXISTS "limit_orders"
(
  order_id character varying COLLATE pg_catalog."default" NOT NULL,
  
  "userID" integer,
  original_buy_price numeric(32,16),
  original_sell_price numeric(32,16),
  trade_pair_ratio numeric(32,8),
  flipped boolean DEFAULT false,
  flipped_at timestamptz,
  reorder boolean DEFAULT false,
  include_in_profit boolean DEFAULT true,
  will_cancel boolean DEFAULT false,

  product_id character varying COLLATE pg_catalog."default",
  coinbase_user_id character varying COLLATE pg_catalog."default",
  base_size numeric(32,8),
  limit_price numeric(32,8),
  post_only boolean,
  side character varying COLLATE pg_catalog."default",
  client_order_id character varying COLLATE pg_catalog."default",
  next_client_order_id character varying COLLATE pg_catalog."default",
  "status" character varying COLLATE pg_catalog."default",
  time_in_force character varying COLLATE pg_catalog."default",
  created_time timestamptz,
  completion_percentage numeric(32,8),
  filled_size numeric(32,8),
  average_filled_price numeric(32,8),
  fee numeric(32,8),
  number_of_fills numeric(32,8),
  filled_value numeric(32,8),
  pending_cancel boolean,
  size_in_quote boolean,
  total_fees numeric(32,16),
  previous_total_fees numeric(32,16),
  size_inclusive_of_fees boolean,
  total_value_after_fees numeric(32,16),
  trigger_status character varying COLLATE pg_catalog."default",
  order_type character varying COLLATE pg_catalog."default",
  reject_reason character varying COLLATE pg_catalog."default",
  settled boolean DEFAULT false,
  product_type character varying COLLATE pg_catalog."default",
  reject_message character varying COLLATE pg_catalog."default",
  cancel_message character varying COLLATE pg_catalog."default",

  -- price numeric(32,8),
  -- size numeric(32,8),
  -- pending boolean DEFAULT true,
  -- created_at timestamptz,
  -- done_at timestamptz,
  -- done_reason character varying COLLATE pg_catalog."default",
  -- fill_fees numeric(32,16),
  -- previous_fill_fees numeric(32,16),
  -- executed_value numeric(32,16),
  -- "API_ID" character varying,
  CONSTRAINT orders_pkey PRIMARY KEY (order_id)
);

CREATE TABLE IF NOT EXISTS "user" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR (80) UNIQUE NOT NULL,
  "password" VARCHAR (1000) NOT NULL,
  "active" boolean DEFAULT false,
  "admin" boolean DEFAULT false,
  "approved" boolean DEFAULT false,
  "will_delete" boolean DEFAULT false,
  "joined_at" timestamp
);

-- this will create the required table for connect-pg to store session data
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- this will index the orders table so it is much faster to look for reorders and unsettled trades
CREATE INDEX reorders
ON "limit_orders" ("side", "flipped", "will_cancel", "userID", "settled");