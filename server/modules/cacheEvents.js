import { EventEmitter } from 'events';

// Create a central event emitter
const cacheEventEmitter = new EventEmitter();

// Define event types
export const cacheEvents = {
  PRODUCTS_UPDATED: 'products_updated',
  LIMIT_ORDERS_UPDATED: 'limit_orders_updated'
};

// Simple emit and subscribe functions
export function emitCacheEvent(event, userID) {
  cacheEventEmitter.emit(event, userID);
}

export function onCacheEvent(event, callback) {
  cacheEventEmitter.on(event, callback);
} 
