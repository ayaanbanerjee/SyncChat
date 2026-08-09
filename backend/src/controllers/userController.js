const userService = require('../services/userService');

const getOnlineUsers = (req, res, next) => {
  try {
    const { usernames, count } = userService.getOnlineUsers();
    return res.status(200).json({
      success: true,
      onlineCount: count,
      onlineUsers: usernames,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOnlineUsers,
};
