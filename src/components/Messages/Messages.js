import React, { useCallback, useState } from 'react';
import { useUser } from '../../contexts/UserContext.js';
import { useSocket } from '../../contexts/SocketProvider.js';
import './Messages.css'
import { useData } from '../../contexts/DataContext.js';
import { no } from '../../shared.js';


function Messages() {
  console.log('rendering messages');
  const { user } = useUser();
  // const { socket } = useSocket();
  const { messages: { botMessages, chatMessages }, botErrors
    // , sendChat
  } = useData()

  const [collapsed, setCollapsed] = useState(false);

  function dateBuilder(d) {
    // new Date(message.timeStamp).toLocaleString('en-US')
    const date = new Date(d);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    // if message was sent today, don't show date. only show time
    if (new Date().toLocaleDateString() === new Date(d).toLocaleDateString()) {
      return `${hours}:${minutes}:${seconds}`
    } else {
      return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}${new Date().toLocaleDateString()}`
    }
  }

  function ChatForm() {
    const { sendChat } = useSocket();
    console.log('rendering chat form');
    const [newMessage, setNewMessage] = useState('');

    const sendChatMessage = useCallback((event) => {
      event.preventDefault();
      console.log(newMessage, 'sending chat!!');
      // sendChat({ type: 'chat', data: newMessage });
      sendChat(newMessage);
      // setNewMessage('')
    }, [newMessage]);

    return (
      <form className={`chat-form`} onSubmit={sendChatMessage}>
        <input
          className='chat-input'
          type="text"
          value={newMessage}
          placeholder='Send to everyone'
          onChange={(e) => { no(e); setNewMessage(e.target.value) }}
        />
      </form>
    )
  }

  function MessageSection({ header, messages, sectionNum }) {

    return (
      (((header === 'Chat')
        && user.admin)
        || sectionNum !== 2)
      && <div className={`message-section message-window scrollable admin-${user.admin}`}>
        {header === 'Chat'
          ? <h3 className={`title chat-header ${user.theme}`}>{collapsed && chatMessages.length} Chat:
            <ChatForm />
          </h3>
          // non-chat headers
          : <h3 className={`title ${user.theme}`}>
            {collapsed && messages.length} {header} {sectionNum} {sectionNum}
            {/* <button className='btn-red'><span className='gg-trash'></span></button> */}
          </h3>}

        {!collapsed && messages.map((message, i) => {
          // if (message.text) {
          return message.text && <p key={i}><strong>Msg #{message.mCount} {dateBuilder(message.timeStamp)}</strong> <br /> {message.text}</p>
          // }
        })}
      </div>
    )
  }

  const messageMap = [{ header: 'General Messages', messages: botMessages }, { header: 'Bot Errors', messages: botErrors }, { header: 'Chat', messages: chatMessages }]

  return (
    // show messages on screen
    <div className={`Messages boxed admin-${user.admin}`}>
      <h3 className={`title ${user.theme}`} onClick={() => { setCollapsed(!collapsed) }}>Coinbot Message Board {collapsed ? <>&#9650;</> : <>&#9660;</>}</h3>
      <div className="message-board">

        {messageMap.map((section, i) => {
          return <MessageSection
            // return <messageRef.current
            key={i}
            sectionNum={i}
            header={section.header}
            messages={section.messages}
            mapLength={messageMap.length}
          />
        })}

      </div>
    </div>
  );
}

export default Messages;