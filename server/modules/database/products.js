import { pool } from '../pool.js';
import { cacheEvents, emitCacheEvent } from '../cacheEvents.js';
import { productCatalog } from '../runtime/productCatalog.js';

const productsCache = new Map();

function getProductCache(userID) {
  const cacheKey = String(userID);
  if (!productsCache.has(cacheKey)) {
    productsCache.set(cacheKey, {
      identities: null,
      identityMap: null,
    });
  }
  return productsCache.get(cacheKey);
}

function clearProductCache(userID) {
  productsCache.delete(String(userID));
  emitCacheEvent(cacheEvents.PRODUCTS_UPDATED, userID);
}

async function getProductIdentities(userID) {
  const cache = getProductCache(userID);
  if (cache.identities) {
    return cache.identities;
  }

  const result = await pool.query(
    `SELECT *
     FROM "products"
     WHERE "user_id" = $1
     ORDER BY "product_id" ASC;`,
    [userID]
  );

  cache.identities = result.rows;
  cache.identityMap = new Map(
    result.rows.map((product) => [product.product_id, product])
  );
  return cache.identities;
}

async function getProductIdentityMap(userID) {
  const cache = getProductCache(userID);
  if (!cache.identityMap) {
    await getProductIdentities(userID);
  }
  return cache.identityMap;
}

function mergeCatalogData(userID, identity) {
  return productCatalog.merge(userID, identity);
}

export async function getProduct(productID, userID) {
  const identities = await getProductIdentityMap(userID);
  const identity = identities.get(productID);
  return identity ? mergeCatalogData(userID, identity) : undefined;
}

export async function getActiveProducts(userID) {
  const identities = await getProductIdentities(userID);
  return identities
    .filter((product) => product.active_for_user)
    .sort((a, b) => {
      const aTime = a.activated_at ? new Date(a.activated_at).getTime() : 0;
      const bTime = b.activated_at ? new Date(b.activated_at).getTime() : 0;
      return aTime - bTime;
    })
    .map((identity) => mergeCatalogData(userID, identity));
}

export async function getActiveProductIDs(userID) {
  const identities = await getProductIdentities(userID);
  return identities
    .filter((product) => product.active_for_user)
    .map((product) => product.product_id);
}

export async function getUserProducts(userID) {
  const identities = await getProductIdentities(userID);
  return identities
    .filter((product) =>
      product.available_for_user && product.quote_currency_id === 'USD'
    )
    .map((identity) => mergeCatalogData(userID, identity))
    .sort((a, b) => {
      const aVolume = Number(a.volume_24h || 0) * Number(a.price || 0);
      const bVolume = Number(b.volume_24h || 0) * Number(b.price || 0);
      return bVolume - aVolume || a.product_id.localeCompare(b.product_id);
    });
}

export async function syncProductIdentities(products, userID) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error(`Coinbase returned no products for user ${userID}`);
  }

  const identities = await getProductIdentityMap(userID);
  const incomingProducts = [
    ...new Map(products.map((product) => [
      product.product_id,
      {
        product_id: product.product_id,
        base_currency_id: product.base_currency_id,
        quote_currency_id: product.quote_currency_id,
      },
    ])).values(),
  ];
  const incomingProductIDs = new Set(
    incomingProducts.map((product) => product.product_id)
  );

  const changedProducts = incomingProducts.filter((product) => {
    const existing = identities.get(product.product_id);
    return !existing
      || !existing.available_for_user
      || existing.base_currency_id !== product.base_currency_id
      || existing.quote_currency_id !== product.quote_currency_id;
  });
  const unavailableProductCount = [...identities.values()].filter((product) =>
    product.available_for_user && !incomingProductIDs.has(product.product_id)
  ).length;

  if (changedProducts.length === 0 && unavailableProductCount === 0) {
    return { changedProductCount: 0, unavailableProductCount: 0 };
  }

  const sqlText = `
    WITH incoming AS (
      SELECT *
      FROM jsonb_to_recordset($1::jsonb) AS product (
        product_id text,
        base_currency_id text,
        quote_currency_id text
      )
    ),
    upserted AS (
      INSERT INTO "products" (
        "product_id",
        "user_id",
        "active_for_user",
        "available_for_user",
        "base_currency_id",
        "quote_currency_id"
      )
      SELECT
        product_id,
        $2,
        product_id = 'BTC-USD',
        true,
        base_currency_id,
        quote_currency_id
      FROM incoming
      ON CONFLICT ("user_id", "product_id") DO UPDATE
      SET
        "available_for_user" = true,
        "base_currency_id" = EXCLUDED."base_currency_id",
        "quote_currency_id" = EXCLUDED."quote_currency_id"
      WHERE NOT "products"."available_for_user"
         OR "products"."base_currency_id" IS DISTINCT FROM EXCLUDED."base_currency_id"
         OR "products"."quote_currency_id" IS DISTINCT FROM EXCLUDED."quote_currency_id"
      RETURNING 1
    ),
    made_unavailable AS (
      UPDATE "products"
      SET "available_for_user" = false
      WHERE "user_id" = $2
        AND "available_for_user" = true
        AND NOT EXISTS (
          SELECT 1
          FROM incoming
          WHERE incoming.product_id = "products"."product_id"
        )
      RETURNING 1
    )
    SELECT
      (SELECT count(*) FROM upserted) AS changed_product_count,
      (SELECT count(*) FROM made_unavailable) AS unavailable_product_count;
  `;

  const result = await pool.query(sqlText, [
    JSON.stringify(incomingProducts),
    userID,
  ]);
  clearProductCache(userID);
  return {
    changedProductCount: Number(result.rows[0].changed_product_count),
    unavailableProductCount: Number(result.rows[0].unavailable_product_count),
  };
}

export async function updateProductActiveStatus(userID, productID, active) {
  const sqlText = `
    UPDATE "products"
    SET "active_for_user" = $1, "activated_at" = now()
    WHERE "user_id" = $2
      AND "product_id" = $3
      AND ($1 = false OR "available_for_user" = true)
    RETURNING "product_id";
  `;
  const result = await pool.query(sqlText, [active, userID, productID]);
  if (result.rowCount === 0) {
    throw new Error(`Product ${productID} is not available for user ${userID}`);
  }
  clearProductCache(userID);
}
