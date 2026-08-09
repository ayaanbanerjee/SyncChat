import MessageStatus from './MessageStatus';
import './MessageItem.css';

const formatTimestamp = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageItem = ({ message, isOwnMessage, isSenderOnline }) => {
  return (
    <div className={`message-item ${isOwnMessage ? 'own-message' : ''}`}>
      <div className="message-header">
        <span className="message-username">
          {message.username}
          {isSenderOnline && <span className="active-dot" title="Active now" />}
        </span>
        <span className="message-time">{formatTimestamp(message.createdAt)}</span>
      </div>
      <div className="message-text">{message.text}</div>
      {isOwnMessage && (
        <div className="message-footer">
          <MessageStatus status={message.status || 'sent'} />
        </div>
      )}
    </div>
  );
};

export default MessageItem;
