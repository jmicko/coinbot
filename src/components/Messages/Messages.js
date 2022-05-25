import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import { useSocket } from "../../contexts/SocketProvider";
import './Messages.css'


function Messages(props) {
  const dispatch = useDispatch();
  const [collapsed, setCollapsed] = useState(false);

  function toggleCollapse() {
    setCollapsed(!collapsed);
  }

  useEffect(() => {
    dispatch({ type: 'FETCH_BOT_ERRORS' });
    dispatch({ type: 'FETCH_BOT_MESSAGES' });
  }, [])


  return (
    // show messages on screen
    <div className="Messages boxed">
      <h3 className={`title ${props.theme}`} onClick={toggleCollapse}>Coinbot Message Board {collapsed ? <>&#9650;</> : <>&#9660;</>}</h3>
      <div className="message-board">
        {/* MESSAGES */}
        <div className="message-section scrollable">
          <h3 className={`title ${props.theme}`}>{collapsed && props.messagesCount} General Messages</h3>
          {/* {!collapsed && props.messages.map((message, i) => {
            return <p key={i}><strong>Msg #{props.messagesCount - i} {message.date}</strong> <br /> {message.message}</p>
          })} */}
          {!collapsed && props.store.accountReducer.botMessages.map((message, i) => {
            if (message.messageText) {
              return <p key={i}><strong>Err #{message.count} {new Date(message.timeStamp).toLocaleString('en-US')}</strong> <br /> {message.messageText}</p>
            }
          })}
        </div>
        {/* ERRORS */}
        <div className="errors-section scrollable">
          <h3 className={`title ${props.theme}`}>{collapsed && props.errorCount} Errors</h3>
          {/* {!collapsed && props.errors.map((error, i) => {
            return <p key={i}><strong>Err #{props.errorCount - i} {error.date}</strong> <br /> {error.error}</p>
          })} */}
          {/* <p>{JSON.stringify(props.store.errorsReducer.botErrors)}</p> */}
          {!collapsed && props.store.errorsReducer.botErrors.map((error, i) => {
            return <p key={i}><strong>Err #{error.count} {new Date(error.timeStamp).toLocaleString('en-US')}</strong> <br /> {error.errorText}</p>
          })}
        </div>
      </div>
    </div>
  );
}

export default connect(mapStoreToProps)(Messages);