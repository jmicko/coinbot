import { EventEmitter } from 'events';

// Create a central event emitter
const cacheEventEmitter = new EventEmitter();

// Define event types for each table in the database except for the session table
export const cacheEvents = {
  BOT_SETTINGS_UPDATED: 'bot_settings_updated',
  FEEDBACK_UPDATED: 'feedback_updated',
  LIMIT_ORDERS_UPDATED: 'limit_orders_updated',
  MARKET_CANDLES_UPDATED: 'market_candles_updated',
  MESSAGES_UPDATED: 'messages_updated',
  PRODUCTS_UPDATED: 'products_updated',
  SUBSCRIPTIONS_UPDATED: 'subscriptions_updated',
  USER_UPDATED: 'user_updated',
  USER_API_UPDATED: 'user_api_updated',
  USER_SETTINGS_UPDATED: 'user_settings_updated',
};

// Simple emit and subscribe functions
export function emitCacheEvent(event, userID) {
  cacheEventEmitter.emit(event, userID);
}

export function onCacheEvent(event, callback) {
  cacheEventEmitter.on(event, callback);
} 
