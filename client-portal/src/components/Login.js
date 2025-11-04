import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';
import ColorBends from './ColorBends';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      const { token, user } = response.data || {};

      if (!token || !user) {
        throw new Error('Нет данных для входа');
      }

      if (!user.is_verified) {
        setError('Email не подтвержден. Пожалуйста, завершите активацию аккаунта.');
        setLoading(false);
        return;
      }

      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <ColorBends
        colors={['#00ffd1', '#667eea', '#f093fb', '#43e97b']}
        rotation={60}
        speed={0.25}
        scale={1.3}
        frequency={1.3}
        warpStrength={1.1}
        mouseInfluence={0.7}
        parallax={0.5}
        noise={0.06}
        transparent
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />
      <div className="login-box">
        <h1>Личный кабинет клиента</h1>
        <p className="subtitle">BagHunter Logistics</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <div className="register-link">
          Нет аккаунта? <span onClick={onSwitchToRegister}>Зарегистрируйтесь</span>
        </div>

        <div className="demo-credentials">
          <p><strong>Тестовые данные:</strong></p>
          <p>Логин: <code>client1</code> | Пароль: <code>client123</code></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
