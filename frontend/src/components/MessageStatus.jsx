import './MessageStatus.css';

const STATUS_LABELS = {
  sent: '✓ Sent',
  delivered: '✓✓ Delivered',
  read: '✓✓ Read',
};

const MessageStatus = ({ status }) => {
  const label = STATUS_LABELS[status] || STATUS_LABELS.sent;

  return <span className={`message-status ${status}`}>{label}</span>;
};

export default MessageStatus;
