const userService = require('../services/userService');
const messageService = require('../services/messageService');

const isValidPayload = (payload, requiredFields) => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  return requiredFields.every((field) => payload[field] !== undefined && payload[field] !== null);
};

const registerChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('user:join', (payload) => {
      try {
        if (!isValidPayload(payload, ['username'])) {
          return;
        }

        const { username, roomId = 'global' } = payload;
        socket.data.username = username;
        socket.data.roomId = roomId;
        socket.join(roomId);

        const result = userService.handleUserJoin(socket.id, username);

        if (result.isFirstConnection) {
          socket.broadcast.emit('user:online', { username, isOnline: true });
        }

        io.emit('users:update', {
          onlineCount: result.onlineCount,
          onlineUsernames: result.onlineUsernames,
        });
      } catch (error) {
        console.error(`user:join error on ${socket.id}:`, error.message);
      }
    });

    socket.on('typing', (payload) => {
      try {
        if (!isValidPayload(payload, ['username'])) {
          return;
        }
        const { username, roomId = 'global' } = payload;
        socket.broadcast.emit('userTyping', { username, roomId });
      } catch (error) {
        console.error(`typing error on ${socket.id}:`, error.message);
      }
    });

    socket.on('stopTyping', (payload) => {
      try {
        if (!isValidPayload(payload, ['username'])) {
          return;
        }
        const { username, roomId = 'global' } = payload;
        socket.broadcast.emit('userStoppedTyping', { username, roomId });
      } catch (error) {
        console.error(`stopTyping error on ${socket.id}:`, error.message);
      }
    });

    socket.on('message:read', async (payload) => {
      try {
        if (!isValidPayload(payload, ['messageIds', 'username'])) {
          return;
        }
        const { messageIds, username } = payload;
        if (!Array.isArray(messageIds)) {
          return;
        }

        const updatedMessages = await messageService.markAsRead(messageIds, username);

        updatedMessages.forEach((message) => {
          io.emit('message:statusUpdated', {
            messageId: message._id,
            status: 'read',
          });
        });
      } catch (error) {
        console.error(`message:read error on ${socket.id}:`, error.message);
      }
    });

    socket.on('disconnect', () => {
      try {
        console.log(`Client disconnected: ${socket.id}`);
        const result = userService.handleUserDisconnect(socket.id);

        if (result) {
          if (result.isFullyOffline) {
            io.emit('user:offline', { username: result.username, isOnline: false });
          }
          io.emit('users:update', {
            onlineCount: result.onlineCount,
            onlineUsernames: result.onlineUsernames,
          });
        }
      } catch (error) {
        console.error(`disconnect error on ${socket.id}:`, error.message);
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket error on ${socket.id}:`, error.message);
    });
  });
};

module.exports = registerChatSocket;
