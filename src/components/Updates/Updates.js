import React, { useState, useEffect } from "react";
import io from "socket.io-client";
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT, {transports: ['websocket']});
// adding cors arg in server let's us get rid of the transports arg
// const socket = io(ENDPOINT);

function Updates() {
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");

  // console log any messages from server
  socket.on("message", data => {
    setMessage(data.message)
  });
  
  return (
    // show messages on screen
    <div>

    {/* <p>
      message from server: {JSON.stringify(message)}
    </p> */}
    <h3>Checking trade:</h3>
    <p>Trade id: {message.id}</p>
    <p>Price per BTC: {message.price}</p>
    <p>Size: {message.size} BTC</p>
    <p>Buy/Sell: {message.side}</p>
    <p>Trade is settled: {message.settled ? "YES" : "no :("}</p>
    </div>
  );
}

export default Updates;