import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }

    localStorage.setItem('chatUsername', trimmed);
    navigate('/chat');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Simple Chat</h1>
        <p className="login-subtitle">Enter a username to join the chat room</p>
        <input
          type="text"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Your username"
          maxLength={50}
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button onClick={handleJoin}>Join Chat</button>
      </div>
    </div>
  );
};

export default Login;
