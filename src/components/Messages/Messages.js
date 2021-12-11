import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import { useSocket } from "../../contexts/SocketProvider";
import './Messages.css'


function Messages(props) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [errorCount, setErrorCount] = useState(0);

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;
    socket.on('message', message => {
      console.log('HERE IS THE WHOLE MESSAGE', message);
      if (message.userID === props.store.accountReducer.userReducer.id) {
        console.log('HERE IS THE USER ID FROM THE MESSAGE', message.userID);
        if (message.message) {
          setMessagesCount(prevMessagesCount => {
            console.log('previous error count', prevMessagesCount);
            return prevMessagesCount + 1;
          });
          setMessages(prevMessages => {
            // keep max messages down to 3 by checking if more than 2 before adding new message
            if (prevMessages.length > 999) {
              prevMessages.pop();
            }
            let datedMessage = {
              date: `${Date()}`,
              message: `${message.message}`
            }
            return [datedMessage, ...prevMessages]
          });
        }
        if (message.error) {
          setErrorCount(prevErrorCount => {
            console.log('previous error count', prevErrorCount);
            return prevErrorCount + 1;
          });
          setErrors(prevErrors => {
            // keep max messages down to 3 by checking if more than 2 before adding new message
            if (prevErrors.length > 999) {
              prevErrors.pop();
            }
            let datedError = {
              date: `${Date()}`,
              error: `${message.error}`
            }
            return [datedError, ...prevErrors]
          });
        }
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
      <h3 className={`title ${props.theme}`}>Coinbot Message Board</h3>
      <div className="message-board">
        <div className="message-section scrollable">
          <h3 className={`title ${props.theme}`}>General Messages</h3>
          {messages.map((message, i) => {
            return <p key={i}><strong>Msg #{messagesCount - i} {message.date}</strong> <br /> {message.message}</p>
          })}
        </div>
        <div className="errors-section scrollable">
          <h3 className={`title ${props.theme}`}>Errors</h3>
          {errors.map((error, i) => {
            return <p key={i}><strong>Err #{errorCount - i} {error.date}</strong> <br /> {error.error}</p>
          })}
        </div>
      </div>
    </div>
  );
}

export default connect(mapStoreToProps)(Messages);