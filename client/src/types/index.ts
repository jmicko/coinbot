import { ChangeEvent, FormEvent } from "react";

export interface Order {
  order_id: string;
  side: string;
  original_sell_price: number;
  original_buy_price: number;
  base_size: number;
  limit_price: number;
  trade_pair_ratio: number;
  flipped_at: string;
  created_at: string;
  reorder: boolean;
}

export interface Orders {
  buys: Order[];
  sells: Order[];
  counts: {
    totalOpenOrders: { count: number };
    totalOpenBuys: { count: number };
    totalOpenSells: { count: number };
  }
}

export interface OrderParams {
  side: string;
  base_size?: number;
  quote_size?: number;
  limit_price?: number;
  original_sell_price?: number;
  original_buy_price?: number;
  trade_pair_ratio?: number;
  product_id?: string;
  tradingPrice?: number;
}

export interface SingleTradeProps {
  order: Order;
  preview: boolean;
}

export interface BotSettings {
  loop_speed: number;
  orders_to_sync: number;
  full_sync: number;
  maintenance: boolean;
}

export interface Funds {
  base_available: number;
  base_spent: number;
  quote_available: number;
  quote_spent_on_product: number;
  // base currency is the currency you are buying, like BTC
  base_currency: string;
  base_increment: string,
  // quote currency is the currency you are getting a price quote in, 
  // normally USD
  quote_currency: string;
  quote_increment: string,
  base_increment_decimals: number,
  quote_increment_decimals: number,
  base_inverse_increment: number,
  quote_inverse_increment: number,
  baseMultiplier: number,
  quoteMultiplier: number,
  price_rounding: number,
  baseIncrement: number,
  quoteIncrement: number,
}

export interface AvailableFunds {
  [key: string]: Funds;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  password: string;
  admin: boolean;
  active: boolean;
  approved: boolean;
  can_chat: boolean;
  will_delete: boolean;
  joined_at: string;
  botMaintenance: boolean;
  botSettings: BotSettings;
  sandbox: boolean;
  availableFunds: AvailableFunds;
  exporting: boolean;
  simulating: boolean;
  theme: string;
  profit_accuracy: number;
  profit_reset: string;
  maker_fee: number;
  taker_fee: number;
  usd_volume: number;
  paused: boolean;
  kill_locked: boolean;
  sync_quantity: number;
  max_trade_load: number;
  profit: number;
  reinvest: boolean;
  reinvest_ratio: number;
  max_trade_size: number;
  reserve: number;
  max_trade: boolean;
  post_max_reinvest_ratio: number;
}

export interface ProfitForDuration {
  duration: string;
  productProfit: number;
  allProfit: number;
}

export interface BotSettings {
  loop_speed: number;
  orders_to_sync: number;
  full_sync: number;
  maintenance: boolean;
}

export interface Product {
  activated_at: string;
  active_for_user: boolean;
  auction_mode: boolean;
  average: string;
  base_currency_id: string;
  base_increment: string;
  base_max_size: string;
  base_min_size: string;
  base_name: string;
  cancel_only: boolean;
  fcm_trading_session_details: null;
  is_disabled: boolean;
  limit_only: boolean;
  mid_market_price: null;
  new: boolean;
  post_only: boolean;
  price: string;
  price_percentage_change_24h: string;
  product_id: string;
  product_type: string;
  quote_currency_id: string;
  quote_increment: string;
  quote_max_size: string;
  quote_min_size: string;
  quote_name: string;
  status: string;
  trading_disabled: boolean;
  user_id: string;
  volume_24h: string;
  volume_percentage_change_24h: string;
  watched: boolean;
}

export interface Products {
  allProducts: Product[];
  activeProducts: Product[];
}

export interface Decimals {
  // baseIncrement: number;
  // baseMultiplier: number;
  // quoteIncrement: number;
  // quoteMultiplier: number;

  base_increment: string,
  quote_increment: string,
  base_increment_decimals: number,
  quote_increment_decimals: number,
  base_inverse_increment: number,
  quote_inverse_increment: number,
  price_rounding: number,
}

export interface ProductWithDecimals extends Product, Decimals { }

export interface marketOrderState {
  base_size: number;
  quote_size: number;
  side: string;
}

export type EventType = MouseEvent | ChangeEvent | FormEvent;

export type ChangeEventTypes = React.ChangeEvent<HTMLSelectElement>
  | React.ChangeEvent<HTMLInputElement>
  | React.ChangeEvent<HTMLTextAreaElement>

export interface Message {
  cCount: null | number;
  from: null | string;
  mCount: number;
  orderUpdate: boolean;
  text: string;
  timeStamp: string;
  type: string;
}

// {
//   botMessages: Message[];
//   chatMessages: Message[];
// }
export type Messages = Message[];

export interface Tickers {
  [key: string]: {
    price: number;
  }
}

export class FetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}