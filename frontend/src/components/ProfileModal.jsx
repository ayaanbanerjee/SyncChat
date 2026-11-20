import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar, changePassword } from '../services/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import './Modal.css';
import './ProfileModal.css';

const ProfileModal = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const fileRef = useRef(null);

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error('Name is required.'); return; }
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
    if (!file.type.startsWith('image/')) { toast.error('Only image files are allowed.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return; }

    setAvatarLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await uploadAvatar(formData);
      updateUser(res.data.user);
      toast.success('Avatar updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar.');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('All password fields are required.'); return; }
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords do not match.'); return; }
    if (user.isGuest) { toast.error('Guests cannot change passwords.'); return; }
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Profile Settings</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Details
          </button>
          <button
            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            disabled={user.isGuest}
            title={user.isGuest ? 'Not available for guests' : ''}
          >
            Security
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'basic' && (
            <>
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrap">
                  <Avatar src={user.avatar} name={user.name} size={72} />
                  {avatarLoading && <div className="avatar-loading-overlay">⏳</div>}
                </div>
                <div className="profile-avatar-actions">
                  <button
                    className="avatar-upload-btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarLoading || user.isGuest}
                  >
                    {avatarLoading ? 'Uploading...' : 'Change Photo'}
                  </button>
                  {user.isGuest && <span className="profile-guest-note">Not available in demo</span>}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-label">Display Name</label>
                <input
                  className="modal-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  disabled={user.isGuest}
                />
              </div>

              <div className="profile-field">
                <label className="profile-label">Username</label>
                <input
                  className="modal-input"
                  value={`@${user.username}`}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </div>

              <div className="profile-field">
                <label className="profile-label">Bio</label>
                <input
                  className="modal-input"
                  placeholder="Tell people about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  disabled={user.isGuest}
                />
                <span className="profile-char-count">{bio.length}/150</span>
              </div>

              <button
                className="modal-btn"
                onClick={handleSaveProfile}
                disabled={saving || user.isGuest}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {user.isGuest && (
                <p className="profile-guest-banner">
                  🔒 You are in demo mode. Register for a full account to edit your profile.
                </p>
              )}
            </>
          )}

          {activeTab === 'security' && !user.isGuest && (
            <>
              <p className="modal-section-title" style={{ marginBottom: 4 }}>Change Password</p>
              <div className="profile-field">
                <label className="profile-label">Current Password</label>
                <input
                  className="modal-input"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">New Password</label>
                <input
                  className="modal-input"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Confirm New Password</label>
                <input
                  className="modal-input"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
                {confirmPw && newPw !== confirmPw && (
                  <span className="profile-error">Passwords do not match</span>
                )}
              </div>
              <button
                className="modal-btn"
                onClick={handleChangePassword}
                disabled={pwSaving || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
              >
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
