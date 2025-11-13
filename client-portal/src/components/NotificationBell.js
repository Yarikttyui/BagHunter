import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "./NotificationBell.css";
import { API_BASE_URL, SOCKET_URL } from "../config/api";
import {
  FiBell,
  FiFileText,
  FiTruck,
  FiDollarSign,
  FiCpu,
  FiAlertTriangle,
  FiMessageCircle,
  FiX,
} from "react-icons/fi";

const API_URL = API_BASE_URL;

const ICONS = {
  new_invoice: FiFileText,
  invoice_status: FiTruck,
  invoice_update: FiFileText,
  payment: FiDollarSign,
  comment: FiMessageCircle,
  system: FiCpu,
  warning: FiAlertTriangle,
};

const ICON_ACCENTS = {
  new_invoice: "#3b82f6",
  invoice_status: "#6366f1",
  invoice_update: "#8b5cf6",
  payment: "#22c55e",
  comment: "#f97316",
  warning: "#f59e0b",
  system: "#0ea5e9",
};

const getIconStyles = (type) => {
  const color = ICON_ACCENTS[type] || "#667eea";
  return {
    color,
    backgroundColor: `${color}20`,
  };
};

const containsCyrillic = (value = "") => /[А-Яа-яЁё]/.test(value);

const extractInvoiceNumber = (value = "") => {
  const match = value.match(/(?:№|N|#)?\s*([A-Z0-9-]{3,})/i);
  return match ? match[1] : null;
};

const buildDisplayContent = (notification) => {
  const invoiceNumber = extractInvoiceNumber(notification.message);
  const titleHasRu = containsCyrillic(notification.title);
  const messageHasRu = containsCyrillic(notification.message);

  if (notification.type === "new_invoice") {
    return {
      title: titleHasRu ? notification.title : "Создана новая накладная",
      message: messageHasRu
        ? notification.message
        : invoiceNumber
          ? `Накладная №${invoiceNumber} готова к проверке`
          : "Проверьте список накладных",
    };
  }

  if (notification.type === "invoice_status") {
    return {
      title: titleHasRu ? notification.title : "Статус накладной обновлён",
      message: messageHasRu
        ? notification.message
        : invoiceNumber
          ? `Накладная №${invoiceNumber}: статус обновлён`
          : "Проверьте карточку накладной",
    };
  }

  if (notification.type === "invoice_update") {
    return {
      title: titleHasRu ? notification.title : "Накладная обновлена",
      message: messageHasRu
        ? notification.message
        : invoiceNumber
          ? `Накладная №${invoiceNumber} обновлена администратором`
          : "Данные накладной обновлены администратором",
    };
  }

  return {
    title: titleHasRu
      ? notification.title
      : notification.title || "Системное уведомление",
    message: messageHasRu
      ? notification.message
      : invoiceNumber
        ? `Накладная №${invoiceNumber}`
        : "Текст уведомления недоступен",
  };
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (Number.isNaN(diff)) {
    return "";
  }

  if (diff < 60) return "Только что";
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} мин назад`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} ч назад`;
  }
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getNotificationIcon = (type) => ICONS[type] || FiBell;

function NotificationBell({ user, onNotificationClick }) {
  const userId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get(
        `${API_URL}/notifications/user/${userId}`,
      );
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Ошибка загрузки уведомлений:", error);
    }
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get(
        `${API_URL}/notifications/user/${userId}/unread-count`,
      );
      setUnreadCount(response.data?.count || 0);
    } catch (error) {
      console.error("Ошибка загрузки счётчика уведомлений:", error);
    }
  }, [userId]);

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();

      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);

      oscillator1.frequency.value = 880;
      oscillator1.type = "sine";

      gainNode1.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.15,
      );

      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.15);

      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);

      oscillator2.frequency.value = 660;
      oscillator2.type = "sine";

      gainNode2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode2.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3,
      );

      oscillator2.start(audioContext.currentTime + 0.1);
      oscillator2.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error("Ошибка воспроизведения звука уведомлений:", error);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchInitialData = async () => {
      await Promise.all([fetchNotifications(), fetchUnreadCount()]);
    };

    fetchInitialData();

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      socket.emit("join_user_room", userId);
    });

    socket.on("new_notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, fetchNotifications, fetchUnreadCount, playNotificationSound]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error("Ошибка при отметке уведомления прочитанным:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Ошибка при массовой отметке уведомлений:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId),
      );
    } catch (error) {
      console.error("Ошибка при удалении уведомления:", error);
    }
  };

  return (
    <div className="notification-bell-container">
      <button
        type="button"
        className="notification-bell-button"
        onClick={() => setShowDropdown((prev) => !prev)}
        aria-label="Открыть уведомления"
      >
        <FiBell aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label="Непрочитанные уведомления">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown" role="dialog" aria-label="Список уведомлений">
          <div className="notification-header">
            <span>Уведомления</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="mark-all-read"
              >
                Отметить все
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 && (
              <div className="notification-empty">Уведомлений пока нет</div>
            )}

            {notifications.map((notification) => {
              const { title, message } = buildDisplayContent(notification);
              const IconComponent = getNotificationIcon(notification.type);
              const iconStyles = getIconStyles(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? "" : "unread"}`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    if (notification.invoice_id && onNotificationClick) {
                      onNotificationClick(notification.invoice_id);
                    }
                    setShowDropdown(false);
                  }}
                >
                  <div className="notification-icon" aria-hidden="true" style={iconStyles}>
                    <IconComponent />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{title}</div>
                    {message && (
                      <div className="notification-message">{message}</div>
                    )}
                    <div className="notification-time">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="notification-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    aria-label="Удалить уведомление"
                  >
                    <FiX aria-hidden="true" />
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
