import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChangePassword from './ChangePassword';
import './UserProfile.css';
import { API_BASE_URL, ASSET_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

function UserProfile({ user, onUpdate }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    company_name: '',
    company_inn: '',
    company_address: '',
    bio: '',
    address: '',
    city: '',
    country: 'Россия',
    postal_code: '',
    telegram: '',
    whatsapp: '',
    position: '',
    department: ''
  });

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/profiles/${user.id}`);
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        company_name: response.data.company_name || '',
        company_inn: response.data.company_inn || '',
        address: response.data.address || '',
        city: response.data.city || '',
        postal_code: response.data.postal_code || '',
        telegram: response.data.telegram || '',
        whatsapp: response.data.whatsapp || '',
        position: response.data.position || '',
        department: response.data.department || ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      setError('Не удалось загрузить данные профиля');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(`${API_URL}/profiles/${user.id}`, formData);
      setSuccess('Профиль успешно обновлён!');
      setEditing(false);
      fetchProfile();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await axios.post(
        `${API_URL}/profiles/${user.id}/avatar`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setSuccess('Аватар успешно загружен!');
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки аватара');
    }
  };

  const handleToggle2FA = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/toggle-2fa`, {
        user_id: user.id,
        enable: !twoFactorEnabled
      });
      setTwoFactorEnabled(!twoFactorEnabled);
      setSuccess(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка настройки 2FA');
    }
  };

  if (!profile) {
    return <div className="loading">Загрузка профиля...</div>;
  }

  if (showPasswordChange) {
    return (
      <ChangePassword 
        userId={user.id}
        onCancel={() => setShowPasswordChange(false)}
        onSuccess={() => {
          setShowPasswordChange(false);
          setSuccess('Пароль успешно изменён!');
        }}
      />
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar-section">
          {profile.avatar ? (
            <img src={`${ASSET_BASE_URL}${profile.avatar}`} alt="Avatar" className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              {profile.full_name ? profile.full_name[0].toUpperCase() : '👤'}
            </div>
          )}
          <label className="avatar-upload-btn">
            Изменить фото
            <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
          </label>
        </div>

        <div className="profile-info">
          <h2>{profile.full_name}</h2>
          <p className={`role-badge role-${profile.role}`}>{
            profile.role === 'admin' ? 'Администратор' :
            profile.role === 'accountant' ? 'Бухгалтер' : 'Клиент'
          }</p>
          <p className="username">@{profile.username}</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="profile-body">
        {!editing ? (
          <>
            <div className="profile-section">
              <h3>Контактная информация</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Email:</span>
                  <span className="value">{profile.email}</span>
                </div>
                <div className="info-item">
                  <span className="label">Телефон:</span>
                  <span className="value">{profile.phone}</span>
                </div>
                <div className="info-item">
                  <span className="label">Telegram:</span>
                  <span className="value">{profile.telegram || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="label">WhatsApp:</span>
                  <span className="value">{profile.whatsapp || '—'}</span>
                </div>
              </div>
            </div>

            {profile.company_name && (
              <div className="profile-section">
                <h3>Информация о компании</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Название:</span>
                    <span className="value">{profile.company_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">ИНН:</span>
                    <span className="value">{profile.company_inn}</span>
                  </div>
                  <div className="info-item full-width">
                    <span className="label">Адрес:</span>
                    <span className="value">{profile.company_address}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="profile-section">
              <h3>Безопасность</h3>
              
              <button 
                className="password-change-btn" 
                onClick={() => setShowPasswordChange(true)}
              >
                Изменить пароль
              </button>
            </div>

            <button className="edit-btn" onClick={() => setEditing(true)}>
              Редактировать профиль
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-section">
              <h3>Личные данные</h3>
              <div className="form-grid">
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="ФИО"
                  required
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Телефон"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  placeholder="Telegram"
                />
                <input
                  type="text"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="WhatsApp"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Компания</h3>
              <div className="form-grid">
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Название компании"
                />
                <input
                  type="text"
                  name="company_inn"
                  value={formData.company_inn}
                  onChange={handleChange}
                  placeholder="ИНН"
                />
                <textarea
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleChange}
                  placeholder="Адрес компании"
                  rows="2"
                  className="full-width"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
