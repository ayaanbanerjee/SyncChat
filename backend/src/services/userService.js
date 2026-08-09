const userModel = require('../models/userModel');

const handleUserJoin = (socketId, username) => {
  const wasAlreadyOnline = userModel.isUsernameOnline(username);
  userModel.addUser(socketId, username);
  return {
    username,
    isOnline: true,
    isFirstConnection: !wasAlreadyOnline,
    onlineCount: userModel.getOnlineCount(),
    onlineUsernames: userModel.getOnlineUsernames(),
  };
};

const handleUserDisconnect = (socketId) => {
  const removedUser = userModel.removeUser(socketId);

  if (!removedUser) {
    return null;
  }

  const stillOnline = userModel.isUsernameOnline(removedUser.username);

  return {
    username: removedUser.username,
    isOnline: stillOnline,
    isFullyOffline: !stillOnline,
    onlineCount: userModel.getOnlineCount(),
    onlineUsernames: userModel.getOnlineUsernames(),
  };
};

const getOnlineUsers = () => {
  return {
    usernames: userModel.getOnlineUsernames(),
    count: userModel.getOnlineCount(),
  };
};

module.exports = {
  handleUserJoin,
  handleUserDisconnect,
  getOnlineUsers,
};
