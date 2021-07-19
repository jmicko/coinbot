import React, { useState, useEffect } from "react";
import io from "socket.io-client";
const ENDPOINT = "http://localhost:5000";


const socket = io(ENDPOINT, {transports: ['websocket']});
// adding cors arg in server let's us get rid of the transports arg
// const socket = io(ENDPOINT);

function Updates() {
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");
  let count = 0;

  // console log any messages from server
  socket.on("message", data => {
    console.log(data, count);
    count++;
    setMessage(data.message)
  });
  
  return (
    // show messages on screen
    <p>
      message from server: {JSON.stringify(message)}
    </p>
  );
}

export default Updates;