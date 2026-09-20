const userService = require('../services/userService');

const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json({ success: true, users: [] });
    const users = await userService.searchUsers(q, req.user._id);
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return next(error);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.params.username);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    const user = await userService.updateProfile(req.user._id, { name, bio });
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const user = await userService.uploadAvatar(req.user._id, req.file.buffer);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

module.exports = { searchUsers, getUserProfile, updateProfile, uploadAvatar };
