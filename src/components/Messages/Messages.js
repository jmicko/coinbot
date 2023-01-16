import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '../../contexts/UserContext.js';
// import { useSocket } from '../../contexts/SocketProvider.js';
import './Messages.css'
import Chat from './Chat.js';
import { useData } from '../../contexts/DataContext.js';
import { no } from '../../shared.js';


function Messages() {
  console.log('rendering messages');
  const { user } = useUser();
  const { messages: { botMessages, chatMessages }, botErrors
    // , sendChat
  } = useData()
  const messageMap = [{ header: 'General Messages', messages: botMessages }, { header: 'Bot Errors', messages: botErrors }]

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

  // const ChatRef = useRef(<Chat />);
  //  useEffect(() => {
  //     ChatRef.current = Chat;
  //   }, [Chat]);


  const ChatMemo = memo(() => {
    return <Chat
      collapsed={collapsed}
      chatLength={chatMessages.length}
    />
  });
  // const ChatMemo = useMemo(() => <Chat {...props} />, [props])


  function MessageSection({ header, messages, sectionNum }) {


    return (
      (
        (header === 'Chat' && user.can_chat)
        || sectionNum !== 2)
      && <div className={`message-section message-window scrollable admin-${user.admin} ${sectionNum !== messageMap.length - 1 && 'not-last-message-section'}`}>
        {header === 'Chat'
          ? <></>
          // {/* {ChatRef.current()} */}

          // non-chat headers
          : <h3 className={`title ${user.theme}`}>
            {collapsed && messages.length} {header} {sectionNum} {sectionNum}
            {/* <button className='btn-red'><span className='gg-trash'></span></button> */}
          </h3>}

        {!collapsed && messages.map((message, i) => {
          // if (message.text) {
          return message.text && <p key={i}>
            <strong>Msg #{message.mCount} {dateBuilder(message.timeStamp)}</strong>
            <br />
            {/* {JSON.stringify(message)} */}
            {header === 'Chat' && `${message.from} > `}{message.text}
          </p>
          // }
        })}
      </div>
    )
  }

  return (
    // show messages on screen
    <div className={`Messages boxed ${collapsed && 'collapsed'} admin-${user.admin}`}>
      <h3 className={`title ${user.theme}`} onClick={() => { setCollapsed(!collapsed) }}>Coinbot Message Board {collapsed ? <>&#9650;</> : <>&#9660;</>}</h3>
      <div className="message-board">

        {messageMap.map((section, i) => {
          return (
            <MessageSection
              // return <messageRef.current
              key={i}
              sectionNum={i}
              header={section.header}
              messages={section.messages}
              mapLength={messageMap.length}
            />
          )
        })}

        {user.can_chat && <Chat
          collapsed={collapsed}
          chatLength={chatMessages.length}
          messages={chatMessages}
        />}

      </div>
    </div>
  );
}

export default Messages;