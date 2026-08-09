import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const fetchMessages = async () => {
  const response = await api.get('/messages');
  return response.data;
};

export const sendMessage = async (username, text) => {
  const response = await api.post('/messages', { username, text });
  return response.data;
};

export default api;
