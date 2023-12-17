import React, { createContext, useContext, useEffect, useRef, FC, useMemo } from 'react';
// import { useUser } from './UserContext';

interface WebSocketContextProps {
  socket: WebSocket | null;
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
  // const { user } = useUser();

  useEffect(() => {
    let ENDPOINT = origin;
    console.log('ENDPOINT: ', ENDPOINT);
    ENDPOINT = ENDPOINT.replace('http', 'ws');
    console.log('ENDPOINT: ', ENDPOINT);

    // console.log(user, 'user in WebSocketProvider');

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

  const value = useMemo(() => ({ socket: socketRef.current }), []);

  return (
    <WebSocketContext.Provider
      value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};