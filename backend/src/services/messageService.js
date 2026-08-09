const Message = require('../models/messageModel');

const getMessagesByRoom = async (roomId = 'global') => {
  return Message.find({ roomId }).sort({ createdAt: 1 });
};

const createMessage = async ({ username, text, roomId = 'global' }) => {
  return Message.create({
    username: username.trim(),
    text: text.trim(),
    roomId,
    status: 'sent',
  });
};

const markDelivered = async (messageId) => {
  return Message.findOneAndUpdate(
    { _id: messageId, status: 'sent' },
    { status: 'delivered' },
    { new: true }
  );
};

const markAsRead = async (messageIds, username) => {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return [];
  }

  await Message.updateMany(
    {
      _id: { $in: messageIds },
      username: { $ne: username },
      status: { $ne: 'read' },
    },
    { status: 'read' }
  );

  return Message.find({
    _id: { $in: messageIds },
    username: { $ne: username },
    status: 'read',
  });
};

module.exports = {
  getMessagesByRoom,
  createMessage,
  markDelivered,
  markAsRead,
};
