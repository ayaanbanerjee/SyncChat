const connectedUsers = new Map();

const addUser = (socketId, username) => {
  connectedUsers.set(socketId, { username, connectedAt: Date.now() });
};

const removeUser = (socketId) => {
  const user = connectedUsers.get(socketId);
  connectedUsers.delete(socketId);
  return user || null;
};

const getUserBySocketId = (socketId) => {
  return connectedUsers.get(socketId) || null;
};

const getOnlineUsernames = () => {
  const usernames = new Set();
  connectedUsers.forEach((user) => usernames.add(user.username));
  return Array.from(usernames);
};

const getOnlineCount = () => {
  return getOnlineUsernames().length;
};

const isUsernameOnline = (username) => {
  return getOnlineUsernames().includes(username);
};

module.exports = {
  addUser,
  removeUser,
  getUserBySocketId,
  getOnlineUsernames,
  getOnlineCount,
  isUsernameOnline,
};
