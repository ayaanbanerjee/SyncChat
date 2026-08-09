import './TypingIndicator.css';

const TypingIndicator = ({ username }) => {
  if (!username) {
    return null;
  }

  return <div className="typing-indicator">{username} is typing...</div>;
};

export default TypingIndicator;
