import { addProductDecimals } from '../utilities.js';

const catalogs = new Map();

function normalizeProduct(product) {
  return addProductDecimals({ ...product });
}

function getCatalog(userID) {
  return catalogs.get(String(userID));
}

const productCatalog = {
  replace(userID, products) {
    const normalizedProducts = products.map(normalizeProduct);
    const catalog = new Map();

    normalizedProducts.forEach((product) => {
      catalog.set(product.product_id, product);
    });
    catalogs.set(String(userID), catalog);
  },

  clear(userID) {
    catalogs.delete(String(userID));
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
};

export { productCatalog };
