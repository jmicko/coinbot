import React, { useEffect, useState } from 'react';
import { useSocket } from "../../contexts/SocketProvider";
import './Messages.css'


function Updates() {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [errors, setErrors] = useState([]);
  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;
    socket.on('message', message => {
      if (message.message) {
        setMessages(prevMessages => {
          // keep max messages down to 3 by checking if more than 2 before adding new message
          if (prevMessages.length > 2) {
            prevMessages.shift();
          }
          return [...prevMessages, message.message]
        });
      }
      if (message.error) {
        setErrors(prevErrors => {
          // keep max messages down to 3 by checking if more than 2 before adding new message
          if (prevErrors.length > 2) {
            prevErrors.shift();
          }
          return [...prevErrors, message.error]
        });
      }
    });
    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket]);

  return (
    // show messages on screen
    <div className="Messages boxed">
      <h3 className="title">Coinbot Message Board:</h3>
      <div className="message-section boxed">
      <h3 className="title">General Messages:</h3>
        {messages.map((message, i) => {
          return <p key={i}>{message}</p>
        })}
      </div>
      <div className="errors-section boxed">
        <h3 className="title">Errors:</h3>
        {errors.map((error, i) => {
          return <p key={i}>{error}</p>
        })}
      </div>
    </div>
  );
}

export default Updates;