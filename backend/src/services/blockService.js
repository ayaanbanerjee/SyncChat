const User = require('../models/User');

const blockUser = async (userId, targetId) => {
  if (userId.toString() === targetId.toString()) {
    const err = new Error('Cannot block yourself.'); err.statusCode = 400; throw err;
  }
  const target = await User.findById(targetId);
  if (!target) { const err = new Error('User not found.'); err.statusCode = 404; throw err; }

  await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: targetId } });
};

const unblockUser = async (userId, targetId) => {
  await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetId } });
};

const getBlockedUsers = async (userId) => {
  const user = await User.findById(userId).populate('blockedUsers', 'name username avatar');
  return user?.blockedUsers || [];
};

const isBlocked = async (userId, targetId) => {
  const user = await User.findById(userId).select('blockedUsers');
  return user?.blockedUsers?.map(String).includes(targetId.toString()) || false;
};

module.exports = { blockUser, unblockUser, getBlockedUsers, isBlocked };
