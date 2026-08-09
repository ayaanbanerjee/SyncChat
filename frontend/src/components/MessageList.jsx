import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import './MessageList.css';

const MessageList = ({ messages, currentUsername, onlineUsernames = [] }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem
          key={message._id || message.id}
          message={message}
          isOwnMessage={message.username === currentUsername}
          isSenderOnline={onlineUsernames.includes(message.username)}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
