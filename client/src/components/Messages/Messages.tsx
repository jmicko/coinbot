import { useState } from 'react';
import { useUser } from '../../hooks/useUser';

import './Messages.css'
import Chat from './Chat';
import { Message } from '../../types';
import { useData } from '../../hooks/useData';
import { MessageSection } from './MessageSection';
import useWindowDimensions from '../../hooks/useWindowDimensions';
// import { devLog } from '../../shared';


function dateBuilder(d: string) {
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

function Messages() {
  // devLog('rendering messages');
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  const onMobile = width <= 800;
  const {
    messages: {
      botMessages,
      chatMessages
    },
    botErrors
  } = useData();

  const messageMap = [
    {
      header: 'General Messages',
      messages: botMessages
    },
    {
      header: 'Bot Errors',
      messages: botErrors
    },
    {
      header: 'Chat',
      messages: chatMessages
    }
  ]

  const up = "\u25B2 ".repeat(3);
  const down = "\u25BC ".repeat(3);

  return (
      <div className={`Messages boxed ${collapsed && 'collapsed'}`}>
        {!onMobile &&
          <h3
            className={`title ${user?.theme}`}
            onClick={() => { setCollapsed(!collapsed) }}
          >{collapsed ? up : down}</h3>}
        <div className="message-board">

          {messageMap.map((section, i) => {
            return (
              <MessageSection
                key={i}
                header={section.header}
                messages={section.messages}
                collapsed={collapsed}
              />
            )
          })}

        </div>
      </div>
  );
}

export default Messages;