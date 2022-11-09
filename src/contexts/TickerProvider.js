import React, { useContext, useEffect, useState } from 'react'
// import io from "socket.io-client";

// followed this guide for setting up the socket provider in its own component and not cluttering up App.js

export const TickerSocketContext = React.createContext();
// use this in child components to get the socket
export function useTickerSocket() {
  return useContext(TickerSocketContext)
}

export function TickerProvider({ children }) {
  const [socket, setSocket] = useState("bad")
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

    const newCoinbaseSocket = new WebSocket('wss://ws-feed.pro.coinbase.com');

    // Connection opened
    newCoinbaseSocket.addEventListener('open', function (event) {
      console.log('Successfully connected to Coinbase Websocket API!');
      newCoinbaseSocket.send(JSON.stringify(msg));
    });

    // Listen for messages
    newCoinbaseSocket.addEventListener('message', function (event) {
      let priceData = JSON.parse(event.data);

      switch (priceData.product_id) {
        case 'BTC-USD':
          setSocket(priceData.price);
          console.log(priceData.price);
          // document.getElementById('btc-price').innerHTML = priceData.price;
          break;
        case 'ETH-USD':
          // document.getElementById('eth-price').innerHTML = priceData.price;
          break;
        default:
          console.log('something happened', priceData);
      }

    });


    // const newSocket = io(
    //   ENDPOINT,
    //   { transports: ['websocket'] }
    // );


    // save the new socket and close the old one
    // setSocket(newCoinbaseSocket);
    return () => newCoinbaseSocket.close();
  }, []);


  return (
    <TickerSocketContext.Provider value={socket}>
      {/* <>{JSON.stringify()}</> */}
      {children}
    </TickerSocketContext.Provider>
  )
}