import React, { useContext, useEffect, useRef, useState } from 'react'
// import { useDispatch } from 'react-redux';
// import { useSelector } from 'react-redux';
import io from "socket.io-client";
import { useData } from './DataContext';
import { useUser } from './UserContext';

// followed this guide for setting up the socket provider in its own component and not cluttering up App.js

export const SocketContext = React.createContext();
// use this in child components to get the socket
export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState();
  const [socketStatus, setSocketStatus] = useState('closed');
  const { refreshUser } = useUser();
  const { products, refreshProfit, refreshOrders, refreshProducts, refreshExportableFiles } = useData();
  const [tickers, setTickers] = useState({ "BTC-USD": { price: 0 }, "ETH-USD": { price: 0 } });
  const [heartbeat, setHeartbeat] = useState({ heart: 'heart', beat: 'beat', count: 0 });
  // const dispatch = useDispatch();

  // // create ref for refreshOrders, refreshProfit, refreshProducts, refreshUser, and product
  const refreshOrdersRef = useRef();
  const refreshProfitRef = useRef();
  const refreshProductsRef = useRef();
  const refreshUserRef = useRef();
  const productRef = useRef();
  const refreshExportableFilesRef = useRef();

  // // update the refs when the functions change
  useEffect(() => {
    refreshOrdersRef.current = refreshOrders;
    refreshProfitRef.current = refreshProfit;
    refreshProductsRef.current = refreshProducts;
    refreshUserRef.current = refreshUser;
    productRef.current = products;
    refreshExportableFilesRef.current = refreshExportableFiles;
  }, [refreshOrders, refreshProfit, refreshProducts, refreshUser, products, refreshExportableFiles]);


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
        // console.log('ticker', ticker);
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
        // dispatch({ type: 'FETCH_BOT_ERRORS' });
      }
      // handle messages
      if (message.type === 'messageUpdate' || message.type === 'chat' || message.type === 'general') {
        // dispatch({ type: 'FETCH_BOT_MESSAGES' });
      }
      // fetch orders if orderUpdate
      if (message.orderUpdate) {
        // refreshOrders();
        refreshOrdersRef.current();
      }
      // fetch products if productUpdate
      if (message.productUpdate) {
        refreshProductsRef.current();
      }
      if (message.profitUpdate || message.orderUpdate) {
        refreshProfitRef.current();

      }
      if (message.userUpdate) {
        refreshUserRef.current();
      }
      if (message.fileUpdate) {
        console.log('file update in socket provider')
        refreshExportableFilesRef.current();
      }
      if (message.type === 'simulationResults') {
        console.log(message.data, 'simulation results in socket provider')
        // dispatch({
        //   type: 'SET_SIMULATION_RESULT',
        //   payload: message.data
        // });
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
      console.log('closing socket')
      clearInterval(ping);
      newSocket.off('message')
      newSocket.off('connect_error')
      newSocket.close();
    }
  }, [
    // products,
    // refreshOrders, 
    // refreshProfit,
    //  refreshProducts, 
    // refreshUser
    productRef, refreshOrdersRef, refreshProfitRef, refreshProductsRef, refreshUserRef
  ]);


  return (
    <SocketContext.Provider value={{
      socket: socket,
      socketStatus: socketStatus,
      tickers: tickers,
      heartbeat: heartbeat
    }}>
      {children}
    </SocketContext.Provider>
  )
}