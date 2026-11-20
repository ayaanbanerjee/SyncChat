import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getConversations, startDirect, searchUsers, getMessageRequests,
  acceptRequest, declineRequest,
} from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import NewGroupModal from './NewGroupModal';
import ProfileModal from './ProfileModal';
import NotificationBell from './NotificationBell';
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
  const [requests, setRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  const searchTimeout = useRef(null);

  const myId = user._id?.toString();

  // Load conversations on mount
  useEffect(() => {
    getConversations()
      .then((res) => setConversations(res.data.conversations))
      .catch(() => toast.error('Failed to load conversations.'));
  }, [setConversations]);

  // Load pending requests on mount
  useEffect(() => {
    getMessageRequests()
      .then((res) => setRequests(res.data.requests))
      .catch(() => {});
  }, []);

  // Socket listeners — myId in dependency array to avoid stale closure
  useEffect(() => {
    const handleNewMessage = (message) => {
      setConversations((prev) => {
        const convId = message.conversationId?._id?.toString() || message.conversationId?.toString();
        const updated = prev.map((c) =>
          c._id === convId
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
      if (conv.status === 'pending' && initiatedById !== myId) {
        // It's a request FOR me — add to requests list, not main sidebar
        setRequests((prev) => {
          if (prev.find((r) => r._id === conv._id)) return prev;
          return [conv, ...prev];
        });
        return;
      }
      // It's active or I initiated it — add to main sidebar
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
  }, [setConversations, myId]);

  // Debounced user search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers(search);
        setSearchResults(res.data.users);
      } catch { /* ignore */ } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  const handleStartDirect = async (targetUser) => {
    try {
      const res = await startDirect(targetUser._id);
      const conv = res.data.conversation;
      const initiatedById = conv.initiatedBy?._id?.toString() || conv.initiatedBy?.toString();

      if (conv.status === 'pending' && initiatedById === myId) {
        // I started it — show in my sidebar so I can see the chat
        setConversations((prev) => {
          if (prev.find((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
      } else if (conv.status === 'active') {
        // Already accepted / existing convo
        setConversations((prev) => {
          if (prev.find((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
      }

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

  const handleAcceptRequest = async (req) => {
    try {
      const res = await acceptRequest(req._id);
      const conv = res.data.conversation;
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      setConversations((prev) => {
        if (prev.find((c) => c._id === conv._id)) {
          // Update existing entry to active
          return prev.map((c) => c._id === conv._id ? conv : c);
        }
        return [conv, ...prev];
      });
      socket.emit('conversation:join', { conversationId: conv._id });
      toast.success('Request accepted.');
      onSelect(conv);
      setShowRequests(false);
      if (onMobileClose) onMobileClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept.');
    }
  };

  const handleDeclineRequest = async (req) => {
    try {
      await declineRequest(req._id);
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      toast.success('Request declined.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline.');
    }
  };

  const handleConvSelect = (conv) => {
    onSelect(conv);
    if (onMobileClose) onMobileClose();
  };

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

  const getSender = useCallback((req) =>
    req.members?.find((m) => m._id?.toString() !== myId), [myId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title"><BrandLogo /></span>
        <div className="sidebar-header-actions">
          <NotificationBell />
          <button className="icon-btn" title="New Group" aria-label="New Group" onClick={() => setShowGroupModal(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11-3v6m3-3h-6" /></svg>
          </button>
          <button className="icon-btn" title="Logout" aria-label="Logout" onClick={logout}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg>
          </button>
        </div>
      </div>

      <button className="sidebar-profile" onClick={() => setShowProfile(true)} aria-label="Open profile">
        <span className="sidebar-profile-avatar">
          <Avatar src={user.avatar} name={user.name} size={42} />
          <span className="profile-presence" />
        </span>
        <span className="sidebar-profile-info">
          <span className="sidebar-profile-name">{user.name}</span>
          <span className="sidebar-profile-caption">{user.isGuest ? 'Demo account' : `@${user.username || 'your profile'}`}</span>
        </span>
        <svg className="profile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>

      {user.isGuest && (
        <div className="sidebar-guest-banner">
          👀 Demo mode — <a href="/signup">Register</a> for full access
        </div>
      )}

      <div className="sidebar-search">
        <svg className="sidebar-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        <input
          aria-label="Search users"
          placeholder="Search people..."
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
          <div className="sidebar-section-heading">
            <span>Recent chats</span>
            {conversations.length > 0 && <span className="sidebar-chat-count">{conversations.length}</span>}
          </div>

          {/* ── Message Requests Section ── */}
          {requests.length > 0 && (
            <div className="requests-section">
              <button
                className="requests-section-header"
                onClick={() => setShowRequests((v) => !v)}
              >
                <span className="requests-icon" aria-hidden="true">✉</span>
                <span>Message Requests</span>
                <span className="requests-count">{requests.length}</span>
                <svg className={`requests-chevron ${showRequests ? 'expanded' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>

              {showRequests && (
                <div className="requests-list">
                  {requests.map((req) => {
                    const sender = getSender(req);
                    return (
                      <div key={req._id} className="request-item">
                        <Avatar src={sender?.avatar} name={sender?.name} size={38} />
                        <div className="request-item-info">
                          <span className="request-item-name">{sender?.name}</span>
                          <span className="request-item-preview">
                            {req.lastMessage
                              ? (req.lastMessage.type === 'image' ? '📷 Image'
                                : req.lastMessage.type === 'file' ? '📎 File'
                                : req.lastMessage.text || 'Wants to message you')
                              : 'Wants to message you'}
                          </span>
                        </div>
                        <div className="request-item-actions">
                          <button
                            className="req-accept-btn"
                            onClick={() => handleAcceptRequest(req)}
                          >✓</button>
                          <button
                            className="req-decline-btn"
                            onClick={() => handleDeclineRequest(req)}
                          >✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Main Conversations ── */}
          {conversations.length === 0 && requests.length === 0 && (
            <div className="sidebar-hint">Search for a user to start chatting.</div>
          )}
          {conversations.map((conv) => {
            const other = getOtherMember(conv);
            const otherId = other?._id?.toString();
            const isOnline = otherId ? (other?.isOnline || onlineUsers.has(otherId)) : false;
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
                  <div className="conv-preview-row">
                    <span className="conv-preview">{getLastMessagePreview(conv)}</span>
                    {conv.status === 'pending' && (
                      <span className="conv-pending-tag">Pending</span>
                    )}
                  </div>
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
    </aside>
  );
};

export default Sidebar;
