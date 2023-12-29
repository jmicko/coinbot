import { useState } from "react";
import { devLog } from "../../shared.js";
import { EventType, Message } from "../../types/index.js";
import { useData } from "../../hooks/useData.js";
import { useUser } from "../../hooks/useUser.js";


interface ChatProps {
  chatLength: number;
  collapsed: boolean;
  messages: Message[];
}

function Chat({ chatLength, collapsed, messages }: ChatProps) {
  const { user } = useUser();
  const { sendChat, } = useData();
  // devLog('rendering chat form');
  const [newMessage, setNewMessage] = useState('');

  function dateBuilder(d: string) {

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

  const sendChatMessage = (e: EventType) => {
    e.preventDefault();
    setTimeout(() => {

    }, 500);
    devLog(newMessage, 'sending chat!!');
    sendChat({ type: 'chat', data: newMessage });
    setNewMessage('');
  }

  return (
    <div className={`
    message-section 


     
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
            // prevent autofill from showing
            autoComplete="off"
          />
        </form>
      </h3>
      <div
        className="message-window scrollable chat-section"
      >
        {
          !collapsed && messages.map((message, i) => {
            // if (message.text) {
            return message.text && <div key={i} className={`message-list`}>
              <strong>{dateBuilder(message.timestamp)}</strong>&nbsp;
              {/* <br /> */}
              {/* {JSON.stringify(message)} */}
              {/* <p> */}
              <strong className="red-text">{`${message.from} > `}</strong>{message.text}
              {/* </p> */}
            </div>
            // }
          })
        }

      </div>
    </div>
  )
}


export default Chat;