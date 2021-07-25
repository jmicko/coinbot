import React, { useEffect, useState } from 'react';
import { useSocket } from "../../contexts/SocketProvider";
import './Messages.css'

let count = 0;

function Updates() {
  // const [fromBot, storeFromBot] = useState("");
  // const [exchangeUpdate, setExchangeUpdate] = useState("");

  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;


    socket.on('message', message => {
      setMessages(prevMessages => [...prevMessages, message.message]);
    });
    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket]);
  
  
  useEffect(() =>{
    // todo - figure out why this is 2 instead of 3. Something about renders
    if (messages.length > 2) {
      messages.shift();
      // setMessages(messages);
    }

  }, [messages])

  return (
    // show messages on screen
    <div className="Updates boxed">
      <h3 className="title">Coinbot Message Board:</h3>

      {/* <>{JSON.stringify(messages)}</> */}
      {messages.map((message, i) => {
        return <p key={i}>{message}</p>
      })}


      {/* <p>Trade id: {exchangeUpdate.id} -- Price per BTC: {exchangeUpdate.price} -- Size: {exchangeUpdate.size} BTC -- Buy/Sell: {exchangeUpdate.side}
        -- Settled: {exchangeUpdate.settled ? "YES :)" : "no :("}</p> */}
      {/* <p>message #{count}: {fromBot}</p> */}

    </div>
  );
}

export default Updates;