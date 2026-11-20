const blockService = require('../services/blockService');

const blockUser = async (req, res, next) => {
  try {
    await blockService.blockUser(req.user._id, req.params.userId);
    return res.status(200).json({ success: true, message: 'User blocked.' });
  } catch (err) { return next(err); }
};

const unblockUser = async (req, res, next) => {
  try {
    await blockService.unblockUser(req.user._id, req.params.userId);
    return res.status(200).json({ success: true, message: 'User unblocked.' });
  } catch (err) { return next(err); }
};

const getBlockedUsers = async (req, res, next) => {
  try {
    const users = await blockService.getBlockedUsers(req.user._id);
    return res.status(200).json({ success: true, users });
  } catch (err) { return next(err); }
};

module.exports = { blockUser, unblockUser, getBlockedUsers };
