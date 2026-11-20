const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 12;

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async ({ name, username, email, password }) => {
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    const error = new Error('Email is already registered.');
    error.statusCode = 409;
    throw error;
  }

  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) {
    const error = new Error('Username is already taken.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const created = await User.create({ name, username: username.toLowerCase(), email: email.toLowerCase(), passwordHash });

  // Fetch without passwordHash so it is never sent to the client
  const user = await User.findById(created._id).select('-passwordHash');
  const token = generateToken(user._id);
  return { user, token };
};

const login = async ({ email, password }) => {
  // Explicitly select passwordHash since it's excluded by default
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.isGuest) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Update isOnline on login
  await User.findByIdAndUpdate(user._id, { isOnline: true });

  const token = generateToken(user._id);

  // Return user without passwordHash
  const userObj = user.toObject();
  delete userObj.passwordHash;
  userObj.isOnline = true;

  return { user: userObj, token };
};

const guestLogin = async () => {
  // Find by username first (handles both old docs without isGuest field and new ones)
  let guest = await User.findOne({ username: 'demo_guest' });
  if (!guest) {
    try {
      const passwordHash = await bcrypt.hash('guest_demo_2024_!', SALT_ROUNDS);
      guest = await User.create({
        name: 'Demo Guest',
        username: 'demo_guest',
        email: 'demo_guest@syncchat.demo',
        passwordHash,
        isGuest: true,
        bio: 'Exploring SyncChat as a guest.',
      });
    } catch (createErr) {
      // Race condition: another request created it first — just fetch it
      if (createErr.code === 11000) {
        guest = await User.findOne({ username: 'demo_guest' });
      } else {
        throw createErr;
      }
    }
  } else if (!guest.isGuest) {
    // Patch existing doc that was created before isGuest field existed
    await User.findByIdAndUpdate(guest._id, { isGuest: true });
  }
  const token = generateToken(guest._id);
  const userObj = await User.findById(guest._id).select('-passwordHash');
  return { user: userObj, token };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new Error('User not found.');

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 400;
    throw error;
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
};

module.exports = { register, login, guestLogin, changePassword, generateToken };
