import { useState } from 'react';
import { createGroup, searchUsers } from '../services/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import './Modal.css';

const NewGroupModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    try {
      const res = await searchUsers(q);
      setResults(res.data.users);
    } catch { /* ignore */ }
  };

  const toggleMember = (u) => {
    setSelected((prev) =>
      prev.find((m) => m._id === u._id) ? prev.filter((m) => m._id !== u._id) : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name is required.'); return; }
    setLoading(true);
    try {
      const res = await createGroup({ name, memberIds: selected.map((u) => u._id) });
      toast.success('Group created!');
      onCreated(res.data.conversation);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Group</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
          />
          <input
            placeholder="Search members..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="modal-input"
          />
          {results.map((u) => (
            <button
              key={u._id}
              className={`modal-user-item ${selected.find((m) => m._id === u._id) ? 'selected' : ''}`}
              onClick={() => toggleMember(u)}
            >
              <Avatar src={u.avatar} name={u.name} size={32} />
              <span>{u.name}</span>
              {selected.find((m) => m._id === u._id) && <span className="check">✓</span>}
            </button>
          ))}
          {selected.length > 0 && (
            <div className="modal-selected">
              {selected.map((u) => (
                <span key={u._id} className="modal-tag">
                  {u.name}
                  <button onClick={() => toggleMember(u)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGroupModal;
