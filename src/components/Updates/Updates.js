import React, { useState } from "react";
import io from "socket.io-client";
import './Updates.css'
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT, { transports: ['websocket'] });
// adding cors arg in server let's us get rid of the transports arg
// const socket = io(ENDPOINT);

function Updates() {
  const [message, setMessage] = useState("");
  const [checkerUpdate, setCheckerUpdate] = useState("");

  // console log any messages from server
  socket.on('checkerUpdate', data => {
    console.log(data);
    setCheckerUpdate(data)
    // console.log('update from the loop', checkerUpdate);
  });


  socket.on('message', message => {
    setMessage(message)
    console.log(message);
  });

  return (
    // show messages on screen
    <div className="Updates">
      <h3>Checking trade:</h3>
      <p>Trade id: {checkerUpdate.id} -- Price per BTC: {checkerUpdate.price} -- Size: {checkerUpdate.size} BTC -- Buy/Sell: {checkerUpdate.side}</p>
      <p>Trade is settled: {checkerUpdate.settled ? "YES :)" : "no :("}</p>
    </div>
  );
}

export default Updates;