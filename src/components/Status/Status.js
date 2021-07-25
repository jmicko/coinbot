import React, { useEffect, useState, useContext } from 'react';
import { connect, useDispatch } from 'react-redux';
// import io from "socket.io-client";
import './Status.css'
import { useSocket } from "../../contexts/SocketProvider";


function Status(props) {
  const dispatch = useDispatch();
  const [loopStatus, setLoopStatus] = useState("I count loops");
  const [connection, setConnection] = useState("disconnected");

  const socket = useSocket();

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;
    

    socket.on('update', update => {
      // loop status updates get saved to own state
      if (update.loopStatus != null){
        setLoopStatus(update.loopStatus)
      }
      // connection status updates get saved to own state
      if (update.connection != null){
        setConnection(update.connection)
        // console.log(`message:`, message.loopStatus);
      }
    });

    // this will remove the listener when component rerenders
    return () => socket.off('update')
// useEffect will depend on socket because the connection will 
// not be there right when the page loads
  }, [socket])

  return (

    <div className="Status boxed">
      <h3 className="title">
        Status
      </h3>
      <p className="info">{connection}</p>
      <p className="info">{loopStatus}</p>
    </div>
  )
}

export default Status;