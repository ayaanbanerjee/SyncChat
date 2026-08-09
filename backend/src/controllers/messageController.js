const messageService = require('../services/messageService');
const userService = require('../services/userService');

const getMessages = async (req, res, next) => {
  try {
    const roomId = req.query.roomId || 'global';
    const messages = await messageService.getMessagesByRoom(roomId);
    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    return next(error);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const { username, text, roomId } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username is required.',
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required.',
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 500 characters.',
      });
    }

    const newMessage = await messageService.createMessage({
      username,
      text,
      roomId: roomId || 'global',
    });

    const io = req.app.get('io');

    if (io) {
      io.emit('newMessage', newMessage);

      const { count } = userService.getOnlineUsers();
      if (count > 1) {
        const deliveredMessage = await messageService.markDelivered(newMessage._id);
        if (deliveredMessage) {
          io.emit('message:delivered', {
            messageId: deliveredMessage._id,
            status: 'delivered',
          });
        }
      }
    }

    return res.status(201).json({
      success: true,
      messageData: newMessage,
    });
  } catch (error) {
    return next(error);
  }
};

const healthCheck = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is running',
  });
};

module.exports = {
  getMessages,
  createMessage,
  healthCheck,
};
