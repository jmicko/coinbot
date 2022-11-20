import React, { useContext, useEffect, useState } from 'react'
// import io from "socket.io-client";

// followed this guide for setting up the socket provider in its own component and not cluttering up App.js

export const TickerSocketContext = React.createContext();
// use this in child components to get the socket
export function useTickerSocket() {
  return useContext(TickerSocketContext)
}

export function TickerProvider({ children }) {
  const [ticker, setTicker] = useState()
  const [sandboxTicker, setSandboxTicker] = useState(420)
  // useEffect to prevent from multiple connections
  useEffect(() => {

    // Subscription message to send
    let msg = {
      "type": "subscribe",
      "product_ids": [
        // "ETH-USD",
        "BTC-USD"
      ],
      "channels": [
        {
          "name": "ticker",
          "product_ids": [
            // "ETH-USD",
            "BTC-USD"
          ]
        }
      ]
    };

    // this should change when user is in sandbox mode, but not sure how to do that right now
    // MAYBE just use two feeds?
    let URI = 'wss://advanced-trade-ws.coinbase.com';
    // if (props?.sandbox) {
    let sandboxURI = 'wss://ws-feed-public.sandbox.exchange.coinbase.com';
    // }


    const newCoinbaseSocket = new WebSocket(URI);
    const newSandboxCoinbaseSocket = new WebSocket(sandboxURI);

    // Connection opened
    newCoinbaseSocket.addEventListener('open', function (event) {
      console.log('Successfully connected to Coinbase Websocket API!');
      newCoinbaseSocket.send(JSON.stringify(msg));
    });
    // Connection opened for sandbox feed, use same message
    newSandboxCoinbaseSocket.addEventListener('open', function (event) {
      console.log('Successfully connected to Coinbase Sandbox Websocket API!');
      newSandboxCoinbaseSocket.send(JSON.stringify(msg));
    });

    // Listen for messages
    newCoinbaseSocket.addEventListener('message', function (event) {
      let priceData = JSON.parse(event.data);
      if (priceData.product_id === 'BTC-USD') {
          setTicker(priceData.price);
      }
    });
    // Listen for messages
    newSandboxCoinbaseSocket.addEventListener('message', function (event) {
      let priceData = JSON.parse(event.data);
      if (priceData.product_id === 'BTC-USD') {
          setSandboxTicker(priceData.price);
      }
    });

    // close the socket on component reload
    return () => {
      newCoinbaseSocket.close()
      newSandboxCoinbaseSocket.close()
    };
  }, []);


  return (
    <TickerSocketContext.Provider value={{
      ticker: ticker,
      sandboxTicker: sandboxTicker
    }}>
      {children}
    </TickerSocketContext.Provider>
  )
}