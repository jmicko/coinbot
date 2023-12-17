import React, { createContext, useContext, useEffect, useRef, FC } from 'react';

interface WebSocketContextProps {
  current: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextProps | null>(null);

export function useWebSocket(): WebSocketContextProps | null {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: FC<WebSocketProviderProps> = ({ children }) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ENDPOINT = origin;
    console.log('ENDPOINT: ', ENDPOINT);
    ENDPOINT = ENDPOINT.replace('http', 'ws');
    console.log('ENDPOINT: ', ENDPOINT);

    // if (ENDPOINT.includes('localhost')) {
    //   ENDPOINT = 'ws://localhost:5000';
    // }
    
    socketRef.current = new WebSocket(ENDPOINT + '/api');
    // socketRef.current = new WebSocket(ENDPOINT);

    const socket = socketRef.current;

    socket.onopen = () => {
      console.log('WebSocket open');
    };

    socket.onmessage = (event) => {
      console.log('WebSocket message: ', event.data);
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      console.log('WebSocket closing on unmount');
      socket.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={socketRef}>
      {children}
    </WebSocketContext.Provider>
  );
};