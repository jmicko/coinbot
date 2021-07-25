import React, { useEffect, useState } from 'react';
import io from "socket.io-client";
import './Updates.css'
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT, { transports: ['websocket'] });
// adding cors arg in server let's us get rid of the transports arg
// const socket = io(ENDPOINT);

let count = 0;

function Updates() {
  const [fromBot, storeFromBot] = useState("");
  // const [exchangeUpdate, setExchangeUpdate] = useState("");

  useEffect(() => {
  // console log any messages from server
  socket.on('update', data => {
    // console.log(data);
    // setExchangeUpdate(data)
    // console.log('update from the loop', exchangeUpdate);
  });

  socket.on('message', message => {
    // setaMessage(message.message);
    count++;
    storeFromBot(message.message);
    console.log(`message #${count}:`, message);
    setTimeout(() => {
      storeFromBot("waiting for more messages...");
    }, 6000);
  });

}, [])

  return (
    // show messages on screen
    <div className="Updates boxed">
      <h3 className="title">Coinbot message board:</h3>

      {/* <p>Trade id: {exchangeUpdate.id} -- Price per BTC: {exchangeUpdate.price} -- Size: {exchangeUpdate.size} BTC -- Buy/Sell: {exchangeUpdate.side}
        -- Settled: {exchangeUpdate.settled ? "YES :)" : "no :("}</p> */}
      <p>message #{count}: {fromBot}</p>

    </div>
  );
}

export default Updates;