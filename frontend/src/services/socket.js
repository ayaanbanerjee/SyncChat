import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Socket is created once; token is injected before connecting
const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: { token: '' },
  // Start with polling so it works on Render free tier,
  // then upgrades to WebSocket automatically if available
  transports: ['polling', 'websocket'],
});

export const connectSocket = (token) => {
  socket.auth = { token };
  if (!socket.connected) socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect();
};

export default socket;
