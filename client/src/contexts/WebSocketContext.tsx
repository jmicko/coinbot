import { useEffect, useRef, useState, ReactNode } from 'react';
import { Tickers, WsMessage } from '../types';
import { WebSocketContext } from './useWebsocket';
import { useData } from './useData';
import { useUser } from './useUser';
import { useIdentifiers } from './useIdentifiers';

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [tickers, setTickers] = useState<Tickers>({ "BTC-USD": { price: '0' }, "ETH-USD": { price: '0' } });
  const [heartbeat, setHeartbeat] = useState({ heart: 'heart', beat: 'beat', count: 0 });
  const {
    setSocketStatus,
    setCoinbotSocket,
    productID,
    refreshBotErrors,
    refreshBotMessages,
    refreshOrders,
    refreshProducts,
    refreshProfit
  } = useData();
  const { fetchIdentifiers } = useIdentifiers();
  const { refreshUser } = useUser();
  const currentPrice = Number(tickers[productID]?.price);

  useEffect(() => {
    let ENDPOINT = origin;
    let shouldClose = false;
    console.log('ENDPOINT: ', ENDPOINT);
    ENDPOINT = ENDPOINT.replace('http', 'ws');
    console.log('ENDPOINT: ', ENDPOINT);
    let backoff = 1000;

    // socketRef.current = new WebSocket(ENDPOINT + '/api');

    function reconnect() {
      const random = Math.random();
      shouldClose = false;
      let timeOut: NodeJS.Timeout;
      console.log('reconnecting...');
      try {
        socketRef.current = new WebSocket(ENDPOINT + '/api');
        console.log('successfully connected to socket', shouldClose);

        const socket = socketRef.current;

        socket.onopen = () => {
          backoff = 1000;
          console.log('WebSocket open');
          setCoinbotSocket('open');
          timer(socket);
        };
        console.log('successfully set onopen');

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          // console.log('WebSocket message: ', data);

          handleMessage(data, socket);
          data.type !== 'ticker' && console.log('ding', random);
          timer(socket);
        };
        console.log('successfully set onmessage');

        // handle errors
        socket.onerror = (error) => {
          try {
            console.log('WebSocket error: ', error);
            // console.log('WebSocket closing on error');

            // socket.close();
          } catch (error) {
            console.log('error closing socket: ', error);
          }
        };
        console.log('successfully set onerror');

        socket.onclose = () => {
          console.log('WebSocket closed. Was it supposed to?', shouldClose);
          setCoinbotSocket('closed');
          // attempt to reconnect
          if (shouldClose) return;
          setTimeout(() => {
            console.log(`trying again after ${backoff} milliseconds`);
            reconnect();
            // console.log('reconnected');
          }, backoff);
          backoff *= 2;
          if (backoff > 30000) backoff = 30000;
        };
        console.log('successfully set onclose');

      } catch (error) {
        console.log(error, '!!!!!!! !!!!!!! !!!!!!! error reconnecting !!!!!!! !!!!!!! !!!!!!!');
        shouldClose = true;
        console.log('>>>>>>shouldClose set to true');

        // if there is a socket, close it
        socketRef.current?.close();
        // attempt to reconnect
        console.log(`trying again after ${backoff} milliseconds`);
        setTimeout(() => {
          console.log('attempting reconnection');

          reconnect();
          console.log('reconnected');
        }, backoff);
        backoff *= 2;
        if (backoff > 30000) backoff = 30000;
      }

      function handleMessage(data: WsMessage, socket: WebSocket) {
        switch (data.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'heartbeat':
            // console.log('heartbeat data: ', data);
            setHeartbeat(prevHeartbeat => {
              if (data.side === 'heart') {
                return prevHeartbeat.heart === 'heart'
                  ? ({ ...prevHeartbeat, count: data.count, heart: 'HEART' })
                  : ({ ...prevHeartbeat, count: data.count, heart: 'heart' });
              } else {
                return prevHeartbeat.beat === 'beat'
                  ? ({ ...prevHeartbeat, beat: 'BEAT' })
                  : ({ ...prevHeartbeat, beat: 'beat' });
              }
            });
            break;

          case 'ticker':
            // console.log('ticker data: ', data);
            const ticker = data.ticker;
            setTickers(prevTickers => ({
              ...prevTickers,
              [ticker.product_id]: ticker
            }));
            break;

          case 'socketStatus':
            console.log('-----socketStatus data: ', data);
            setSocketStatus(data.socketStatus);
            break;

          case 'error':
            console.log('error socket message received: ');
            refreshBotErrors();
            break;

          case 'messageUpdate' || 'chat' || 'general':
            console.log('message socket message received: ');
            // refresh if any provided identifier is not in fetchIdentifiers
            if (alreadyFetched(data)) break;
            refreshBotMessages();
            if (data.orderUpdate) refreshOrders();
            break;

          case 'orderUpdate':
            console.log('order socket message received: ');
            // refresh if any provided identifier is not in fetchIdentifiers
            if (alreadyFetched(data)) break;
            refreshOrders();
            refreshProfit();
            break;

          case 'productUpdate':
            console.log('order socket message received: ');
            // refresh if any provided identifier is not in fetchIdentifiers
            if (alreadyFetched(data)) break;
            refreshProducts();
            break;

          case 'profitUpdate':
            console.log('profit socket message received: ');
            // refresh if any provided identifier is not in fetchIdentifiers
            if (alreadyFetched(data)) break;
            refreshProfit();
            break;

          case 'userUpdate':
            console.log(' update user socket message received \n', data);
            // refresh if any provided identifier is not in fetchIdentifiers
            if (alreadyFetched(data)) break;
            refreshUser();
            break;

          default:
            console.log('WebSocket message: ', data);
            break;
        }
      }

      function alreadyFetched(data: WsMessage) {
        if (data.identifier && fetchIdentifiers.current.includes(data.identifier)) return true;
        return false;
      }

      function timer(socket: WebSocket) {
        // console.log('starting socket timer');
        setCoinbotSocket('open');
        clearTimeout(timeOut);
        timeOut = setTimeout(() => {
          console.log('ending socket after timeout');
          setCoinbotSocket('timeout');
          socket.close();
        }, 10000);
      }



    }

    try {
      if (!shouldClose) {
        console.log('WebSocket re/connecting...');
        setCoinbotSocket('reopening');
        reconnect();
      } else {
        console.log('WebSocket closing and not reconnecting');
      }
    } catch (error) {
      console.log('error connecting: ', error);
    }

    return () => {
      console.log('WebSocket closing on unmount, setting shouldClose to true');
      shouldClose = true;
      try {
        socketRef.current?.close();
      } catch (error) {
        console.log('error closing socket: ', error);
      }
    };
  }, [
    setSocketStatus,
    refreshBotErrors,
    refreshBotMessages,
    refreshOrders,
    refreshProducts,
    refreshProfit,
    refreshUser,
    fetchIdentifiers,
    setCoinbotSocket,
  ]);

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