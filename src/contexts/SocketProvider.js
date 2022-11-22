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
        dispatch({ type: 'SET_TICKER_PRICE', payload: ticker })
      }
    });
    
    // save the new socket and close the old one
    setSocket(newSocket);
    return () => {
      newSocket.off('message')
      newSocket.close();
    }
  }, []);


  return (
    <SocketContext.Provider value={socket}>
      {/* <>Props: {JSON.stringify()}</> */}
      {children}
    </SocketContext.Provider>
  )
}