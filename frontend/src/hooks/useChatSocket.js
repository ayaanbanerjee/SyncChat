import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../services/socket';
import { fetchMessages } from '../services/api';

const TYPING_TIMEOUT_MS = 1500;
const ROOM_ID = 'global';

const useChatSocket = (username) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsernames, setOnlineUsernames] = useState([]);
  const [typingUsername, setTypingUsername] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const typingTimeoutRef = useRef(null);
  const requestedReadIdsRef = useRef(new Set());

  useEffect(() => {
    if (!username) {
      return undefined;
    }

    let isMounted = true;

    const loadHistory = async () => {
      try {
        const data = await fetchMessages();
        if (isMounted && data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage('Could not load chat history. Please refresh.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    socket.connect();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('user:join', { username, roomId: ROOM_ID });
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = () => setErrorMessage('Unable to connect to the chat server.');

    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleUsersUpdate = ({ onlineCount: count, onlineUsernames: usernames }) => {
      setOnlineCount(count);
      if (Array.isArray(usernames)) {
        setOnlineUsernames(usernames);
      }
    };

    const handleUserTyping = ({ username: typer, roomId }) => {
      if (typer !== username && roomId === ROOM_ID) {
        setTypingUsername(typer);
      }
    };

    const handleUserStoppedTyping = () => {
      setTypingUsername(null);
    };

    const handleMessageDelivered = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((message) =>
          (message._id || message.id) === messageId && message.status === 'sent'
            ? { ...message, status }
            : message
        )
      );
    };

    const handleMessageStatusUpdated = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((message) =>
          (message._id || message.id) === messageId ? { ...message, status } : message
        )
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('newMessage', handleNewMessage);
    socket.on('users:update', handleUsersUpdate);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:statusUpdated', handleMessageStatusUpdated);

    return () => {
      isMounted = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('newMessage', handleNewMessage);
      socket.off('users:update', handleUsersUpdate);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:statusUpdated', handleMessageStatusUpdated);
      socket.disconnect();
      requestedReadIdsRef.current.clear();
    };
  }, [username]);

  // Mark other users' unread messages as read once they've been loaded/received
  useEffect(() => {
    if (!isConnected || messages.length === 0) {
      return;
    }

    const unreadIds = messages
      .filter(
        (message) =>
          message.username !== username &&
          message.status !== 'read' &&
          !requestedReadIdsRef.current.has(message._id || message.id)
      )
      .map((message) => message._id || message.id);

    if (unreadIds.length === 0) {
      return;
    }

    unreadIds.forEach((id) => requestedReadIdsRef.current.add(id));
    socket.emit('message:read', { messageIds: unreadIds, username });
  }, [messages, isConnected, username]);

  const sendTyping = useCallback(() => {
    socket.emit('typing', { username, roomId: ROOM_ID });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { username, roomId: ROOM_ID });
    }, TYPING_TIMEOUT_MS);
  }, [username]);

  const sendStopTyping = useCallback(() => {
    socket.emit('stopTyping', { username, roomId: ROOM_ID });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [username]);

  return {
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
  };
};

export default useChatSocket;
