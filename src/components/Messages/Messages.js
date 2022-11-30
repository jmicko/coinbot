import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../../contexts/SocketProvider';
import './Messages.css'


function Messages() {
  const dispatch = useDispatch();
  const socket = useSocket();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const botMessages = useSelector((store) => store.accountReducer.botMessages);
  const botErrors = useSelector((store) => store.errorsReducer.botErrors);
  const chatMessages = useSelector((store) => store.accountReducer.chatMessages);
  const [collapsed, setCollapsed] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  function toggleCollapse() {
    setCollapsed(!collapsed);
  }

  useEffect(() => {
    dispatch({ type: 'FETCH_BOT_ERRORS' });
    dispatch({ type: 'FETCH_BOT_MESSAGES' });
  }, [])


  function sendChat(event) {
    event.preventDefault();
    socket.socket.sendChat(newMessage);
    console.log(newMessage, 'chat sent!');
    setNewMessage('')
  }


  return (
    // show messages on screen
    <div className={`Messages boxed admin-${user.admin}`}>
      <h3 className={`title ${user.theme}`} onClick={toggleCollapse}>Coinbot Message Board {collapsed ? <>&#9650;</> : <>&#9660;</>}</h3>
      <div className="message-board">

        {/* MESSAGES */}
        <div className={`message-section scrollable admin-${user.admin}`}>
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
        <div className={`errors-section scrollable admin-${user.admin}`}>
          <h3 className={`title ${user.theme}`}>{collapsed && botErrors.length} Errors</h3>
          {!collapsed && botErrors.map((error, i) => {
            return <p key={i}><strong>Err #{error.count} {new Date(error.timeStamp).toLocaleString('en-US')}</strong> <br /> {error.errorText}</p>
          })}
        </div>

        {/* CHAT */}
        {user.admin &&
          <div  className={`chat-section admin-${user.admin}`}>
            <h3 className={`title chat-header ${user.theme}`}>{collapsed && chatMessages.length} Chat:
              <form className={`chat-form`} onSubmit={sendChat}>
                <input
                  className='chat-input'
                  type="text"
                  value={newMessage}
                  placeholder='Send to everyone'
                  onChange={(event) => setNewMessage(event.target.value)}
                />
              </form>
            </h3>
            <div className={`scrollable chat-log admin-${user.admin}`}>
              {!collapsed && chatMessages.map((chat, i) => {
                return <p key={i}><strong>Err #{chat.count} {new Date(chat.timeStamp).toLocaleString('en-US')}</strong> <br /> {chat.messageText}</p>
              })}
            </div>
          </div>

          // </div>
        }


      </div>
    </div>
  );
}

export default Messages;