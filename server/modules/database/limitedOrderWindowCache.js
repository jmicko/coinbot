import { createVersionedUserCache } from './versionedUserCache.js';

const limitedOrderWindowAffectingFields = [
  'reorder',
  'product_id',
  'limit_price',
  'side',
  'flipped',
  'settled',
  'will_cancel',
];

function orderUpdateAffectsLimitedOrderWindow(order) {
  return limitedOrderWindowAffectingFields.some((field) => {
    if (field === 'limit_price') {
      return order[field] != null
        || order.order_configuration?.limit_limit_gtc?.[field] != null;
    }
    return order[field] != null;
  });
}

function createLimitedOrderWindowKey(limit, productIDs) {
  const normalizedProducts = [
    ...new Set(productIDs.map((productID) => String(productID))),
  ];

  return JSON.stringify([Number(limit), normalizedProducts]);
}

function parseLimitedOrderWindowKey(key) {
  const [limit, productIDs] = JSON.parse(key);
  return { limit, productIDs };
}

function createLimitedOrderWindowCache(loadWindow, recordEvent = () => {}) {
  return createVersionedUserCache(loadWindow, recordEvent);
}

export {
  createLimitedOrderWindowCache,
  createLimitedOrderWindowKey,
  orderUpdateAffectsLimitedOrderWindow,
  parseLimitedOrderWindowKey,
};
