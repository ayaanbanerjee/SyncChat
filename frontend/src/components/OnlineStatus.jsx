import './OnlineStatus.css';

const OnlineStatus = ({ isConnected, onlineCount }) => {
  return (
    <div className="online-status">
      <span className={`status ${isConnected ? 'online' : 'offline'}`}>
        {isConnected ? 'Online' : 'Offline'}
      </span>
      {isConnected && (
        <span className="online-count">
          {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;
