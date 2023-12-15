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

export interface AvailableFunds {
  [key: string]: {
    base_available: number;
    quote_available: number;
    
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