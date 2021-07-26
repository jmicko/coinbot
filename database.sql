-- DROP TABLE "orders";


CREATE TABLE IF NOT EXISTS "orders"
(
    id character varying COLLATE pg_catalog."default" NOT NULL,
    price numeric(32,8),
    size numeric(32,8),
    side character varying COLLATE pg_catalog."default",
    settled boolean,
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


SELECT * FROM "orders"
ORDER BY original_buy_price DESC


-- this may be a way to get profits
-- SELECT SUM((("original_sell_price" * "size") - "fill_fees") - (("original_buy_price" * "size") - "fill_fees")) FROM public.orders WHERE "side" = 'sell' AND "settled" = 'true';