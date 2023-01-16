import { memo, useCallback, useState } from "react";
import { useData } from "../../contexts/DataContext.js";
import { useUser } from "../../contexts/UserContext.js";




function Chat({ chatLength, collapsed, messages }) {
  // const { sendChat } = useSocket();
  const { user } = useUser();
  const { sendChat, } = useData()
  console.log('rendering chat form');
  const [newMessage, setNewMessage] = useState('');

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

  const sendChatMessage = (e) => {
    e.preventDefault();
    setTimeout(() => {
      // document.querySelector('#chat-input').focus();
      // stop focus from leaving input with the id 'chat-input'
    }, 500);
    console.log(newMessage, 'sending chat!!');
    sendChat({ type: 'chat', data: newMessage });
    setNewMessage('');
  }

  return (
    <div className={`message-section 
    message-window 
    scrollable 
    admin-${user.admin}`}>

      <h3 className={`title chat-header ${user.theme}`}>
        {collapsed && chatLength} Chat:
        <form className={`chat-form`}
          onSubmit={((e) => { e.preventDefault(); sendChatMessage(e) })}>
          <input
            className='chat-input'
            id='chat-input'
            type="text"
            value={newMessage}
            placeholder='Send to everyone'
            onChange={(e) => { e.preventDefault(); setNewMessage(e.target.value) }}
          />
        </form>
      </h3>
      {
        !collapsed && messages.map((message, i) => {
          // if (message.text) {
          return message.text && <p key={i}>
            <strong>Msg #{message.mCount} {dateBuilder(message.timeStamp)}</strong>
            <br />
            {/* {JSON.stringify(message)} */}
            {`${message.from} > `}{message.text}
          </p>
          // }
        })
      }
    </div>
  )
}


export default Chat;