import { useEffect, useRef, useState, ReactNode, useCallback, useMemo } from 'react';
import { Tickers, WsMessage } from '../types';
import { useData } from '../hooks/useData';
import { useIdentifiers } from '../hooks/useIdentifiers';
import { WebSocketContext } from '../contexts/WebSocketContext';

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const url = useMemo(() => { return origin.replace('http', 'ws') + '/api'; }, []);
  const { fetchHandlers, productID, pqd } = useData();
  const [tickers, setTickers] = useState<Tickers>({ "BTC-USD": { price: '0' }, "ETH-USD": { price: '0' } });
  const currentPrice = Number(tickers[productID]?.price).toFixed(pqd || 2);
  const { fetchIdentifiers } = useIdentifiers();
  const socketRef = useRef<WebSocket | null>(null);
  const timeOut = useRef<NodeJS.Timeout>();
  const [heartbeat, setHeartbeat] = useState({ heart: 'heart', beat: 'beat', count: 0 });
  const [coinbotSocket, setCoinbotSocket] = useState('closed');
  const [socketStatus, setSocketStatus] = useState('closed');

  const handleMessage = useCallback((event: MessageEvent) => {
    socketRef.current && timer(socketRef.current);
    const data: WsMessage = JSON.parse(event.data);
    // console.log('data from useWebSocket');

    if (alreadyFetched(data)) return;

    switch (data.type) {
      case 'ticker': {
        const ticker = data.ticker;
        setTickers((prev) => {
          return { ...prev, [ticker.product_id]: ticker };
        });
        break;
      }
      case 'heartbeat':
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
      case 'ping':
        socketRef.current?.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'chat':
      case 'general':
      case 'messageUpdate':
        if (data.orderUpdate) fetchHandlers['orderUpdate']();
        fetchHandlers['messageUpdate']();
        break;
      case 'socketStatus':
        setSocketStatus(data.socketStatus);
        break;
      default:
        console.log('default case from useWebSocket', data);
        typeof fetchHandlers[data.type] === 'function' &&
          fetchHandlers[data.type]();
    }

    function alreadyFetched(data: WsMessage) {
      if (data.identifier && fetchIdentifiers.current.includes(data.identifier)) return true;
      return false;
    }
  }, [fetchHandlers, fetchIdentifiers]);

  function timer(socket: WebSocket) {
    // console.log('starting socket timer');
    // setCoinbotSocket('open');
    clearTimeout(timeOut.current);
    timeOut.current = setTimeout(() => {
      console.log('ending socket after timeout');
      setCoinbotSocket('timeout');
      socket.close();
    }, 10000);
  }


  // CONNECT ON MOUNT 
  useEffect(() => {
    let shouldClose = false;

    function connect() {
      if (socketRef.current
        && socketRef.current.readyState !== WebSocket.CLOSED
      ) {
        console.log('already connected to socket', socketRef.current);
        return;
      }
      console.log('connecting to socket');
      shouldClose = false;
      socketRef.current = new WebSocket(url);
      const socket = socketRef.current;
      // timer(socket);
      console.log(socket, 'socket from useWebSocket');

      socket.onopen = () => {
        console.log('connected to socket');
        // setCoinbotSocket('open');
        timer(socket);
      };

      socket.onmessage = handleMessage;

      socket.onclose = () => {
        // reconnect on remount, don't reconnect on unmount
        console.log('socket closed, should close:', shouldClose);

        if (!shouldClose) {
          console.log('reopening socket');
          // socketRef.current = null;
          setTimeout(() => {
            console.log('has been 1 second, reopening socket');

            connect();
          }, 1000);
        }
      }
      socket.onerror = (event) => {
        console.log('socket error:', event);
        socket.close();
      }
    }

    connect();

    return () => {
      console.log('closing socket on rerender, should close:', shouldClose);
      timeOut.current && clearTimeout(timeOut.current);
      shouldClose = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [url, fetchHandlers, handleMessage]);

  useEffect(() => {
    // console.log('changing socket status based on new readyState');
    if (socketRef.current) {
      switch (socketRef.current.readyState) {
        case WebSocket.OPEN:
          // console.log('socket is open');
          setCoinbotSocket('open');
          break;
        case WebSocket.CLOSED:
          setCoinbotSocket('closed');
          // console.log('socket is closed');
          break;
        case WebSocket.CONNECTING:
          setCoinbotSocket('reopening');
          // console.log('socket is reopening');
          break;
        default:
          setCoinbotSocket('closed');
          // console.log('socket is closed by default');
      }
    }
  }, [socketRef.current?.readyState]);

  return (
    <WebSocketContext.Provider
      // value={value}>
      value={{
        // socket: socketRef.current,
        // heartbeat,
        // tickers,
        currentPrice,
        socketRef,
        tickers,
        heartbeat,
        coinbotSocket,
        socketStatus,
        // deadCon
      }}>
      {children}
    </WebSocketContext.Provider>
  );
};