import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMessages, sendMessage, sendFile, editMessage,
  deleteMessage,
} from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import GroupInfoPanel from './GroupInfoPanel';
import Avatar from './Avatar';
import './ConversationPanel.css';

const PAGE_SIZE = 30;

const ConversationPanel = ({ conversation, onConversationUpdate }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeout = useRef({});

  const convId = conversation?._id;

  // Load initial messages when conversation changes
  useEffect(() => {
    if (!convId) { setMessages([]); return; }
    setLoadingInit(true);
    setMessages([]);
    setHasMore(false);
    getMessages(convId)
      .then((res) => {
        setMessages(res.data.messages);
        setHasMore(res.data.hasMore);
        // Mark as read
        socket.emit('message:read', { conversationId: convId });
      })
      .catch(() => toast.error('Failed to load messages.'))
      .finally(() => setLoadingInit(false));
  }, [convId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loadingInit) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loadingInit, convId]);

  // Socket listeners
  useEffect(() => {
    if (!convId) return;

    const handleNewMessage = (msg) => {
      const msgConvId = msg.conversationId?._id || msg.conversationId;
      if (msgConvId !== convId) return;
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      socket.emit('message:read', { conversationId: convId });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleEdited = (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, text: '' } : m))
      );
    };

    const handleTypingStart = ({ userId: uid, username, conversationId: cid }) => {
      if (cid !== convId || uid === user._id) return;
      setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
      clearTimeout(typingTimeout.current[uid]);
      typingTimeout.current[uid] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== username));
      }, 3000);
    };

    const handleTypingStop = ({ userId: uid, conversationId: cid }) => {
      if (cid !== convId) return;
      clearTimeout(typingTimeout.current[uid]);
      const member = conversation?.members?.find((m) => m._id === uid);
      if (member) setTypingUsers((prev) => prev.filter((u) => u !== member.username));
    };

    const handlePresence = ({ userId: uid, isOnline }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(uid); else next.delete(uid);
        return next;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:edited', handleEdited);
    socket.on('message:deleted', handleDeleted);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('presence:update', handlePresence);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edited', handleEdited);
      socket.off('message:deleted', handleDeleted);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('presence:update', handlePresence);
    };
  }, [convId, user._id, conversation]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const cursor = messages[0].createdAt;
    const prevScrollHeight = listRef.current?.scrollHeight;
    try {
      const res = await getMessages(convId, cursor);
      setMessages((prev) => [...res.data.messages, ...prev]);
      setHasMore(res.data.hasMore);
      // Maintain scroll position after prepending
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight - prevScrollHeight;
        }
      });
    } catch {
      toast.error('Failed to load more messages.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    if (listRef.current?.scrollTop === 0) loadMore();
  };

  const handleSend = useCallback(async (text) => {
    try {
      await sendMessage(convId, { text, replyTo: replyTo?._id });
      setReplyTo(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    }
  }, [convId, replyTo]);

  const handleSendFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await sendFile(convId, formData);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload file.');
    }
  }, [convId]);

  const handleEdit = useCallback(async (messageId, newText) => {
    try {
      await editMessage(messageId, newText);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit message.');
    }
  }, []);

  const handleDelete = useCallback(async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete message.');
    }
  }, []);

  const handleTyping = useCallback(() => {
    socket.emit('typing:start', { conversationId: convId });
  }, [convId]);

  const handleStopTyping = useCallback(() => {
    socket.emit('typing:stop', { conversationId: convId });
  }, [convId]);

  if (!conversation) {
    return (
      <div className="conv-panel conv-panel-empty">
        <div className="conv-empty-state">
          <span className="conv-empty-icon">💬</span>
          <p>Select a conversation or search for a user to start chatting.</p>
        </div>
      </div>
    );
  }

  const convName = conversation.type === 'group'
    ? conversation.name
    : conversation.members?.find((m) => m._id !== user._id)?.name || 'Chat';

  const convAvatar = conversation.type === 'group'
    ? conversation.groupImage
    : conversation.members?.find((m) => m._id !== user._id)?.avatar;

  const otherMember = conversation.type === 'direct'
    ? conversation.members?.find((m) => m._id !== user._id)
    : null;

  const isOtherOnline = otherMember ? onlineUsers.has(otherMember._id) : false;

  return (
    <div className="conv-panel">
      {/* Header */}
      <div className="conv-header">
        <Avatar src={convAvatar} name={convName} size={38} />
        <div className="conv-header-info">
          <span className="conv-header-name">{convName}</span>
          {conversation.type === 'direct' && (
            <span className={`conv-header-status ${isOtherOnline ? 'online' : 'offline'}`}>
              {isOtherOnline ? 'Online' : otherMember?.lastSeen
                ? `Last seen ${new Date(otherMember.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Offline'}
            </span>
          )}
          {conversation.type === 'group' && (
            <span className="conv-header-status">
              {conversation.members?.length} members
            </span>
          )}
        </div>
        {conversation.type === 'group' && (
          <button className="icon-btn" onClick={() => setShowGroupInfo((v) => !v)} title="Group Info">ℹ️</button>
        )}
      </div>

      <div className="conv-body">
        {/* Message list */}
        <div className="conv-messages" ref={listRef} onScroll={handleScroll}>
          {loadingMore && <div className="conv-loading-more">Loading...</div>}
          {hasMore && !loadingMore && (
            <button className="load-more-btn" onClick={loadMore}>Load older messages</button>
          )}
          {loadingInit && <div className="conv-loading">Loading messages...</div>}
          {!loadingInit && messages.length === 0 && (
            <div className="conv-no-messages">No messages yet. Say hello! 👋</div>
          )}
          {messages.map((msg) => (
            <MessageItem
              key={msg._id}
              message={msg}
              isOwn={msg.sender?._id === user._id || msg.sender === user._id}
              onReply={() => setReplyTo(msg)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div className="reply-preview">
            <span>Replying to <strong>{replyTo.sender?.name}</strong>: {replyTo.text}</span>
            <button onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}

        <MessageInput
          onSend={handleSend}
          onSendFile={handleSendFile}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
        />
      </div>

      {showGroupInfo && (
        <GroupInfoPanel
          conversation={conversation}
          onUpdate={onConversationUpdate}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </div>
  );
};

export default ConversationPanel;
