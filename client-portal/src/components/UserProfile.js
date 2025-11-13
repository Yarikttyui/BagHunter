import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ChangePassword from "./ChangePassword";
import "./UserProfile.css";
import { API_BASE_URL, ASSET_BASE_URL } from "../config/api";
import { FiUser } from "react-icons/fi";

const API_URL = API_BASE_URL;

function UserProfile({ user, onUpdate }) {
  const userId = user?.id;
  const userEmail = user?.email || "";
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    company_name: "",
    company_inn: "",
    company_address: "",
    address: "",
    city: "",
    postal_code: "",
    telegram: "",
    whatsapp: "",
    position: "",
    department: "",
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!userId) {
        throw new Error("userId is not defined");
      }
      const response = await axios.get(`${API_URL}/profiles/${userId}`);
      const data = response.data || {};
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: data.email || userEmail,
        company_name: data.company_name || "",
        company_inn: data.company_inn || "",
        company_address: data.company_address || "",
        address: data.address || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
        telegram: data.telegram || "",
        whatsapp: data.whatsapp || "",
        position: data.position || "",
        department: data.department || "",
      });
    } catch (err) {
      setError("Не удалось загрузить профиль. Попробуйте позже.");
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!userId) {
        throw new Error("userId is not defined");
      }
      await axios.put(`${API_URL}/profiles/${userId}`, formData);
      setSuccess("Профиль обновлён");
      setEditing(false);
      fetchProfile();
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const payload = new FormData();
    payload.append("avatar", file);
    setError("");
    setSuccess("");
    try {
      if (!userId) {
        throw new Error("userId is not defined");
      }
      await axios.post(`${API_URL}/profiles/${userId}/avatar`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Фото обновлено");
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось загрузить файл");
    }
  };

  if (loading) {
    return <div className="loading">Загружаем данные...</div>;
  }

  if (!profile) {
    return (
      <div className="loading">
        Не удалось загрузить профиль. Попробуйте обновить страницу.
      </div>
    );
  }

  if (showPasswordChange) {
    return (
      <ChangePassword
        userId={userId}
        onSuccess={() => setShowPasswordChange(false)}
        onCancel={() => setShowPasswordChange(false)}
      />
    );
  }

  const avatarSrc = profile.avatar
    ? `${ASSET_BASE_URL}${profile.avatar}`
    : null;

  const roleLabels = {
    admin: "Администратор",
    accountant: "Бухгалтер",
    client: "Клиент",
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar-section">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={profile.full_name || profile.username}
              className="avatar"
            />
          ) : (
            <div className="avatar-placeholder">
              <FiUser aria-hidden="true" />
            </div>
          )}
          <label className="avatar-upload-btn">
            Обновить фото
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>

        <div className="profile-info">
          <span className="role-badge">
            {roleLabels[user.role] || "Пользователь"}
          </span>
          <h2>{profile.full_name || user.username}</h2>
          <p>{profile.position || "Должность не указана"}</p>
          <div className="profile-actions">
            <button type="button" onClick={() => setShowPasswordChange(true)}>
              Сменить пароль
            </button>
            <button type="button" onClick={() => setEditing(true)}>
              Редактировать
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {!error && success && <div className="success-message">{success}</div>}

      {!editing ? (
        <div className="profile-details">
          <div className="profile-section">
            <h3>Контактные данные</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Email</span>
                <span className="value">{profile.email || user.email}</span>
              </div>
              <div className="info-item">
                <span className="label">Телефон</span>
                <span className="value">{profile.phone || "-"}</span>
              </div>
              <div className="info-item">
                <span className="label">Telegram</span>
                <span className="value">{profile.telegram || "-"}</span>
              </div>
              <div className="info-item">
                <span className="label">WhatsApp</span>
                <span className="value">{profile.whatsapp || "-"}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Компания</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Компания</span>
                <span className="value">{profile.company_name || "-"}</span>
              </div>
              <div className="info-item">
                <span className="label">ИНН</span>
                <span className="value">{profile.company_inn || "-"}</span>
              </div>
              <div className="info-item full-width">
                <span className="label">Адрес</span>
                <span className="value">{profile.company_address || "-"}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Адрес доставки</h3>
            <div className="info-grid">
              <div className="info-item full-width">
                <span className="label">Улица</span>
                <span className="value">{profile.address || "-"}</span>
              </div>
              <div className="info-item">
                <span className="label">Город</span>
                <span className="value">{profile.city || "-"}</span>
              </div>
              <div className="info-item">
                <span className="label">Индекс</span>
                <span className="value">{profile.postal_code || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-section">
            <h3>Личная информация</h3>
            <div className="form-grid">
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Полное имя"
                  required
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Телефон"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  required
                />
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleInputChange}
                  placeholder="Telegram"
                />
                <input
                  type="text"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  placeholder="Название компании"
                />
                <input
                  type="text"
                  name="company_inn"
                  value={formData.company_inn}
                  onChange={handleInputChange}
                  placeholder="ИНН"
                />
                <textarea
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleInputChange}
                  placeholder="Юридический адрес"
                  rows="2"
                  className="full-width"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Адрес доставки</h3>
              <div className="form-grid">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Улица, дом"
                />
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Город"
                />
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  placeholder="Почтовый индекс"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
        </form>
      )}
    </div>
  );
}

export default UserProfile;
