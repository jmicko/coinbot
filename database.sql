DROP TABLE "orders";

-- CREATE TABLE "orders" (
--   "id" varchar,
--   "price" varchar,
--   "size" varchar,
--   "side" varchar,
--   "settled" boolean
-- );


CREATE TABLE IF NOT EXISTS "orders"
(
    id character varying COLLATE pg_catalog."default" NOT NULL,
    price character varying COLLATE pg_catalog."default",
    size character varying COLLATE pg_catalog."default",
    side character varying COLLATE pg_catalog."default",
    settled boolean,
    product_id character varying COLLATE pg_catalog."default",
    time_in_force character varying COLLATE pg_catalog."default",
    created_at character varying COLLATE pg_catalog."default",
    done_at character varying COLLATE pg_catalog."default",
    fill_fees character varying COLLATE pg_catalog."default",
    filled_size character varying COLLATE pg_catalog."default",
    executed_value character varying COLLATE pg_catalog."default",
    original_buy_price character varying COLLATE pg_catalog."default",
    original_sell_price character varying COLLATE pg_catalog."default",
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);