import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Always load user from /auth/me using the stored token
  // This guarantees user._id is always a plain string, never a Mongoose object
  const loadUser = async (token) => {
    try {
      const res = await getMe();
      setUser(res.data.user);
      connectSocket(token);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    loadUser(token);
  }, []);

  const login = async (token, _userData) => {
    // Store token first so the axios interceptor can attach it
    localStorage.setItem('token', token);
    // Always fetch from server — never trust the register/login response object directly
    await loadUser(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    disconnectSocket();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
