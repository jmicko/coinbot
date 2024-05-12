import { useMemo, useState } from "react";
import useDateBuilder from "../../hooks/useDateBuilder";
import { Message } from "../../types";
import useDeleteFetch from "../../hooks/useDeleteFetch";
import { useData } from "../../hooks/useData";
import { useUser } from "../../hooks/useUser";

export const MessageItem = ({ message }: { message: Message }) => {
  const dateString = useDateBuilder(message.timestamp);
  const messageLines = message.text.split('\n');
  const [showDelete, setShowDelete] = useState(false);
  const [startX, setStartX] = useState(0);
  const [swipeThreshold] = useState(100); // Change this to adjust the swipe distance needed to show the delete button

  const { refreshBotMessages } = useData();
  const { user } = useUser();

  const deleteOptions = useMemo(() => ({
    url: `/api/account/messages/${message.id}`,
    refreshCallback: refreshBotMessages,
    from: 'deleteMessage in MessageItem',
  }), [message.id, refreshBotMessages]);
  const { deleteData: deleteMessage } = useDeleteFetch(deleteOptions);

  const handleDelete = () => {
    console.log(message, 'delete');
    deleteMessage();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    if (endX - startX > swipeThreshold) {
      setShowDelete(true);
    } else {
      setTimeout(() => {

        setShowDelete(false);
      }, 10);
    }
  };

  return (
    <div
      className={`message-item`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => { setShowDelete(true) }}
      onMouseLeave={() => { setShowDelete(false) }}
    >
      {showDelete && !message.deleted && user.id === message.user_id &&
        <button
          className="btn-red delete-btn"
          onClick={handleDelete}
        >Delete</button>}
      <strong className={user.id === message.user_id ? `red-text` : 'def-text'}>{message.from && message.from} </strong>
      <strong>{dateString}</strong>
      <strong className="red-text">{message.from && messageLines.length === 1 && ` >`} </strong>
      {/* {message.text} */}
      {message.deleted
        ? <span className="msg-line deleted">deleted</span>
        : messageLines.map((line, index) => {
          if (index === 0 && messageLines.length === 1) {
            return <span className="msg-line" key={index}>{line}</span>
          }
          return <div className="msg-line" key={index}>{line}</div>
        })}
    </div>
  );
};