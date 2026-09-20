import { useState, useRef } from 'react';
import { format } from 'date-fns';
import './MessageItem.css';

const MessageItem = ({ message, isOwn, onReply, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const menuRef = useRef(null);

  const handleEditSave = () => {
    if (editText.trim() && editText.trim() !== message.text) {
      onEdit(message._id, editText.trim());
    }
    setEditing(false);
  };

  if (message.isDeleted) {
    return (
      <div className={`msg-row ${isOwn ? 'own' : ''}`}>
        <div className="msg-bubble deleted">Message deleted</div>
      </div>
    );
  }

  return (
    <div
      className={`msg-row ${isOwn ? 'own' : ''}`}
      onMouseLeave={() => setShowMenu(false)}
    >
      {!isOwn && (
        <div className="msg-avatar-name">{message.sender?.name?.charAt(0).toUpperCase()}</div>
      )}
      <div className="msg-content">
        {!isOwn && <span className="msg-sender-name">{message.sender?.name}</span>}

        {/* Reply context */}
        {message.replyTo && (
          <div className="msg-reply-context">
            <span className="msg-reply-author">{message.replyTo.sender?.name}</span>
            <span className="msg-reply-text">{message.replyTo.text || '[file]'}</span>
          </div>
        )}

        <div className="msg-bubble-wrap">
          <div className={`msg-bubble ${isOwn ? 'own' : ''}`}>
            {editing ? (
              <div className="msg-edit-form">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditing(false); }}
                  autoFocus
                />
                <button onClick={handleEditSave}>Save</button>
                <button onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <>
                {message.type === 'image' && (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer">
                    <img src={message.fileUrl} alt={message.fileName} className="msg-image" />
                  </a>
                )}
                {message.type === 'file' && (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer" className="msg-file-link">
                    📎 {message.fileName}
                  </a>
                )}
                {message.type === 'text' && <span className="msg-text">{message.text}</span>}
                {message.isEdited && <span className="msg-edited">(edited)</span>}
              </>
            )}
          </div>

          {/* Context menu trigger */}
          <button className="msg-menu-btn" onClick={() => setShowMenu((v) => !v)}>⋮</button>

          {showMenu && (
            <div className={`msg-menu ${isOwn ? 'own' : ''}`} ref={menuRef}>
              <button onClick={() => { onReply(message); setShowMenu(false); }}>Reply</button>
              {isOwn && message.type === 'text' && (
                <button onClick={() => { setEditing(true); setShowMenu(false); }}>Edit</button>
              )}
              {isOwn && (
                <button className="danger" onClick={() => { onDelete(message._id); setShowMenu(false); }}>Delete</button>
              )}
            </div>
          )}
        </div>

        <div className="msg-meta">
          <span className="msg-time">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOwn && (
            <span className="msg-status">
              {message.readBy?.length > 0 ? '✓✓' : message.deliveredTo?.length > 0 ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
