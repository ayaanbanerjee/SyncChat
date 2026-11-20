import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMessageRequests, acceptRequest, declineRequest } from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import './MessageRequests.css';

const MessageRequests = ({ onAccepted, onClose }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const myId = user._id?.toString();

  useEffect(() => {
    getMessageRequests()
      .then((res) => setRequests(res.data.requests))
      .catch(() => toast.error('Failed to load requests.'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time: new conversation created → check if it's a pending request for me
  useEffect(() => {
    const handleConvCreated = (conv) => {
      const initiatedById = conv.initiatedBy?._id?.toString() || conv.initiatedBy?.toString();
      if (conv.status === 'pending' && initiatedById !== myId) {
        setRequests((prev) => {
          if (prev.find((r) => r._id === conv._id)) return prev;
          return [conv, ...prev];
        });
      }
    };
    socket.on('conversation:created', handleConvCreated);
    return () => socket.off('conversation:created', handleConvCreated);
  }, [myId]);

  const handleAccept = async (req) => {
    try {
      const res = await acceptRequest(req._id);
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      toast.success('Request accepted.');
      onAccepted(res.data.conversation);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept.');
    }
  };

  const handleDecline = async (req) => {
    try {
      await declineRequest(req._id);
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      toast.success('Request declined.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline.');
    }
  };

  const getSender = (req) => req.members?.find((m) => m._id?.toString() !== myId);

  return (
    <div className="msg-requests-overlay" onClick={onClose}>
      <div className="msg-requests-panel" onClick={(e) => e.stopPropagation()}>
        <div className="msg-requests-header">
          <h3>Message Requests</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="msg-requests-body">
          {loading && <p className="msg-requests-hint">Loading...</p>}
          {!loading && requests.length === 0 && (
            <p className="msg-requests-hint">No pending message requests.</p>
          )}
          {requests.map((req) => {
            const sender = getSender(req);
            return (
              <div key={req._id} className="msg-request-item">
                <Avatar src={sender?.avatar} name={sender?.name} size={44} />
                <div className="msg-request-info">
                  <span className="msg-request-name">{sender?.name}</span>
                  <span className="msg-request-username">@{sender?.username}</span>
                  {req.lastMessage && (
                    <span className="msg-request-preview">
                      {req.lastMessage.isDeleted ? 'Message deleted' :
                        req.lastMessage.type === 'image' ? '📷 Image' :
                        req.lastMessage.type === 'file' ? '📎 File' :
                        req.lastMessage.text}
                    </span>
                  )}
                </div>
                <div className="msg-request-actions">
                  <button className="req-accept-btn" onClick={() => handleAccept(req)}>Accept</button>
                  <button className="req-decline-btn" onClick={() => handleDecline(req)}>Decline</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageRequests;
