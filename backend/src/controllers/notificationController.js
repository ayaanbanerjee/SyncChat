const notificationService = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotifications(req.user._id);
    const unreadCount = await notificationService.getUnreadCount(req.user._id);
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user._id);
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getNotifications, markAllRead };
