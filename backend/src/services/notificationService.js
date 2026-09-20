const Notification = require('../models/Notification');

const createNotification = async ({ recipient, type, actor, conversationId, messageId, text }) => {
  return Notification.create({ recipient, type, actor, conversationId, messageId, text });
};

const getNotifications = async (userId) => {
  return Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('actor', 'name username avatar')
    .populate('conversationId', 'name type');
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

module.exports = { createNotification, getNotifications, getUnreadCount, markAllRead };
