import { useEffect, useRef, useState } from "react";
import { useData } from "../../hooks/useData";
import { useUser } from "../../hooks/useUser";
import { devLog } from "../../shared";
import { EventType, Message } from "../../types";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import useDateBuilder from "../../hooks/useDateBuilder";

const MessageItem = ({ message }: { message: Message }) => {
  const dateString = useDateBuilder(message.timestamp);
  const messageLines = message.text.split('\n');

  return (
    <div className={`message-item`}>
      <strong className="red-text">{message.from && message.from} </strong>
      <strong>{dateString}</strong>
      <strong className="red-text">{message.from && messageLines.length === 1 && ` >`} </strong>
      {/* {message.text} */}
      {messageLines.map((line, index) => {
        if (index === 0 && messageLines.length === 1) {
          return <span className="msg-line" key={index}>{line}</span>
        }
        return <div className="msg-line" key={index}>{line}</div>
      })}
    </div>
  );
};

interface MessageSectionProps {
  header: string;
  collapsed: boolean;
  messages: Message[];
}

export function MessageSection({ header, collapsed, messages }: MessageSectionProps) {
  const { user } = useUser();
  const { sendChat, } = useData();
  const { width } = useWindowDimensions();
  const onMobile = width <= 800;
  // devLog('rendering chat form');
  const [newMessage, setNewMessage] = useState('');
  const [initialRender, setInitialRender] = useState(true);
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: initialRender ? "instant" : "smooth" });
    }

    if (initialRender) {
      setInitialRender(true);
    }
  }, [messages]);

  return (
    (user.can_chat || header !== 'Chat') &&
    <div className={`message-section ` + header.split(' ').join('-').toLowerCase()}>


      <h3 className={`title message-header ${user.theme}`}>
        {(collapsed && !onMobile) && messages.length} {header}
      </h3>

      {(!collapsed || onMobile) && <div className={`message-list scrollable`}>
        {
          messages.slice(0).reverse().slice(0, 100).filter(message => message.text).map((message, i) => {

            return message.text &&
              <MessageItem key={i} message={message} />
          })
        }
        <div ref={messagesEndRef} />
      </div>}

      {header === 'Chat' && (onMobile || !collapsed) &&
        <form className={`chat-form`}
          onSubmit={((e) => { e.preventDefault(); sendChatMessage(e) })}
        >
          <button
            className={`chat-expand btn-nav ${expandedInput && 'expanded'}`}
            onClick={(e) => { e.preventDefault(); setExpandedInput(!expandedInput) }}
          >{expandedInput ? "\u25BC" : "\u25B2"}</button>
          <textarea
            className={'chat-input scrollable' + (expandedInput ? ' expanded' : '')}
            id='chat-input'
            // type="text"
            value={newMessage}
            placeholder='Send to everyone'
            onChange={(e) => {
              e.preventDefault(); setNewMessage(e.target.value), console.log(newMessage);
            }}

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
            value=" > " />
        </form>}


    </div>
  )
}