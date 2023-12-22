import { createContext, useContext } from "react";
import { Tickers } from "../types";

interface WebSocketContextProps {
  socket: WebSocket | null;
  heartbeat: { heart: string, beat: string, count: number };
  tickers: Tickers;
  currentPrice: number;
}

const defaultContext: WebSocketContextProps = {
  socket: null,
  heartbeat: { heart: '', beat: '', count: 0 },
  tickers: {},
  currentPrice: 0,
};

export const WebSocketContext = createContext<WebSocketContextProps>(defaultContext);

export function useWebSocket(): WebSocketContextProps {
  return useContext(WebSocketContext);
}
