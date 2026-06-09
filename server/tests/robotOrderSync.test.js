import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseClient } from '../modules/databaseClient.js';
import { robot } from '../modules/robot.js';
import {
  cbClients,
  messenger,
  userStorage,
} from '../modules/runtime/index.js';

test('full-sync control rows can reorder using the loop user ID', async (t) => {
  const userID = 42;
  const oldOrderID = 'old-order';
  const newOrderID = 'new-order';
  const originalMethods = {
    clearOrdersToCheck: userStorage.clearOrdersToCheck,
    deleteTrade: databaseClient.deleteTrade,
    getProduct: databaseClient.getProduct,
    getSingleTrade: databaseClient.getSingleTrade,
    storeTrade: databaseClient.storeTrade,
    updateStatus: userStorage.updateStatus,
  };
  const originalClient = cbClients[userID];
  const originalMessenger = messenger[userID];
  const calls = [];

  t.after(() => {
    Object.assign(userStorage, {
      clearOrdersToCheck: originalMethods.clearOrdersToCheck,
      updateStatus: originalMethods.updateStatus,
    });
    Object.assign(databaseClient, {
      deleteTrade: originalMethods.deleteTrade,
      getProduct: originalMethods.getProduct,
      getSingleTrade: originalMethods.getSingleTrade,
      storeTrade: originalMethods.storeTrade,
    });

    if (originalClient === undefined) {
      delete cbClients[userID];
    } else {
      cbClients[userID] = originalClient;
    }
    if (originalMessenger === undefined) {
      delete messenger[userID];
    } else {
      messenger[userID] = originalMessenger;
    }
  });

  userStorage.updateStatus = (receivedUserID) => {
    assert.equal(receivedUserID, userID);
  };
  userStorage.clearOrdersToCheck = (receivedUserID) => {
    assert.equal(receivedUserID, userID);
    calls.push('cleared');
  };
  messenger[userID] = {
    newError: () => {
      assert.fail('the reorder should not report an error');
    },
    newMessage: () => {},
  };
  databaseClient.getSingleTrade = async (orderID, receivedUserID) => {
    assert.equal(orderID, oldOrderID);
    assert.equal(receivedUserID, userID);
    return {
      order_id: oldOrderID,
      product_id: 'LTC-USD',
      side: 'BUY',
      limit_price: '40.55',
      base_size: '0.51095528',
      previous_total_fees: '0.12',
      flipped_at: '2026-06-08T00:00:00.000Z',
    };
  };
  databaseClient.getProduct = async (productID, receivedUserID) => {
    assert.equal(productID, 'LTC-USD');
    assert.equal(receivedUserID, userID);
    return {
      available_for_user: true,
      base_increment: '0.00000001',
      quote_increment: '0.01',
    };
  };
  databaseClient.storeTrade = async () => {
    calls.push('stored');
    return { rowCount: 1 };
  };
  databaseClient.deleteTrade = async (orderID, receivedUserID) => {
    assert.equal(orderID, oldOrderID);
    assert.equal(receivedUserID, userID);
    calls.push('deleted');
  };
  cbClients[userID] = {
    placeOrder: async (details) => {
      assert.equal(details.product_id, 'LTC-USD');
      calls.push('placed');
      return {
        success: true,
        success_response: { order_id: newOrderID },
      };
    },
    getOrder: async (orderID) => {
      assert.equal(orderID, newOrderID);
      return { order: { order_id: newOrderID } };
    },
  };

  await robot.updateMultipleOrders(userID, {
    ordersArray: [{
      order_id: oldOrderID,
      reorder: true,
      will_cancel: false,
    }],
  });

  assert.deepEqual(calls, ['placed', 'stored', 'deleted', 'cleared']);
});
