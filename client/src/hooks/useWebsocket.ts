import { useContext } from "react";
import { WebSocketContext } from "../contexts/WebSocketContext";

export function useWebSocket() {
  return useContext(WebSocketContext);
}
