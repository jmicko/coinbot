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
  const [tickers, setTickers] = useState({ btc: { price: 0 }, eth: { price: 0 } });
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
        // console.log(ticker,'message from socket.io');
        // dispatch({ type: 'SET_TICKER_PRICE', payload: ticker });
        switch (ticker.product_id) {
          case 'BTC-USD':
            setTickers(prevTickers => ({ ...prevTickers, btc: ticker }));
            return;
          case 'ETH-USD':
            setTickers(prevTickers => ({ ...prevTickers, eth: ticker }));
            return;
          default:
            console.log(ticker, 'payload in set ticker price');
            return;

        };
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
      // handle errors
      if (message.type === 'errorUpdate') {
        dispatch({ type: 'FETCH_BOT_ERRORS' });
      }
      // handle messages
      if (message.type === 'messageUpdate') {
        dispatch({ type: 'FETCH_BOT_MESSAGES' });
        if (message.orderUpdate) {
          dispatch({ type: 'FETCH_ORDERS' });
          dispatch({ type: 'FETCH_PROFITS' });
          dispatch({ type: 'FETCH_USER' });
        }
      }
    });

    // save the new socket and close the old one
    setSocket(newSocket);
    return () => {
      newSocket.off('message')
      newSocket.close();
    }
  }, [dispatch]);


  return (
    <SocketContext.Provider value={{
      socket: socket,
      tickers: tickers,
      heartbeat: heartbeat
    }}>
      {/* <>Props: {JSON.stringify()}</> */}
      {children}
    </SocketContext.Provider>
  )
}