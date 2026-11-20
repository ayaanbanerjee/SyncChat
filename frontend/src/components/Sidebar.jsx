import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getConversations, startDirect, searchUsers, getMessageRequests,
} from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import NewGroupModal from './NewGroupModal';
import ProfileModal from './ProfileModal';
import NotificationBell from './NotificationBell';
import MessageRequests from './MessageRequests';
import BrandLogo from './BrandLogo';
import './Sidebar.css';

const Sidebar = ({ activeConversationId, onSelect, conversations, setConversations, onMobileClose }) => {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  const searchTimeout = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    getConversations()
      .then((res) => setConversations(res.data.conversations))
      .catch(() => toast.error('Failed to load conversations.'));
  }, [setConversations]);

  // Load pending request count
  useEffect(() => {
    getMessageRequests()
      .then((res) => setRequestCount(res.data.requests.length))
      .catch(() => {});
  }, []);

  // Socket listeners
  useEffect(() => {
    const handleNewMessage = (message) => {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === message.conversationId?.toString() || c._id === message.conversationId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c
        );
        return [...updated].sort((a, b) =>
          new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt)
        );
      });
    };

    const handlePresence = ({ userId, isOnline, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
      if (!isOnline && lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));
      }
    };

    const handleConversationCreated = (conv) => {
      const initiatedById = conv.initiatedBy?._id?.toString() || conv.initiatedBy?.toString();
      // If it's a pending request directed at me, increment badge only
      if (conv.status === 'pending' && initiatedById !== myId) {
        setRequestCount((c) => c + 1);
        return; // Don't add to main list
      }
      setConversations((prev) => {
        if (prev.find((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('presence:update', handlePresence);
    socket.on('conversation:created', handleConversationCreated);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('presence:update', handlePresence);
      socket.off('conversation:created', handleConversationCreated);
    };
  }, [setConversations, user._id]);

  // Debounced user search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers(search);
        setSearchResults(res.data.users);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  const handleStartDirect = async (targetUser) => {
    try {
      const res = await startDirect(targetUser._id);
      const conv = res.data.conversation;
      setConversations((prev) => {
        if (prev.find((c) => c._id === conv._id)) return prev;
        // Only add to sidebar if active (not pending for the other side)
        return [conv, ...prev];
      });
      socket.emit('conversation:join', { conversationId: conv._id });
      onSelect(conv);
      setSearch('');
      setSearchResults([]);
      if (onMobileClose) onMobileClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start conversation.');
    }
  };

  const handleGroupCreated = (conv) => {
    setConversations((prev) => [conv, ...prev]);
    socket.emit('conversation:join', { conversationId: conv._id });
    onSelect(conv);
    setShowGroupModal(false);
    if (onMobileClose) onMobileClose();
  };

  const handleRequestAccepted = (conv) => {
    setRequestCount((c) => Math.max(0, c - 1));
    setConversations((prev) => {
      if (prev.find((c) => c._id === conv._id)) return prev;
      return [conv, ...prev];
    });
    socket.emit('conversation:join', { conversationId: conv._id });
    onSelect(conv);
    setShowRequests(false);
    if (onMobileClose) onMobileClose();
  };

  const handleConvSelect = (conv) => {
    onSelect(conv);
    if (onMobileClose) onMobileClose();
  };

  const myId = user._id?.toString();

  const getConvName = (conv) => {
    if (conv.type === 'group') return conv.name;
    const other = conv.members?.find((m) => m._id?.toString() !== myId);
    return other?.name || 'Unknown';
  };

  const getConvAvatar = (conv) => {
    if (conv.type === 'group') return conv.groupImage || '';
    const other = conv.members?.find((m) => m._id?.toString() !== myId);
    return other?.avatar || '';
  };

  const getOtherMember = (conv) => {
    if (conv.type !== 'direct') return null;
    return conv.members?.find((m) => m._id?.toString() !== myId);
  };

  const getLastMessagePreview = (conv) => {
    if (!conv.lastMessage) return 'No messages yet';
    if (conv.lastMessage.isDeleted) return 'Message deleted';
    if (conv.lastMessage.type === 'image') return '📷 Image';
    if (conv.lastMessage.type === 'file') return '📎 File';
    return conv.lastMessage.text || '';
  };

  // Only show active conversations in main list
  // pending conversations initiated BY me show in my sidebar; pending ones FROM others go to requests
  const activeConversations = conversations.filter((c) => {
    if (c.status === 'declined') return false;
    if (c.status === 'pending') {
      const initiatedById = c.initiatedBy?._id?.toString() || c.initiatedBy?.toString();
      return initiatedById === myId;
    }
    return true;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="sidebar-avatar-btn" onClick={() => setShowProfile(true)}>
          <Avatar src={user.avatar} name={user.name} size={36} />
        </button>
        <span className="sidebar-title"><BrandLogo compact /></span>
        <div className="sidebar-header-actions">
          <NotificationBell />
          <button
            className="icon-btn requests-btn"
            title="Message Requests"
            onClick={() => setShowRequests(true)}
          >
            💬
            {requestCount > 0 && <span className="requests-badge">{requestCount}</span>}
          </button>
          <button className="icon-btn" title="New Group" onClick={() => setShowGroupModal(true)}>👥</button>
          <button className="icon-btn" title="Logout" onClick={logout}>⏻</button>
        </div>
      </div>

      {user.isGuest && (
        <div className="sidebar-guest-banner">
          👀 Demo mode — <a href="/signup">Register</a> for full access
        </div>
      )}

      <div className="sidebar-search">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {search.trim() ? (
        <div className="sidebar-search-results">
          {searching && <div className="sidebar-hint">Searching...</div>}
          {!searching && searchResults.length === 0 && (
            <div className="sidebar-hint">No users found.</div>
          )}
          {searchResults.map((u) => (
            <button key={u._id} className="search-result-item" onClick={() => handleStartDirect(u)}>
              <Avatar src={u.avatar} name={u.name} size={36} />
              <div className="search-result-info">
                <span className="search-result-name">{u.name}</span>
                <span className="search-result-username">@{u.username}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="sidebar-conversations">
          {activeConversations.length === 0 && (
            <div className="sidebar-hint">Search for a user to start chatting.</div>
          )}
          {activeConversations.map((conv) => {
            const other = getOtherMember(conv);
            const otherId = other?._id?.toString();
            const isOnline = otherId ? (other?.isOnline || onlineUsers.has(otherId)) : false;
            const lastSeen = otherId ? (lastSeenMap[otherId] || other?.lastSeen) : null;
            return (
              <button
                key={conv._id}
                className={`conv-item ${activeConversationId === conv._id ? 'active' : ''}`}
                onClick={() => handleConvSelect(conv)}
              >
                <div className="conv-avatar-wrap">
                  <Avatar src={getConvAvatar(conv)} name={getConvName(conv)} size={42} />
                  {isOnline && <span className="online-dot" />}
                </div>
                <div className="conv-info">
                  <div className="conv-name-row">
                    <span className="conv-name">{getConvName(conv)}</span>
                    {conv.lastMessageAt && (
                      <span className="conv-time">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <span className="conv-preview">{getLastMessagePreview(conv)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showGroupModal && (
        <NewGroupModal onClose={() => setShowGroupModal(false)} onCreated={handleGroupCreated} />
      )}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
      {showRequests && (
        <MessageRequests
          onAccepted={handleRequestAccepted}
          onClose={() => setShowRequests(false)}
        />
      )}
    </aside>
  );
};

export default Sidebar;
