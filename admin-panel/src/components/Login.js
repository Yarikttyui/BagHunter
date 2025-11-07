import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';
import ColorBends from './ColorBends';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
  const isValidIdentifier = (value) => emailRegex.test(value) || usernameRegex.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedUsername = username.trim();
    if (!isValidIdentifier(normalizedUsername)) {
      setError('Введите корректный email или логин (3-50 символов, без пробелов).');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: normalizedUsername,
        password
      });

      const { token, user } = response.data || {};

      if (token && user && (user.role === 'admin' || user.role === 'accountant')) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Недостаточно прав для входа в административную панель.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Не удалось выполнить вход. Проверьте логин и пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <ColorBends
        colors={['#ff5c7a', '#8a5cff', '#00ffd1', '#667eea', '#764ba2']}
        rotation={30}
        speed={0.3}
        scale={1.2}
        frequency={1.4}
        warpStrength={1.2}
        mouseInfluence={0.8}
        parallax={0.6}
        noise={0.08}
        transparent
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />
      <div className="login-box">
        <div className="admin-badge">ADMIN</div>
        <h1>Административная панель</h1>
        <p className="subtitle">Система учёта BagHunter</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Введите имя пользователя"
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="demo-credentials">
          <p><strong>Демо-доступ:</strong></p>
          <p>Администратор: <code>admin</code> / <code>admin123</code></p>
          <p>Бухгалтер&nbsp;1: <code>accountant1</code> / <code>acc123</code></p>
          <p>Бухгалтер&nbsp;2: <code>accountant2</code> / <code>acc456</code></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
