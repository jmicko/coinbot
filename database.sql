-- DROP TABLE "orders";
-- DROP TABLE "user";
-- DROP TABLE "session";

CREATE TABLE IF NOT EXISTS "orders"
(
    id character varying COLLATE pg_catalog."default" NOT NULL,
    "userID" character varying COLLATE pg_catalog."default",
    price numeric(32,8),
    size numeric(32,8),
    side character varying COLLATE pg_catalog."default",
    settled boolean DEFAULT false,
    flipped boolean DEFAULT false,
    will_cancel boolean DEFAULT false,
    product_id character varying COLLATE pg_catalog."default",
    time_in_force character varying COLLATE pg_catalog."default",
    created_at character varying COLLATE pg_catalog."default",
    done_at character varying COLLATE pg_catalog."default",
    fill_fees numeric(32,16),
    filled_size numeric(32,8),
    executed_value numeric(32,16),
    original_buy_price numeric(32,16),
    original_sell_price numeric(32,16),
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);

CREATE TABLE "user" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR (80) UNIQUE NOT NULL,
  "password" VARCHAR (1000) NOT NULL,
  "active" boolean DEFAULT false,
  "admin" boolean DEFAULT false,
  "approved" boolean DEFAULT false,
  "paused" boolean DEFAULT false,
  "will_delete" boolean DEFAULT false,

  "CB_SECRET" VARCHAR (1000),
  "CB_ACCESS_KEY" VARCHAR (1000),
  "CB_ACCESS_PASSPHRASE" VARCHAR (1000),
  "API_URI" VARCHAR (1000)
);


-- this will create the required table for connect-pg to store session data
CREATE TABLE "session" (
    "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");


-- this may be a way to get profits
-- SELECT SUM((("original_sell_price" * "size") - "fill_fees") - (("original_buy_price" * "size") - "fill_fees")) FROM public.orders WHERE "side" = 'sell' AND "settled" = 'true';


-- random usefull stuff
-- SELECT * FROM "orders"
-- ORDER BY original_buy_price DESC;

-- SELECT * FROM "orders";

-- SELECT * FROM "orders" WHERE "settled"=false;

-- SELECT * FROM "orders" WHERE "side"='buy' AND "settled"=false;

-- SELECT * FROM "orders" WHERE "side"='sell' AND "settled"=false;