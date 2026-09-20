import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If token is expired/invalid, clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const changePassword = (data) => api.put('/auth/change-password', data);

// Users
export const searchUsers = (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`);
export const getUserProfile = (username) => api.get(`/users/${username}`);
export const updateProfile = (data) => api.put('/users/me/profile', data);
export const uploadAvatar = (formData) => api.post('/users/me/avatar', formData);

// Conversations
export const getConversations = () => api.get('/conversations');
export const getConversation = (id) => api.get(`/conversations/${id}`);
export const startDirect = (targetUserId) => api.post('/conversations/direct', { targetUserId });
export const createGroup = (data) => api.post('/conversations/group', data);
export const updateGroup = (id, data) => api.put(`/conversations/${id}`, data);
export const deleteGroup = (id) => api.delete(`/conversations/${id}`);
export const addMembers = (id, memberIds) => api.post(`/conversations/${id}/members`, { memberIds });
export const removeMember = (id, userId) => api.delete(`/conversations/${id}/members/${userId}`);
export const assignAdmin = (id, userId) => api.post(`/conversations/${id}/admins/${userId}`);
export const removeAdmin = (id, userId) => api.delete(`/conversations/${id}/admins/${userId}`);

// Messages
export const getMessages = (conversationId, cursor) =>
  api.get(`/messages/${conversationId}${cursor ? `?cursor=${cursor}` : ''}`);
export const sendMessage = (conversationId, data) => api.post(`/messages/${conversationId}`, data);
export const sendFile = (conversationId, formData) => api.post(`/messages/${conversationId}/file`, formData);
export const editMessage = (messageId, text) => api.put(`/messages/${messageId}`, { text });
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`);
export const searchMessages = (q) => api.get(`/messages/search?q=${encodeURIComponent(q)}`);

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationsRead = () => api.put('/notifications/read-all');

export default api;
