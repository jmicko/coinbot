import { MutableRefObject, createContext, useContext } from "react";
import { Messages, OrderParams, Orders, ProductWithDecimals, Products, ProfitForDuration } from "../types";

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
  currentProduct: ProductWithDecimals | null;
  pqd: number;
  pbd: number;
  refreshProducts: () => void;
  // messages: {[key: string]: Messages};
  // {
  //   messages: {
  //     botMessages,
  //     chatMessages
  //   },
  //   botErrors
  //   // , sendChat
  // }
  messages: { botMessages: Messages, chatMessages: Messages };
  // messages: Messages;
  refreshBotMessages: () => void;
  botErrors: Messages;
  refreshBotErrors: () => void;
  createMarketTrade: (order: OrderParams) => void;
  createOrderPair: (order: OrderParams) => void;
  syncPair: (body: { order_id: string }) => void;
  sendChat: ({ type, data }: { type: string, data: string }) => void;
  syncOrders: () => void;
  // deleteOrder: (orderID: string) => void;
  marketOrder: OrderParams;
  setMarketOrder: React.Dispatch<React.SetStateAction<OrderParams>>;
  tradeType: string;
  setTradeType: React.Dispatch<React.SetStateAction<string>>;
  coinbotSocket: string;
  setCoinbotSocket: React.Dispatch<React.SetStateAction<string>>;
  socketStatus: string;
  setSocketStatus: React.Dispatch<React.SetStateAction<string>>;
  deadCon: boolean;
}

// export const DataContext = createContext<DataContextProps>(defaultContext)
export const DataContext = createContext<DataContextProps>({} as DataContextProps)

export const useData = () => useContext(DataContext)