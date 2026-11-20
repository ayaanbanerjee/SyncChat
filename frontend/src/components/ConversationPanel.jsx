import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMessages, sendMessage, sendFile, editMessage,
  deleteMessage, blockUser, unblockUser, getBlockedUsers,
  acceptRequest, declineRequest,
} from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import GroupInfoPanel from './GroupInfoPanel';
import Avatar from './Avatar';
import './ConversationPanel.css';

const PAGE_SIZE = 30;

const formatLastSeen = (date) => {
  if (!date) return 'Offline';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Last seen just now';
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

const ConversationPanel = ({ conversation, onConversationUpdate, onMobileBack, onRequestHandled }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeout = useRef({});

  const convId = conversation?._id;
  const myId = user._id?.toString();

  const otherMember = conversation?.type === 'direct'
    ? conversation.members?.find((m) => m._id?.toString() !== myId)
    : null;

  // Load blocked users list
  useEffect(() => {
    getBlockedUsers()
      .then((res) => setBlockedUsers(new Set(res.data.users.map((u) => u._id?.toString()))))
      .catch(() => {});
  }, []);

  const isOtherBlocked = otherMember ? blockedUsers.has(otherMember._id?.toString()) : false;

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

    const handlePresence = ({ userId: uid, isOnline, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(uid); else next.delete(uid);
        return next;
      });
      if (!isOnline && lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [uid]: lastSeen }));
      }
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

  const handleBlock = async () => {
    if (!otherMember) return;
    try {
      await blockUser(otherMember._id);
      setBlockedUsers((prev) => new Set([...prev, otherMember._id?.toString()]));
      toast.success(`${otherMember.name} blocked.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block user.');
    }
  };

  const handleUnblock = async () => {
    if (!otherMember) return;
    try {
      await unblockUser(otherMember._id);
      setBlockedUsers((prev) => {
        const next = new Set(prev);
        next.delete(otherMember._id?.toString());
        return next;
      });
      toast.success(`${otherMember.name} unblocked.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unblock user.');
    }
  };

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
    : otherMember?.name || 'Chat';

  const convAvatar = conversation.type === 'group'
    ? conversation.groupImage
    : otherMember?.avatar;

  const otherId = otherMember?._id?.toString();
  const isOtherOnline = otherId ? (otherMember?.isOnline || onlineUsers.has(otherId)) : false;
  const otherLastSeen = otherId ? (lastSeenMap[otherId] || otherMember?.lastSeen) : null;

  const isPending = conversation.status === 'pending';
  const initiatedById = conversation.initiatedBy?._id?.toString() || conversation.initiatedBy?.toString();
  const isInitiator = initiatedById === myId;
  const canSendMessage = !isOtherBlocked && !(isPending && !isInitiator);

  return (
    <div className="conv-panel">
      {/* Header */}
      <div className="conv-header">
        {onMobileBack && (
          <button className="icon-btn mobile-back-btn" onClick={onMobileBack} title="Back">←</button>
        )}
        <Avatar src={convAvatar} name={convName} size={38} />
        <div className="conv-header-info">
          <span className="conv-header-name">{convName}</span>
          {conversation.type === 'direct' && (
            <span className={`conv-header-status ${isOtherOnline ? 'online' : 'offline'}`}>
              {isOtherOnline ? 'Online' : formatLastSeen(otherLastSeen)}
            </span>
          )}
          {conversation.type === 'group' && (
            <span className="conv-header-status">
              {conversation.members?.length} members
            </span>
          )}
        </div>
        <div className="conv-header-actions">
          {conversation.type === 'direct' && otherMember && (
            <div className="conv-block-menu">
              {isOtherBlocked ? (
                <button className="icon-btn" onClick={handleUnblock} title="Unblock user">🔓</button>
              ) : (
                <button className="icon-btn" onClick={handleBlock} title="Block user">🚫</button>
              )}
            </div>
          )}
          {conversation.type === 'group' && (
            <button className="icon-btn" onClick={() => setShowGroupInfo((v) => !v)} title="Group Info">ℹ️</button>
          )}
        </div>
      </div>

      <div className="conv-body">
        {/* Pending request banner (recipient view) */}
        {isPending && !isInitiator && (
          <div className="conv-pending-banner">
            <span><strong>{otherMember?.name}</strong> wants to message you</span>
            <div className="conv-pending-actions">
              <button className="conv-accept-btn" onClick={async () => {
                try {
                  const res = await acceptRequest(conversation._id);
                  toast.success('Request accepted.');
                  if (onRequestHandled) onRequestHandled('accepted', res.data.conversation);
                  if (onConversationUpdate) onConversationUpdate(res.data.conversation);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to accept.');
                }
              }}>Accept</button>
              <button className="conv-decline-btn" onClick={async () => {
                try {
                  await declineRequest(conversation._id);
                  toast.success('Request declined.');
                  if (onRequestHandled) onRequestHandled('declined', conversation);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to decline.');
                }
              }}>Decline</button>
            </div>
          </div>
        )}

        {/* Blocked banner */}
        {isOtherBlocked && (
          <div className="conv-blocked-banner">
            You have blocked {otherMember?.name}.{' '}
            <button onClick={handleUnblock}>Unblock</button>
          </div>
        )}

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
              isOwn={msg.sender?._id?.toString() === myId || msg.sender?.toString() === myId}
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

        {canSendMessage && !user.isGuest && (
          <MessageInput
            onSend={handleSend}
            onSendFile={handleSendFile}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
          />
        )}

        {user.isGuest && (
          <div className="conv-guest-input">
            <span>👀 Demo mode — <a href="/signup">Register</a> to send messages</span>
          </div>
        )}
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
