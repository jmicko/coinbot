import { useEffect, useRef, useState, ReactNode } from 'react';
import { Tickers } from '../types';
import { WebSocketContext } from './useWebsocket';
import { useData } from './useData';

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [tickers, setTickers] = useState<Tickers>({ "BTC-USD": { price: 0 }, "ETH-USD": { price: 0 } });
  const [heartbeat, setHeartbeat] = useState({ heart: 'heart', beat: 'beat', count: 0 });
  const { setSocketStatus, productID } = useData();
  const currentPrice = tickers[productID]?.price;

  useEffect(() => {
    let ENDPOINT = origin;
    let shouldClose = false;
    console.log('ENDPOINT: ', ENDPOINT);
    ENDPOINT = ENDPOINT.replace('http', 'ws');
    console.log('ENDPOINT: ', ENDPOINT);
    let backoff = 1000;

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
          timer(socket);
        };

        socket.onmessage = (event) => {

          const data = JSON.parse(event.data);

          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));

          } else if (data.type === 'heartbeat') {
            // console.log('heartbeat data: ', data);
            setHeartbeat(prevHeartbeat => {
              if (data.side === 'heart') {
                return prevHeartbeat.heart === 'heart'
                  ? ({ ...prevHeartbeat, count: data.count, heart: 'HEART' })
                  : ({ ...prevHeartbeat, count: data.count, heart: 'heart' })
              } else {
                return prevHeartbeat.beat === 'beat'
                  ? ({ ...prevHeartbeat, beat: 'BEAT' })
                  : ({ ...prevHeartbeat, beat: 'beat' })
              }
            })

          } else if (data.type === 'ticker') {
            // console.log('ticker data: ', data);
            const ticker = data.ticker;
            setTickers(prevTickers => ({
              ...prevTickers,
              [ticker.product_id]: ticker
            }));
          } else if (data.type === 'socketStatus') {
            // console.log('socketStatus data: ', data);
            setSocketStatus(data.status);
          } else {
            console.log('WebSocket message: ', data);
          }
          timer(socket);
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

      function timer(socket: WebSocket) {
        clearTimeout(timeOut);
        timeOut = setTimeout(() => {
          console.log('ending socket after timeout');
          socket.close();
        }, 10000);
      }



    }

    reconnect();

    return () => {
      console.log('WebSocket closing on unmount');
      shouldClose = true;
      socketRef.current?.close();
    };
  }, [setSocketStatus]);

  // const value = useMemo(() => ({ socket: socketRef.current }), []);


  return (
    <WebSocketContext.Provider
      // value={value}>
      value={{
        socket: socketRef.current,
        heartbeat,
        tickers,
        currentPrice,
      }}>
      {children}
    </WebSocketContext.Provider>
  );
};