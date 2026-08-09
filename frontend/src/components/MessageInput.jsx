import { useState, useRef } from 'react';
import './MessageInput.css';

const MAX_LENGTH = 500;
const TYPING_TIMEOUT_MS = 1500;

const MessageInput = ({ onSend, onTyping, onStopTyping, disabled }) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);

  const handleChange = (event) => {
    setText(event.target.value);

    onTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, TYPING_TIMEOUT_MS);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setText('');
    onStopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={MAX_LENGTH}
        disabled={disabled}
      />
      <button onClick={handleSend} disabled={disabled || !text.trim()}>
        Send
      </button>
    </div>
  );
};

export default MessageInput;
