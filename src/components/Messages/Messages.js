import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Messages.css'


function Messages() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const botMessages = useSelector((store) => store.accountReducer.botMessages);
  const botErrors = useSelector((store) => store.errorsReducer.botErrors);
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
      <h3 className={`title ${user.theme}`} onClick={toggleCollapse}>Coinbot Message Board {collapsed ? <>&#9650;</> : <>&#9660;</>}</h3>
      <div className="message-board">
        {/* MESSAGES */}
        <div className="message-section scrollable">
          <h3 className={`title ${user.theme}`}>
            {collapsed && botMessages.length} General Messages 
            {/* <button className='btn-red'><span className='gg-trash'></span></button> */}
          </h3>
          {!collapsed && botMessages.map((message, i) => {
            if (message.messageText) {
              return <p key={i}><strong>Msg #{message.count} {new Date(message.timeStamp).toLocaleString('en-US')}</strong> <br /> {message.messageText}</p>
            }
          })}
        </div>
        {/* ERRORS */}
        <div className="errors-section scrollable">
          <h3 className={`title ${user.theme}`}>{collapsed && botErrors.length} Errors</h3>
          {!collapsed && botErrors.map((error, i) => {
            return <p key={i}><strong>Err #{error.count} {new Date(error.timeStamp).toLocaleString('en-US')}</strong> <br /> {error.errorText}</p>
          })}
        </div>
      </div>
    </div>
  );
}

export default Messages;