import React, { useState } from "react";
import axios from "axios";
import "./Register.css";
import {
  FiShield,
  FiPenTool,
  FiUser,
  FiBriefcase,
  FiKey,
  FiCopy,
} from "react-icons/fi";
import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;

const INITIAL_FORM = {
  full_name: "",
  phone: "",
  email: "",
  company_name: "",
  company_inn: "",
  company_address: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;
    if (name === "company_inn") {
      nextValue = value.replace(/\D/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен содержать не менее 6 символов.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        company_name: formData.company_name,
        company_inn: formData.company_inn,
        company_address: formData.company_address,
      });

      setRecoveryCode(response.data.recoveryCode);
      setShowRecoveryCode(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Не удалось завершить регистрацию.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recoveryCode);
  };

  const handleGoToLogin = () => {
    onSwitchToLogin();
    setShowRecoveryCode(false);
    setFormData(INITIAL_FORM);
  };

  if (showRecoveryCode) {
    return (
      <div className="register-screen">
        <div className="register-backdrop" />
        <div className="register-wrapper">
          <div className="register-card recovery-card">
            <div className="register-card__header">
              <div
                className="register-card__icon recovery-card__icon"
                aria-hidden="true"
              >
                <FiShield />
              </div>
              <div>
                <h1 className="register-card__title">Резервный код сохранён</h1>
                <p className="register-card__subtitle">
                  Скопируйте и сохраните код — он потребуется для восстановления
                  доступа к порталу.
                </p>
              </div>
            </div>

            <div className="recovery-code">
              <span className="recovery-code__label">Ваш код</span>
              <span className="recovery-code__value">{recoveryCode}</span>
              <button
                type="button"
                className="register-button"
                onClick={handleCopyCode}
              >
                <FiCopy className="inline-icon" aria-hidden="true" />
                Скопировать в буфер
              </button>
            </div>

            <div className="register-hint">
              <p>• Никому не передавайте резервный код.</p>
              <p>• Лучше всего хранить его в менеджере паролей.</p>
              <p>
                • Без этого кода восстановление доступа может занять больше
                времени.
              </p>
            </div>

            <button
              type="button"
              className="register-button register-button--secondary"
              onClick={handleGoToLogin}
            >
              Вернуться ко входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-screen">
      <div className="register-backdrop" />
      <div className="register-wrapper">
        <div className="register-card">
          <header className="register-card__header">
            <div className="register-card__icon" aria-hidden="true">
              <FiPenTool />
            </div>
            <div>
              <h1 className="register-card__title">Регистрация клиента</h1>
              <p className="register-card__subtitle">
                Подключитесь к порталу, чтобы отслеживать накладные и
                обмениваться документами в один клик.
              </p>
            </div>
          </header>

          {error && (
            <div className="register-alert register-alert--error">{error}</div>
          )}

          <form className="register-form" onSubmit={handleSubmit}>
            <section className="register-section">
              <div className="register-section__header">
                <span className="register-section__icon" aria-hidden="true">
                  <FiUser />
                </span>
                <div>
                  <h2>Контактные данные</h2>
                  <p>
                    Мы будем использовать их для уведомлений и быстрой связи.
                  </p>
                </div>
              </div>

              <div className="field-grid">
                <label className="form-field">
                  <span>ФИО *</span>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Номер телефона *</span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 123-45-67"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Email *</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.ru"
                    required
                  />
                </label>
              </div>
            </section>

            <section className="register-section">
              <div className="register-section__header">
                <span className="register-section__icon" aria-hidden="true">
                  <FiBriefcase />
                </span>
                <div>
                  <h2>Компания</h2>
                  <p>
                    Информация для выставления документов и работы бухгалтерии.
                  </p>
                </div>
              </div>

              <div className="field-grid field-grid--two">
                <label className="form-field">
                  <span>Название компании</span>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="ООО «Логистик Про»"
                  />
                </label>

                <label className="form-field">
                  <span>ИНН</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    name="company_inn"
                    value={formData.company_inn}
                    onChange={handleChange}
                    placeholder="7701234567"
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Юридический адрес</span>
                <textarea
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="г. Москва, ул. Примерная, д. 1"
                />
              </label>
            </section>

            <section className="register-section">
              <div className="register-section__header">
                <span className="register-section__icon" aria-hidden="true">
                  <FiKey />
                </span>
                <div>
                  <h2>Данные для входа</h2>
                  <p>Придумайте логин и надёжный пароль.</p>
                </div>
              </div>

              <div className="field-grid field-grid--two">
                <label className="form-field">
                  <span>Логин *</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="client001"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Пароль *</span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    placeholder="Не менее 6 символов"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Подтверждение пароля *</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Введите пароль ещё раз"
                    required
                  />
                </label>
              </div>
            </section>

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? "Регистрация..." : "Завершить регистрацию"}
            </button>
          </form>

          <footer className="register-footer">
            <span>Уже есть аккаунт?</span>
            <button type="button" onClick={onSwitchToLogin}>
              Войти
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Register;
