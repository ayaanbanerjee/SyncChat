import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import OnlineStatus from '../components/OnlineStatus';
import useChatSocket from '../hooks/useChatSocket';
import { sendMessage } from '../services/api';
import socket from '../services/socket';
import './Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('chatUsername');
    if (!storedUsername) {
      navigate('/');
      return;
    }
    setUsername(storedUsername);
  }, [navigate]);

  const {
    messages,
    isConnected,
    onlineCount,
    onlineUsernames,
    typingUsername,
    errorMessage,
    setErrorMessage,
    loading,
    sendTyping,
    sendStopTyping,
  } = useChatSocket(username);

  const handleSend = useCallback(
    async (text) => {
      try {
        setErrorMessage('');
        const result = await sendMessage(username, text);
        if (!result.success) {
          setErrorMessage(result.message || 'Failed to send message.');
        }
      } catch (error) {
        setErrorMessage('Failed to send message. Please try again.');
      }
    },
    [username, setErrorMessage]
  );

  const handleLogout = () => {
    localStorage.removeItem('chatUsername');
    socket.disconnect();
    navigate('/');
  };

  if (!username) {
    return null;
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div>
          <h2>SyncChat</h2>
          <OnlineStatus isConnected={isConnected} onlineCount={onlineCount} />
        </div>
        <div className="chat-header-right">
          <span className="chat-username">Hi, {username}</span>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {errorMessage && <div className="chat-error">{errorMessage}</div>}

      {loading ? (
        <div className="chat-loading">Loading messages...</div>
      ) : (
        <MessageList
          messages={messages}
          currentUsername={username}
          onlineUsernames={onlineUsernames}
        />
      )}

      <TypingIndicator username={typingUsername} />

      <MessageInput
        onSend={handleSend}
        onTyping={sendTyping}
        onStopTyping={sendStopTyping}
        disabled={!isConnected}
      />
    </div>
  );
};

export default Chat;
