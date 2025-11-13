import React, { useState } from "react";
import axios from "axios";
import "./ChangePassword.css";
import { API_BASE_URL } from "../config/api";
import {
  FiLock,
  FiKey,
  FiLoader,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

const API_URL = API_BASE_URL;

function ChangePassword({ userId, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.newPassword.length < 6) {
      setError("Новый пароль должен содержать минимум 6 символов");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("Новый пароль должен отличаться от текущего");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/profiles/${userId}/change-password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setSuccess("Пароль успешно изменён!");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка изменения пароля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <h2>
            <FiLock className="inline-icon" aria-hidden="true" />
            Смена пароля
          </h2>
          <p>Обновите учётные данные, чтобы обезопасить доступ к порталу</p>
        </div>

        {error && (
          <div className="error-message">
            <FiAlertTriangle className="inline-icon" aria-hidden="true" />
            {error}
          </div>
        )}
        {success && (
          <div className="success-message">
            <FiCheckCircle className="inline-icon" aria-hidden="true" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label>Текущий пароль</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Введите текущий пароль"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label>Новый пароль</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Введите новый пароль (минимум 6 символов)"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label>Подтверждение пароля</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Повторите новый пароль"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="password-requirements">
            <p>Требования к паролю:</p>
            <ul>
              <li className={formData.newPassword.length >= 6 ? "valid" : ""}>
                Минимум 6 символов
              </li>
              <li
                className={
                  formData.newPassword &&
                  formData.newPassword === formData.confirmPassword
                    ? "valid"
                    : ""
                }
              >
                Пароли совпадают
              </li>
            </ul>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <FiLoader className="inline-icon spin" aria-hidden="true" />
                  Изменение...
                </>
              ) : (
                <>
                  <FiKey className="inline-icon" aria-hidden="true" />
                  Изменить пароль
                </>
              )}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
