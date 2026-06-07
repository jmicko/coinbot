import { createVersionedUserCache } from './versionedUserCache.js';

const reservationAffectingOrderFields = [
  'product_id',
  'base_size',
  'limit_price',
  'side',
  'flipped',
  'will_cancel',
];

function orderUpdateAffectsReservationTotals(order) {
  return reservationAffectingOrderFields.some((field) => {
    if (field === 'base_size' || field === 'limit_price') {
      return order[field] != null
        || order.order_configuration?.limit_limit_gtc?.[field] != null;
    }
    return order[field] != null;
  });
}

function createReservationTotalsCache(loadTotals, recordEvent = () => {}) {
  return createVersionedUserCache(loadTotals, recordEvent);
}

export {
  createReservationTotalsCache,
  orderUpdateAffectsReservationTotals,
};
