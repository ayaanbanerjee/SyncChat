const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const searchUsers = async (query, currentUserId) => {
  if (!query || query.trim().length < 1) return [];
  return User.find({
    _id: { $ne: currentUserId },
    $or: [
      { username: { $regex: query.trim(), $options: 'i' } },
      { name: { $regex: query.trim(), $options: 'i' } },
    ],
  })
    .select('name username avatar lastSeen')
    .limit(20);
};

const getUserProfile = async (username) => {
  const user = await User.findOne({ username: username.toLowerCase() }).select('-passwordHash');
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

const updateProfile = async (userId, { name, bio }) => {
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (bio !== undefined) updates.bio = bio.trim();

  return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-passwordHash');
};

const uploadAvatar = (userId, fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'syncchat/avatars', public_id: `avatar_${userId}`, overwrite: true, transformation: [{ width: 200, height: 200, crop: 'fill' }] },
      async (error, result) => {
        if (error) return reject(error);
        const user = await User.findByIdAndUpdate(userId, { avatar: result.secure_url }, { new: true }).select('-passwordHash');
        resolve(user);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

const updateLastSeen = async (userId) => {
  await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
};

module.exports = { searchUsers, getUserProfile, updateProfile, uploadAvatar, updateLastSeen };
