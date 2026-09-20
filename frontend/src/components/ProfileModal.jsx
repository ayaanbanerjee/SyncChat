import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar, changePassword } from '../services/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import './Modal.css';

const ProfileModal = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({ name, bio });
      updateUser(res.data.user);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await uploadAvatar(formData);
      updateUser(res.data.user);
      toast.success('Avatar updated.');
    } catch {
      toast.error('Failed to upload avatar.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error('Both fields required.'); return; }
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed.');
      setCurrentPw(''); setNewPw('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Profile</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="profile-avatar-section">
            <Avatar src={user.avatar} name={user.name} size={64} />
            <label className="avatar-upload-label">
              Change Photo
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>
          <input className="modal-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="modal-input" placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <button className="modal-btn" onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          <hr className="modal-divider" />
          <p className="modal-section-title">Change Password</p>
          <input className="modal-input" type="password" placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          <input className="modal-input" type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <button className="modal-btn secondary" onClick={handleChangePassword}>Update Password</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
