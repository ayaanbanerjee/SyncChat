import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser } from '../services/api';
import toast from 'react-hot-toast';
import './Auth.css';

const Auth = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await loginUser({ email: form.email, password: form.password });
      } else {
        if (!form.name || !form.username || !form.email || !form.password) {
          toast.error('All fields are required.');
          return;
        }
        res = await registerUser(form);
      }
      login(res.data.token, res.data.user).then(() => navigate('/chat'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">💬</span>
          <h1>SyncChat</h1>
        </div>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
              <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
            </>
          )}
          <input name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required minLength={6} />
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-switch-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
