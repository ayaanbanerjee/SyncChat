require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDatabase = require('./config/database');
const registerChatSocket = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  app.set('io', io);

  registerChatSocket(io);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error.message);
  });
};

startServer();
