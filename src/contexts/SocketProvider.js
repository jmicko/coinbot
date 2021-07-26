import React, { useContext, useEffect, useState } from 'react'
import io from "socket.io-client";

// followed this guide for setting up the socket provider in its own component and not cluttering up App.js

export const SocketContext = React.createContext();
// use this in child components to get the socket
export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState()
  // useEffect to prevent from multiple connections
  useEffect(() => {
    const ENDPOINT = "http://localhost:5000";
    const newSocket = io(
      ENDPOINT,
      { transports: ['websocket'] }
    );
    // save the new socket and close the old one
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);


  return (
    <SocketContext.Provider value={socket}>
      {/* <>{JSON.stringify()}</> */}
      {children}
    </SocketContext.Provider>
  )
}