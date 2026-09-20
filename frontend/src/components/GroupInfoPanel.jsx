import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  updateGroup, addMembers, removeMember, assignAdmin, removeAdmin, deleteGroup, searchUsers,
} from '../services/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import './GroupInfoPanel.css';

const GroupInfoPanel = ({ conversation, onUpdate, onClose }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const isAdmin = conversation.admins?.some((a) => (a._id || a) === user._id);

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    try {
      const res = await searchUsers(q);
      setResults(res.data.users.filter(
        (u) => !conversation.members.find((m) => (m._id || m) === u._id)
      ));
    } catch { /* ignore */ }
  };

  const handleAddMember = async (targetUser) => {
    try {
      const res = await addMembers(conversation._id, [targetUser._id]);
      onUpdate(res.data.conversation);
      toast.success(`${targetUser.name} added.`);
      setSearch(''); setResults([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await removeMember(conversation._id, memberId);
      onUpdate(res.data.conversation);
      toast.success('Member removed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleLeave = async () => {
    try {
      await removeMember(conversation._id, user._id);
      toast.success('You left the group.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave group.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group? This cannot be undone.')) return;
    try {
      await deleteGroup(conversation._id);
      toast.success('Group deleted.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group.');
    }
  };

  return (
    <div className="group-info-panel">
      <div className="group-info-header">
        <h4>Group Info</h4>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="group-info-body">
        <p className="group-info-name">{conversation.name}</p>
        <p className="group-info-count">{conversation.members?.length} members</p>

        {isAdmin && (
          <div className="group-info-add">
            <input
              placeholder="Add member..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {results.map((u) => (
              <button key={u._id} className="group-add-result" onClick={() => handleAddMember(u)}>
                <Avatar src={u.avatar} name={u.name} size={28} />
                <span>{u.name}</span>
                <span className="add-icon">+</span>
              </button>
            ))}
          </div>
        )}

        <div className="group-members-list">
          {conversation.members?.map((m) => {
            const memberId = m._id || m;
            const isAdminMember = conversation.admins?.some((a) => (a._id || a) === memberId);
            const isSelf = memberId === user._id;
            return (
              <div key={memberId} className="group-member-item">
                <Avatar src={m.avatar} name={m.name} size={32} />
                <span className="group-member-name">{m.name || memberId}</span>
                {isAdminMember && <span className="admin-badge">Admin</span>}
                {isAdmin && !isSelf && (
                  <div className="group-member-actions">
                    {!isAdminMember
                      ? <button onClick={() => assignAdmin(conversation._id, memberId).then((r) => onUpdate(r.data.conversation))}>Make Admin</button>
                      : <button onClick={() => removeAdmin(conversation._id, memberId).then((r) => onUpdate(r.data.conversation))}>Remove Admin</button>
                    }
                    <button className="danger" onClick={() => handleRemoveMember(memberId)}>Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="group-info-actions">
          <button className="group-leave-btn" onClick={handleLeave}>Leave Group</button>
          {isAdmin && (
            <button className="group-delete-btn" onClick={handleDeleteGroup}>Delete Group</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupInfoPanel;
