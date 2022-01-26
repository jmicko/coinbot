import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import { useSocket } from "../../contexts/SocketProvider";
import './Messages.css'


function Messages(props) {
  const [collapsed, setCollapsed] = useState(false);

  function toggleCollapse() {
    setCollapsed(!collapsed);
  }

  return (
    // show messages on screen
    <div className="Messages boxed">
      <h3 className={`title ${props.theme}`} onClick={toggleCollapse}>Coinbot Message Board {collapsed ? <>&#9650;</> : <>&#9660;</>}</h3>
      <div className="message-board">
        {/* MESSAGES */}
        <div className="message-section scrollable">
          <h3 className={`title ${props.theme}`}>{collapsed && props.messagesCount} General Messages</h3>
          {!collapsed && props.messages.map((message, i) => {
            return <p key={i}><strong>Msg #{props.messagesCount - i} {message.date}</strong> <br /> {message.message}</p>
          })}
        </div>
        {/* ERRORS */}
        <div className="errors-section scrollable">
          <h3 className={`title ${props.theme}`}>{collapsed && props.errorCount} Errors</h3>
          {!collapsed && props.errors.map((error, i) => {
            return <p key={i}><strong>Err #{props.errorCount - i} {error.date}</strong> <br /> {error.error}</p>
          })}
        </div>
      </div>
    </div>
  );
}

export default connect(mapStoreToProps)(Messages);