import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import io from "socket.io-client";
import './Status.css'
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT, { transports: ['websocket'] });

function Status() {
  const dispatch = useDispatch();
  const [loopStatus, setLoopStatus] = useState("I count loops");

  

  socket.on('update', message => {
    // setaMessage(message.message);
    // count++;
    setLoopStatus(message.loopStatus);
    console.log(`messrage:`, message.loopStatus);
  });

  return (
    <div className="Status boxed">
        <h3 className="title">
        Status
        </h3>
      <p className="info">{loopStatus}</p>
    </div>
  )
}

export default Status;