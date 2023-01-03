import React, { useContext, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux';
// import { useSelector } from 'react-redux';
import io from "socket.io-client";

// followed this guide for setting up the socket provider in its own component and not cluttering up App.js

export const SocketContext = React.createContext();
// use this in child components to get the socket
export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState();
  const [socketStatus, setSocketStatus] = useState('closed');
  const [messenger, setMessenger] = useState();
  const [disconnect, setDisconnect] = useState();
  const [product, setProduct] = useState('BTC-USD');
  const [tickers, setTickers] = useState({ "BTC-USD": { price: 0 }, "ETH-USD": { price: 0 } });
  const [heartbeat, setHeartbeat] = useState({ heart: 'heart', beat: 'beat', count: 0 });
  const dispatch = useDispatch();
  // useEffect to prevent from multiple connections
  useEffect(() => {
    // check if on dev server or build, and set endpoint appropriately
    let ENDPOINT = origin;
    if (origin === "http://localhost:3000") {
      ENDPOINT = "http://localhost:5000";
    }
    const newSocket = io(
      ENDPOINT,
      { transports: ['websocket'] }
    );
    newSocket.on('message', message => {
      if (message.type === 'ticker') {
        const ticker = message.ticker
        // set the ticker based on the product id
        setTickers(prevTickers => ({ ...prevTickers, [ticker.product_id]: ticker }));
      }
      // handle heartbeat
      if (message.type === 'heartbeat') {
        setHeartbeat(prevHeartbeat => {
          if (message.side === 'heart') {
            return prevHeartbeat.heart === 'heart'
              ? ({ ...prevHeartbeat, count: message.count, heart: 'HEART' })
              : ({ ...prevHeartbeat, count: message.count, heart: 'heart' })
          } else {
            return prevHeartbeat.beat === 'beat'
              ? ({ ...prevHeartbeat, beat: 'BEAT' })
              : ({ ...prevHeartbeat, beat: 'beat' })
          }
        })
      }
      // handle cb websocket status
      if (message.type === 'socketStatus') {
        setSocketStatus(message.socketStatus)
      }
      // handle errors
      if (message.type === 'error') {
        dispatch({ type: 'FETCH_BOT_ERRORS' });
      }
      // handle messages
      if (message.type === 'messageUpdate' || message.type === 'chat' || message.type === 'general') {
        dispatch({ type: 'FETCH_BOT_MESSAGES' });
      }
      // fetch orders if orderUpdate
      if (message.orderUpdate) {
        console.log('order update in socket provider')
        dispatch({
          type: 'FETCH_ORDERS',
          // send current product to fetch orders for
          payload: { product: product }
        });
      }
      // fetch products if productUpdate
      if (message.productUpdate) {
        dispatch({ type: 'FETCH_PRODUCTS' });
      }
      if (message.profitUpdate || message.orderUpdate) {
        dispatch({
          type: 'FETCH_PROFITS',
          // send current product to fetch profits for
          payload: { product: product }
        });
      }
      if (message.userUpdate) {
        dispatch({ type: 'FETCH_USER' });
      }
      if (message.fileUpdate) {
        console.log('file update in socket provider')
        dispatch({ type: 'FETCH_EXPORT_FILES' });
        dispatch({ type: 'FETCH_USER' });
      }
    });

    const ping = setInterval(() => {
      newSocket.emit('message', 'ping')
    }, 1000);

    newSocket.sendChat = (chat) => {
      newSocket.emit('message', { type: 'chat', data: chat })
    }

    // setMessenger(sendChat);

    // setDisconnect(newSocket.close)

    newSocket.on("connect_error", (err) => {
      newSocket.disconnect();
      setTimeout(() => {
        newSocket.connect()
      }, 5000);
      console.log(err instanceof Error); // true
      console.log(err.message); // not authorized
      console.log(err.data); // { content: "Please retry later" }
    });

    // save the new socket and close the old one
    setSocket(newSocket);
    return () => {
      clearInterval(ping);
      newSocket.off('message')
      newSocket.off('connect_error')
      newSocket.close();
    }
  }, [dispatch, product]);


  return (
    <SocketContext.Provider value={{
      socket: socket,
      socketStatus: socketStatus,
      messenger: messenger,
      product: product,
      setProduct: setProduct,
      tickers: tickers,
      heartbeat: heartbeat
    }}>
      {/* <>Props: {JSON.stringify()}</> */}
      {children}
    </SocketContext.Provider>
  )
}