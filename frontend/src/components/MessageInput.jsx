import { useState, useRef } from 'react';
import './MessageInput.css';

const TYPING_TIMEOUT = 1500;

const MessageInput = ({ onSend, onSendFile, onTyping, onStopTyping }) => {
  const [text, setText] = useState('');
  const typingRef = useRef(null);
  const fileRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping();
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(onStopTyping, TYPING_TIMEOUT);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onStopTyping();
    clearTimeout(typingRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="message-input">
      <button className="attach-btn" onClick={() => fileRef.current?.click()} title="Attach file">📎</button>
      <input type="file" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.txt" />
      <input
        className="message-input-text"
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={2000}
      />
      <button className="send-btn" onClick={handleSend} disabled={!text.trim()}>Send</button>
    </div>
  );
};

export default MessageInput;
