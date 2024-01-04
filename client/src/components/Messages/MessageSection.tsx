import { useEffect, useRef, useState } from "react";
import { useData } from "../../hooks/useData";
import { useUser } from "../../hooks/useUser";
import { devLog } from "../../shared";
import { EventType, Message } from "../../types";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { MessageItem } from "./SingleMessage";



interface MessageSectionProps {
  header: string;
  collapsed: boolean;
  messages: Message[];
  mobileCollapsed?: string;
  setMobileCollapsed?: (collapsed: string) => void;
}

export function MessageSection({
  header,
  collapsed,
  messages,
  mobileCollapsed,
  setMobileCollapsed
}: MessageSectionProps) {
  const { user } = useUser();
  const { sendChat, } = useData();
  const { width } = useWindowDimensions();
  const onMobile = width <= 800;
  // devLog('rendering chat form');
  const [newMessage, setNewMessage] = useState('');
  // const [initialRender, setInitialRender] = useState(true);
  const initialRender = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedInput, setExpandedInput] = useState(false);

  const sendChatMessage = (e: EventType) => {
    e.preventDefault();
    setTimeout(() => {

    }, 500);
    devLog(newMessage, 'sending chat!!');
    newMessage && sendChat({ type: 'chat', data: newMessage });
    setNewMessage('');
  }



  useEffect(() => {
    if (messagesEndRef.current && mobileCollapsed !== header) {
      // console.log('scrolling to bottom', mobileCollapsed);

      messagesEndRef.current.scrollIntoView({ behavior: initialRender.current ? "instant" : "smooth" });
    } else {
      // console.log('not scrolling to bottom', mobileCollapsed);
    }

    if (initialRender.current) {
      // console.log(initialRender.current, 'initial render');

      initialRender.current = false;
    }
  }, [messages, initialRender, mobileCollapsed]);


  return (
    (user.can_chat || header !== 'Chat') &&
    <div className={`message-section ${(collapsed && !onMobile) || (mobileCollapsed !== header && mobileCollapsed !== '' && onMobile)
      ? 'collapsed'
      : 'expanded'} ` + header.split(' ').join('-').toLowerCase()}>


      <h3 className={
        `${(collapsed && !onMobile)
          || (mobileCollapsed !== header && mobileCollapsed !== '' && onMobile)
          ? 'collapsed'
          : 'expanded'} title message-header ${user.theme}`
      }
        onClick={() => {
          if (onMobile) {
            if (mobileCollapsed === header) {
              setMobileCollapsed && setMobileCollapsed('');
            } else {
              console.log('setting mobile collapsed to ', header);
              setMobileCollapsed && setMobileCollapsed(header)
            }
          }
        }}
      >
        {(collapsed && !onMobile) && messages.length} {header}
      </h3>

      {<div className={`message-list scrollable ${(collapsed && !onMobile) ? 'collapsed' : 'expanded'}`}>
        <div ref={messagesEndRef} />
        {
          messages.slice(0, 100).filter(message => message.text).map((message) => {

            // message.text &&
            return <MessageItem key={message.id} message={message} />
          })
        }
        <div className="spacer" />
      </div>}

      {header === 'Chat' &&
        //  (onMobile || !collapsed) &&
        <form className={`chat-form ${(collapsed && !onMobile) ? 'collapsed' : 'expanded'}`}
          onSubmit={((e) => { e.preventDefault(); sendChatMessage(e) })}
        >
          <button
            className={`chat-expand btn-nav ${expandedInput && 'expanded'}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('chat-input')?.focus();
              setExpandedInput(!expandedInput);
            }}
          >{expandedInput ? "\u25BC" : "\u25B2"}</button>
          <textarea
            className={'chat-input scrollable' + (expandedInput ? ' expanded' : '')}
            id='chat-input'
            // type="text"
            value={newMessage}
            placeholder='Send to everyone'
            onChange={(e) => { e.preventDefault(); setNewMessage(e.target.value) }}

            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !expandedInput) {
                e.preventDefault();
                sendChatMessage(e);
              }
              if (e.key === 'Enter' && expandedInput) {
                e.preventDefault();
                setNewMessage(newMessage + '\n');
              }
            }}

            // prevent autofill from showing
            // why would I have made a note about something so blatantly obvious?
            autoComplete="off"
          />
          <input
            className='chat-submit btn-nav'
            type="submit"
            value=" > "
            onClick={(e) => {
              e.preventDefault();
              sendChatMessage(e);
              // put the focus back on the input
              document.getElementById('chat-input')?.focus();
            }}
          />
        </form>}


    </div>
  )
}