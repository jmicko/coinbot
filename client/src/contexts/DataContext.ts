import { MutableRefObject, createContext } from "react";
import { Messages, OrderParams, Orders, Product, Products, ProfitForDuration } from "../types";

interface DataContextProps {
  productID: string;
  setProductID: React.Dispatch<React.SetStateAction<string>>;
  products: Products;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  orders: Orders;
  refreshOrders: () => void;
  isAutoScroll: boolean;
  setIsAutoScroll: React.Dispatch<React.SetStateAction<boolean>>;
  canScroll: MutableRefObject<boolean>;
  profit: ProfitForDuration[];
  refreshProfit: () => void;
  availableBase: number;
  availableQuote: number;
  currentProduct: Product;
  pqd: number;
  pbd: number;
  baseID: string;
  quoteID: string;
  refreshProducts: () => void;
  messages: { botMessages: Messages, chatMessages: Messages };
  refreshBotMessages: () => void;
  botErrors: Messages;
  refreshBotErrors: () => void;
  createMarketTrade: (order: OrderParams) => void;
  createOrderPair: (order: OrderParams) => void;
  syncPair: (body: { order_id: string }) => void;
  sendChat: ({ type, data }: { type: string, data: string }) => void;
  syncOrders: () => void;
  marketOrder: OrderParams;
  setMarketOrder: React.Dispatch<React.SetStateAction<OrderParams>>;
  tradeType: string;
  setTradeType: React.Dispatch<React.SetStateAction<string>>;
  fetchHandlers: {
    [key: string]: (() => Promise<void>) | (() => void);
  }
}

export const DataContext = createContext<DataContextProps>({} as DataContextProps)