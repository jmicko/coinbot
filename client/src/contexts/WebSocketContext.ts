import { MutableRefObject, createContext } from "react";
import { Tickers } from "../types";

interface WebSocketContextProps {
  heartbeat: { heart: string, beat: string, count: number };
  tickers: Tickers;
  currentPrice: string;
  socketRef?: MutableRefObject<WebSocket | null>;
  coinbotSocket: string;
  socketStatus: string;
}

export const WebSocketContext
  = createContext<WebSocketContextProps>({} as WebSocketContextProps);
