import React, { useContext, useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { useData } from './DataContext.js';
import { useUser } from './UserContext.js';

// followed this guide for setting up the socket provider in its own component and not cluttering up App.js

export const SocketContext = React.createContext();
// use this in child components to get the socket
export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState();
  const { refreshUser } = useUser();
  const { products, productID, refreshProfit, refreshOrders, refreshProducts, refreshExportableFiles,
    socketStatus, setSocketStatus, setCoinbotSocket,
    refreshBotMessages, refreshBotErrors, } = useData();
  const [tickers, setTickers] = useState({ "BTC-USD": { price: 0 }, "ETH-USD": { price: 0 } });
  const [heartbeat, setHeartbeat] = useState({ heart: 'heart', beat: 'beat', count: 0 });

  const currentProductPrice = tickers[productID]?.price;
  const currentPriceRef = useRef();
  useEffect(() => {
    currentPriceRef.current = currentProductPrice;
  }, [currentProductPrice, productID]);

  const currentPrice = currentPriceRef.current;

  // // create ref for refreshOrders, refreshProfit, refreshProducts, refreshUser, and product
  const refreshOrdersRef = useRef();
  const refreshProfitRef = useRef();
  const refreshProductsRef = useRef();
  const refreshUserRef = useRef();
  const productRef = useRef();
  const refreshExportableFilesRef = useRef();
  const setCoinbotSocketRef = useRef();
  const setSocketStatusRef = useRef();
  const refreshBotMessagesRef = useRef();
  const refreshBotErrorsRef = useRef();

  // // update the refs when the functions change
  useEffect(() => {
    refreshOrdersRef.current = refreshOrders;
    refreshProfitRef.current = refreshProfit;
    refreshProductsRef.current = refreshProducts;
    refreshUserRef.current = refreshUser;
    productRef.current = products;
    refreshExportableFilesRef.current = refreshExportableFiles;
    setCoinbotSocketRef.current = setCoinbotSocket;
    setSocketStatusRef.current = setSocketStatus;
    refreshBotMessagesRef.current = refreshBotMessages;
    refreshBotErrorsRef.current = refreshBotErrors;
  }, [refreshOrders, refreshProfit, refreshProducts, refreshUser, products, 
    refreshExportableFiles, setCoinbotSocket, setSocketStatus,
    refreshBotMessages, refreshBotErrors]);



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
        setSocketStatusRef.current(message.socketStatus)
      }
      // handle errors
      if (message.type === 'error') {
        // dispatch({ type: 'FETCH_BOT_ERRORS' });
        refreshBotErrorsRef.current();
      }
      // handle messages
      if (message.type === 'messageUpdate' || message.type === 'chat' || message.type === 'general') {
        // dispatch({ type: 'FETCH_BOT_MESSAGES' });
        refreshBotMessagesRef.current();
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
      newSocket.emit('pong', 'pong')
    }, 5000);

    // should receive a ping from the server every 5 seconds
    // if not, then reconnect
    function timer() {
      // console.log('clearing timeout')

      clearTimeout(newSocket.timeout);

      newSocket.timeout = setTimeout(() => {
        console.log('disconnecting after timeout')
        setCoinbotSocketRef.current('timeout');// socket can pass 'closed', 'open', 'timeout', and 'reopening' 
        newSocket.disconnect();

        setTimeout(() => {
          console.log('reconnecting after timeout');
          setCoinbotSocketRef.current('reopening');// socket can pass 'closed', 'open', 'timeout', and 'reopening'
          newSocket.connect();
        }, 5000);

      }, 10000);

    }

    newSocket.on('ping', () => {
      timer();
      // console.log('ping')
    })


    // newSocket.on('ping', timer);
    newSocket.on('connect', () => {
      console.log('connected')
      setCoinbotSocketRef.current('open'); // socket can pass 'closed', 'open', 'timeout', and 'reopening' 
      timer();
    });
    
    newSocket.on('disconnect', () => {
      console.log('disconnected')
      setCoinbotSocketRef.current('closed'); // socket can pass 'closed', 'open', 'timeout', and 'reopening'
    });

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
      clearTimeout(newSocket.timeout);
      newSocket.off('message')
      newSocket.off('ping')
      newSocket.off('connect')
      newSocket.off('connect_error')
      newSocket.close();
    }
  }, [
    // products,
    // refreshOrders, 
    // refreshProfit,
    //  refreshProducts, 
    // refreshUser
    // productRef, refreshOrdersRef, refreshProfitRef, refreshProductsRef, refreshUserRef
    // setSocketStatus
  ]);


  return (
    <SocketContext.Provider value={{
      socket,
      socketStatus,
      tickers,
      heartbeat,
      currentPrice,
    }}>
      {children}
    </SocketContext.Provider>
  )
}