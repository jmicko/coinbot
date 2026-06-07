import { addProductDecimals } from '../utilities.js';

const catalogs = new Map();
const updatedAtByUser = new Map();

function normalizeProduct(product) {
  return addProductDecimals({ ...product });
}

function getCatalog(userID) {
  return catalogs.get(String(userID));
}

const productCatalog = {
  replace(userID, products) {
    const userKey = String(userID);
    const normalizedProducts = products.map(normalizeProduct);
    const catalog = new Map();

    normalizedProducts.forEach((product) => {
      catalog.set(product.product_id, product);
    });
    catalogs.set(userKey, catalog);
    updatedAtByUser.set(userKey, Date.now());
  },

  clear(userID) {
    const userKey = String(userID);
    catalogs.delete(userKey);
    updatedAtByUser.delete(userKey);
  },

  merge(userID, identity) {
    const product = getCatalog(userID)?.get(identity.product_id);
    return product
      ? { ...product, ...identity }
      : { ...identity };
  },

  isReady(userID) {
    return Boolean(getCatalog(userID)?.size);
  },

  isRefreshDue(userID, intervalMs, now = Date.now()) {
    const updatedAt = updatedAtByUser.get(String(userID));
    return !updatedAt || now - updatedAt >= intervalMs;
  },

  getUpdatedAt(userID) {
    return updatedAtByUser.get(String(userID)) || null;
  },
};

export { productCatalog };
