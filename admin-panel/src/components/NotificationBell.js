import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './NotificationBell.css';
import { API_BASE_URL, SOCKET_URL } from '../config/api';

const API_URL = API_BASE_URL;

function NotificationBell({ user, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('🔌 Подключено к WebSocket');
        newSocket.emit('join_user_room', user.id);
      });

      newSocket.on('new_notification', (notification) => {
        console.log('🔔 Новое уведомление:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        playNotificationSound();
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/user/${user.id}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/user/${user.id}/unread/count`);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Ошибка загрузки количества:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка отметки прочитанным:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/user/${user.id}/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка отметки всех прочитанными:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
      
      console.log('🔊 Звук уведомления воспроизведен');
    } catch (error) {
      console.error('Ошибка воспроизведения звука:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      new_invoice: '📋',
      invoice_status: '🚚',
      payment: '💰',
      system: 'ℹ️',
      warning: '⚠️'
    };
    return icons[type] || '🔔';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.invoice_id && onNotificationClick) {
      onNotificationClick(notification.invoice_id);
      setShowDropdown(false);
    }
  };

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell-button" 
        onClick={() => setShowDropdown(!showDropdown)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Уведомления</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Прочитать все
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} ${notification.invoice_id ? 'clickable' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.created_at)}</div>
                  </div>
                  <button 
                    className="notification-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button onClick={() => setShowDropdown(false)}>Закрыть</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
