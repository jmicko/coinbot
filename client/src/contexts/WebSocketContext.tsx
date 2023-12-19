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
    let shouldClose = false;
    console.log('ENDPOINT: ', ENDPOINT);
    ENDPOINT = ENDPOINT.replace('http', 'ws');
    console.log('ENDPOINT: ', ENDPOINT);
    let backoff = 1000;

    // console.log(user, 'user in WebSocketProvider');

    // socketRef.current = new WebSocket(ENDPOINT + '/api');

    function reconnect() {
      shouldClose = false;
      let timeOut: NodeJS.Timeout;
      console.log('reconnecting');
      try {
        socketRef.current = new WebSocket(ENDPOINT + '/api');

        const socket = socketRef.current;

        socket.onopen = () => {
          backoff = 1000;
          console.log('WebSocket open');
          timer();
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          } else {
            console.log('WebSocket message: ', data);
          }
          timer();
        };

        // handle errors
        socket.onerror = (error) => {
          console.log('WebSocket error: ', error);
          socket.close();
        };

        socket.onclose = () => {
          console.log('WebSocket closed');
          // attempt to reconnect
          if (shouldClose) return;
          setTimeout(() => {
            // console.log(`trying again after ${backoff} milliseconds`);
            reconnect();
            // console.log('reconnected');
          }, backoff);
          backoff *= 2;
          if (backoff > 30000) backoff = 30000;
        };

        function timer() {
          clearTimeout(timeOut);
          timeOut = setTimeout(() => {
            console.log('ending socket after timeout');
            socket.close();
          }, 10000);
        }


      } catch (error) {
        console.log('error reconnecting: ', error);
        shouldClose = true;
        // if there is a socket, close it
        socketRef.current?.close();
        // attempt to reconnect
        console.log(`trying again after ${backoff} milliseconds`);
        setTimeout(() => {
          reconnect();
          console.log('reconnected');
        }, backoff);
        backoff *= 2;
        if (backoff > 30000) backoff = 30000;
      }
    }

    reconnect();

    return () => {
      console.log('WebSocket closing on unmount');
      shouldClose = true;
      socketRef.current?.close();
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