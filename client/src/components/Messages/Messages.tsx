import { useState } from 'react';
import { useUser } from '../../hooks/useUser';

import './Messages.css'
import { useData } from '../../hooks/useData';
import { MessageSection } from './MessageSection';
import useWindowDimensions from '../../hooks/useWindowDimensions';
// import { devLog } from '../../shared';

function Messages() {
  // devLog('rendering messages');
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState('');
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
    },
    // {
    //   header: 'Fake',
    //   messages: chatMessages
    // },
    // {
    //   header: 'Faker',
    //   messages: chatMessages
    // }
  ]

  const up = "\u25B2 ".repeat(3);
  const down = "\u25BC ".repeat(3);

  return (
      <div className={`Messages boxed ${collapsed && 'collapsed'}`}>
        {!onMobile &&
          <h3
            className={`title collapser ${user?.theme}`}
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
                mobileCollapsed={mobileCollapsed}
                setMobileCollapsed={setMobileCollapsed}
              />
            )
          })}

        </div>
      </div>
  );
}

export default Messages;