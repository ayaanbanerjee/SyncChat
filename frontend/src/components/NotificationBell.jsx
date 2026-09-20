import { useState, useEffect } from 'react';
import { getNotifications, markNotificationsRead } from '../services/api';
import socket from '../services/socket';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();

    const handleNew = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnread((prev) => prev + 1);
    };

    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, []);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await markNotificationsRead();
      setUnread(0);
    }
  };

  const typeLabel = {
    new_message: '💬',
    group_added: '👥',
    group_removed: '🚪',
    new_conversation: '✉️',
    mention: '@',
  };

  return (
    <div className="notif-wrap">
      <button className="icon-btn notif-btn" onClick={handleOpen} title="Notifications">
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">Notifications</div>
          {notifications.length === 0 && (
            <div className="notif-empty">No notifications yet.</div>
          )}
          {notifications.map((n) => (
            <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
              <span className="notif-icon">{typeLabel[n.type] || '🔔'}</span>
              <div className="notif-content">
                <span className="notif-text">{n.text || n.type.replace(/_/g, ' ')}</span>
                <span className="notif-time">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
