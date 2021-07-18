import React, { useState, useEffect } from "react";
import io from "socket.io-client";
const ENDPOINT = "http://localhost:5000";


const socket = io(ENDPOINT, {transports: ['websocket']});
// adding cors arg in server let's us get rid of the transports arg
// const socket = io(ENDPOINT);

function Updates() {
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");

  // not sure why this is in useEffect. Can it be moved out?
  // Looks like it can be. Also, moving the socket const into the function makes 
  // 3 connections for some reason
  // useEffect(() => {
  //   const socket = io(ENDPOINT, {transports: ['websocket']});
  //   socket.on("FromAPI", data => {
  //     setResponse(data);
  //   });
  //   socket.on("message", data => {
  //     console.log(data);
  //   });
  // }, []);

  // if client gets a message from server, it will show on screen
  socket.on("message", data => {
    console.log(data);
    setMessage(data.message)
  });
  return (
    <p>
      message from server: {message}
    </p>
  );
}

export default Updates;