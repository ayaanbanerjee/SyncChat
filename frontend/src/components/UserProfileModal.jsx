import Avatar from './Avatar';
import './UserProfileModal.css';

const UserProfileModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="upm-avatar">
          <Avatar src={user.avatar} name={user.name} size={80} />
        </div>
        <div className="upm-name">{user.name}</div>
        <div className="upm-username">@{user.username}</div>
        {user.bio && <p className="upm-bio">{user.bio}</p>}
      </div>
    </div>
  );
};

export default UserProfileModal;
