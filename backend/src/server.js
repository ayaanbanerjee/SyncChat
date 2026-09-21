require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDatabase = require('./config/database');
const { connectRedis } = require('./config/redis');
const { registerChatSocket } = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;

// Support multiple origins: local dev + deployed Vercel URL
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

const startServer = async () => {
  await connectDatabase();
  await connectRedis(); // optional — gracefully skipped if REDIS_URL not set

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
    pingTimeout: 60000,
    // Render free tier requires polling fallback before upgrading to WebSocket
    transports: ['polling', 'websocket'],
  });

  app.set('io', io);

  registerChatSocket(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error.message);
  });
};

startServer();
