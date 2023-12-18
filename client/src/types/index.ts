export interface Decimals {
  baseIncrement: number;
  baseMultiplier: number;
  quoteIncrement: number;
  quoteMultiplier: number;

  base_increment: string,
  quote_increment: string,
  base_increment_decimals: number,
  quote_increment_decimals: number,
  base_inverse_increment: number,
  quote_inverse_increment: number,
  price_rounding: number,
}

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
  quote_available: number;
  
  base_currency: string;
  base_increment: string,
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