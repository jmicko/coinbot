DROP TABLE IF EXISTS "orders";
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
  "max_trade" boolean DEFAULT false,
  "max_trade_size" numeric(32,8) DEFAULT 0,
  "max_trade_load" integer DEFAULT 1000,
  "profit_accuracy" integer DEFAULT 16,
  "profit_reset" timestamp
);

CREATE TABLE IF NOT EXISTS "bot_settings"
(
  "loop_speed" integer DEFAULT 1,
  "full_sync" integer DEFAULT 10,
  "maintenance" boolean DEFAULT false
);
INSERT INTO "bot_settings" 
  ("loop_speed")
  VALUES (1);

CREATE TABLE IF NOT EXISTS "orders"
(
  id character varying COLLATE pg_catalog."default" NOT NULL,
  "userID" integer,
  "API_ID" character varying,
  price numeric(32,8),
  size numeric(32,8),
  trade_pair_ratio numeric(32,8),
  side character varying COLLATE pg_catalog."default",
  pending boolean DEFAULT true,
  settled boolean DEFAULT false,
  flipped boolean DEFAULT false,
  will_cancel boolean DEFAULT false,
  reorder boolean DEFAULT false,
  include_in_profit boolean DEFAULT true,
  product_id character varying COLLATE pg_catalog."default",
  time_in_force character varying COLLATE pg_catalog."default",
  created_at timestamptz,
  done_at timestamptz,
  done_reason character varying COLLATE pg_catalog."default",
  fill_fees numeric(32,16),
  previous_fill_fees numeric(32,16),
  filled_size numeric(32,8),
  executed_value numeric(32,16),
  original_buy_price numeric(32,16),
  original_sell_price numeric(32,16),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
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