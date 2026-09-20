const { verifySocketToken } = require('../middleware/authMiddleware');
const messageService = require('../services/messageService');
const userService = require('../services/userService');
const notificationService = require('../services/notificationService');
const Conversation = require('../models/Conversation');
const { getRedis } = require('../config/redis');

// In-memory presence fallback when Redis is not available
const onlineUsers = new Map(); // userId -> Set of socketIds

const setUserOnline = async (userId) => {
  const redis = getRedis();
  if (redis) {
    await redis.sAdd('online_users', userId.toString());
  } else {
    if (!onlineUsers.has(userId.toString())) onlineUsers.set(userId.toString(), new Set());
  }
};

const setUserOffline = async (userId) => {
  const redis = getRedis();
  if (redis) {
    await redis.sRem('online_users', userId.toString());
  } else {
    onlineUsers.delete(userId.toString());
  }
};

const isUserOnline = async (userId) => {
  const redis = getRedis();
  if (redis) {
    return redis.sIsMember('online_users', userId.toString());
  }
  return onlineUsers.has(userId.toString());
};

const registerChatSocket = (io) => {
  // Authenticate every socket connection with JWT
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = await verifySocketToken(token);
    if (!user) {
      return next(new Error('Authentication failed.'));
    }
    socket.user = user;
    return next();
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket connected: ${socket.id} | User: ${socket.user.username}`);

    // Track socket → user mapping for multi-tab support
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    await setUserOnline(userId);

    // Join all conversation rooms this user belongs to
    const conversations = await Conversation.find({ members: userId }).select('_id');
    conversations.forEach((c) => socket.join(c._id.toString()));

    // Notify others that this user is online
    socket.broadcast.emit('presence:update', { userId, isOnline: true });

    // --- Typing ---
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start', { userId, username: socket.user.username, conversationId });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop', { userId, conversationId });
    });

    // --- Message delivered acknowledgement ---
    socket.on('message:delivered', async ({ messageId }) => {
      try {
        await messageService.markDelivered(messageId, userId);
        // Notify the sender
        const msg = await require('../models/Message').findById(messageId).select('sender conversationId');
        if (msg) {
          io.to(msg.conversationId.toString()).emit('message:delivered', { messageId, userId });
        }
      } catch (err) {
        console.error('message:delivered error:', err.message);
      }
    });

    // --- Mark conversation as read ---
    socket.on('message:read', async ({ conversationId }) => {
      try {
        await messageService.markRead(conversationId, userId);
        io.to(conversationId).emit('message:read', { conversationId, userId });
      } catch (err) {
        console.error('message:read error:', err.message);
      }
    });

    // --- Join a new conversation room (after creating one) ---
    socket.on('conversation:join', ({ conversationId }) => {
      socket.join(conversationId);
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} | User: ${socket.user.username}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await setUserOffline(userId);
          await userService.updateLastSeen(userId);
          socket.broadcast.emit('presence:update', { userId, isOnline: false });
        }
      }
    });
  });
};

module.exports = { registerChatSocket, isUserOnline };
