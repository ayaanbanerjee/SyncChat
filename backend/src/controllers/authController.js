const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const { user, token } = await authService.register({ name, username, email, password });

    return res.status(201).json({ success: true, token, user });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const { user, token } = await authService.login({ email, password });

    return res.status(200).json({ success: true, token, user });
  } catch (error) {
    return next(error);
  }
};

const getMe = (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    await authService.changePassword(req.user._id, { currentPassword, newPassword });
    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, getMe, changePassword };
