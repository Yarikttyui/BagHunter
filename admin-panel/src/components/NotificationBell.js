import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './NotificationBell.css';
import { API_BASE_URL, SOCKET_URL } from '../config/api';

const API_URL = API_BASE_URL;

const ICONS = {
  new_invoice: '\u{1F4CB}',
  invoice_status: '\u{1F69A}',
  payment: '\u{1F4B0}',
  system: '\u{1F4BB}',
  warning: '\u26A0\uFE0F'
};

const containsCyrillic = (value = '') => /[А-Яа-яЁё]/.test(value);

const extractInvoiceNumber = (value = '') => {
  const match = value.match(/№\s*([A-Z0-9\-]+)/i);
  return match ? match[1] : null;
};

const buildDisplayContent = (notification) => {
  const invoiceNumber = extractInvoiceNumber(notification.message);
  const titleHasRu = containsCyrillic(notification.title);
  const messageHasRu = containsCyrillic(notification.message);

  if (notification.type === 'new_invoice') {
    return {
      title: titleHasRu ? notification.title : 'Новая накладная ожидает проверки',
      message: messageHasRu
        ? notification.message
        : invoiceNumber
          ? `Накладная №${invoiceNumber}`
          : 'Поступила новая накладная'
    };
  }

  if (notification.type === 'invoice_status') {
    return {
      title: titleHasRu ? notification.title : 'Статус накладной обновлён',
      message: messageHasRu
        ? notification.message
        : invoiceNumber
          ? `Накладная №${invoiceNumber}: статус обновлён`
          : 'Статус накладной обновлён'
    };
  }

  return {
    title: titleHasRu ? notification.title : (notification.title || 'Уведомление'),
    message: messageHasRu ? notification.message : (notification.message || '')
  };
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (Number.isNaN(diff)) {
    return '';
  }

  if (diff < 60) return 'только что';
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} мин назад`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} ч назад`;
  }
  return date.toLocaleDateString('ru-RU');
};

const getNotificationIcon = (type) => ICONS[type] || '\u{1F514}';

function NotificationBell({ user, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchInitialData = async () => {
      await Promise.all([fetchNotifications(), fetchUnreadCount()]);
    };

    fetchInitialData();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      socket.emit('join_user_room', user.id);
    });

    socket.on('new_notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/notifications/user/${user.id}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/notifications/user/${user.id}/unread/count`);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Ошибка подсчёта уведомлений:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка изменения статуса уведомления:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await axios.put(`${API_URL}/notifications/user/${user.id}/read-all`);
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка массового обновления уведомлений:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();

      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);

      oscillator1.frequency.value = 880;
      oscillator1.type = 'sine';

      gainNode1.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.15);

      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);

      oscillator2.frequency.value = 660;
      oscillator2.type = 'sine';

      gainNode2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator2.start(audioContext.currentTime + 0.1);
      oscillator2.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Ошибка воспроизведения звука уведомления:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.invoice_id && onNotificationClick) {
      onNotificationClick(notification.invoice_id);
    }
  };

  return (
    <div className="notification-bell-container">
      <button
        type="button"
        className="notification-bell-button"
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        🔔
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span>Уведомления</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllAsRead} className="mark-read">
                Прочитать все
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 && (
              <div className="notification-empty">Новых уведомлений нет</div>
            )}

            {notifications.map((notification) => {
              const { title, message } = buildDisplayContent(notification);
              const icon = getNotificationIcon(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? '' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">{icon}</div>
                  <div className="notification-content">
                    <div className="notification-title">{title}</div>
                    {message && <div className="notification-message">{message}</div>}
                    <div className="notification-time">{formatTime(notification.created_at)}</div>
                  </div>
                  <button
                    type="button"
                    className="notification-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
