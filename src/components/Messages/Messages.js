import React, { useEffect, useState } from 'react';
import { useSocket } from "../../contexts/SocketProvider";
import './Messages.css'


function Updates() {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
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
    });
    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket]);

  return (
    // show messages on screen
    <div className="Updates boxed">
      <h3 className="title">Coinbot Message Board:</h3>

      {/* <>{JSON.stringify(messages)}</> */}
      {messages.map((message, i) => {
        return <p key={i}>{message}</p>
      })}
    </div>
  );
}

export default Updates;