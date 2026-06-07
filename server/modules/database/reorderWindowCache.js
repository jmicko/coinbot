import { createVersionedUserCache } from './versionedUserCache.js';

const reorderWindowAffectingOrderFields = [
  'reorder',
  'product_id',
  'limit_price',
  'side',
  'flipped',
  'will_cancel',
];

function orderUpdateAffectsReorderWindow(order) {
  return reorderWindowAffectingOrderFields.some((field) => {
    if (field === 'limit_price') {
      return order[field] != null
        || order.order_configuration?.limit_limit_gtc?.[field] != null;
    }
    return order[field] != null;
  });
}

function createReorderWindowKey(limit, productIDs) {
  const normalizedProducts = [
    ...new Set(productIDs.map((productID) => String(productID))),
  ].sort();

  return JSON.stringify([Number(limit), normalizedProducts]);
}

function parseReorderWindowKey(key) {
  const [limit, productIDs] = JSON.parse(key);
  return { limit, productIDs };
}

function createReorderWindowCache(loadWindow, recordEvent = () => {}) {
  return createVersionedUserCache(loadWindow, recordEvent);
}

export {
  createReorderWindowCache,
  createReorderWindowKey,
  orderUpdateAffectsReorderWindow,
  parseReorderWindowKey,
};
