import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';
import { API_BASE_URL, ADMIN_PANEL_URL, CLIENT_PORTAL_URL } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      
      if (response.data.token) {
        const { user, token } = response.data;
        
        if (user.role === 'admin' || user.role === 'accountant') {
          localStorage.setItem('admin_token', token);
          localStorage.setItem('admin_user', JSON.stringify(user));
          window.location.href = ADMIN_PANEL_URL;
        } else {
          localStorage.setItem('client_token', token);
          localStorage.setItem('client_user', JSON.stringify(user));
          window.location.href = CLIENT_PORTAL_URL;
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Назад
        </button>
        
        <div className="login-header">
          <h1>Вход в систему</h1>
          <p>BagHunter Logistics</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Логин</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Введите ваш логин"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Введите ваш пароль"
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Нет аккаунта?{' '}
            <span className="link" onClick={() => navigate('/register')}>
              Зарегистрироваться
            </span>
          </p>
        </div>

        <div className="demo-accounts">
          <p className="demo-title">Тестовые аккаунты:</p>
          <div className="demo-list">
            <div className="demo-item">
              <strong>Админ:</strong> admin / admin123
            </div>
            <div className="demo-item">
              <strong>Клиент:</strong> client1 / client123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
