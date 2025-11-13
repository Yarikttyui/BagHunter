import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ActivityLog.css';
import { API_BASE_URL } from '../config/api';
import {
  FiLogIn,
  FiLogOut,
  FiPlusCircle,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiDownload,
  FiUpload,
  FiShare2,
  FiInbox,
  FiFileText,
  FiUser,
  FiDollarSign,
  FiBarChart2,
  FiUsers,
  FiMessageCircle,
  FiBell,
  FiPackage,
  FiClipboard
} from 'react-icons/fi';

const API_URL = API_BASE_URL;

function ActivityLog({ userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [filter, setFilter] = useState('all');

  const fetchActivities = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/auth/activity-history/${userId}?limit=${limit}`
      );
      setActivities(response.data);
    } catch (error) {
      console.error('Ошибка загрузки истории активности:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [userId, limit]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ACTION_ICONS = {
    login: FiLogIn,
    logout: FiLogOut,
    create: FiPlusCircle,
    update: FiEdit3,
    delete: FiTrash2,
    view: FiEye,
    download: FiDownload,
    upload: FiUpload,
    export: FiShare2,
    import: FiInbox
  };

  const RESOURCE_ICONS = {
    invoice: FiFileText,
    client: FiUser,
    transaction: FiDollarSign,
    report: FiBarChart2,
    user: FiUsers,
    profile: FiUser,
    comment: FiMessageCircle,
    notification: FiBell
  };

  const getActionIcon = (type) => ACTION_ICONS[type] || FiPackage;
  const getResourceIcon = (type) => RESOURCE_ICONS[type] || FiPackage;

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(activity => activity.action_type === filter);

  const uniqueActionTypes = [...new Set(activities.map(a => a.action_type))];

  if (loading) {
    return <div className="loading">Загрузка истории активности...</div>;
  }

  return (
    <div className="activity-log">
      <div className="activity-header">
        <h2>
          <FiClipboard className="inline-icon" aria-hidden="true" />
          История активности
        </h2>
        <div className="activity-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Все действия</option>
            {uniqueActionTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value="25">25 записей</option>
            <option value="50">50 записей</option>
            <option value="100">100 записей</option>
            <option value="200">200 записей</option>
          </select>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="empty-state">
          <p>История активности пуста</p>
        </div>
      ) : (
        <div className="activity-list">
          {filteredActivities.map((activity, index) => (
            <div key={activity.id || index} className="activity-item">
              <div className="activity-icon">
                {React.createElement(getActionIcon(activity.action_type), {
                  'aria-hidden': true
                })}
              </div>
              <div className="activity-content">
                <div className="activity-main">
                  <span className="action-type">{activity.action_type}</span>
                  {activity.resource_type && (
                    <span className="resource-type">
                      {React.createElement(getResourceIcon(activity.resource_type), {
                        'aria-hidden': true,
                        className: 'inline-icon'
                      })}
                      {activity.resource_type}
                      {activity.resource_id && ` #${activity.resource_id}`}
                    </span>
                  )}
                </div>
                {activity.action_description && (
                  <div className="activity-description">
                    {activity.action_description}
                  </div>
                )}
                <div className="activity-meta">
                  <span className="activity-date">{formatDate(activity.created_at)}</span>
                  {activity.ip_address && (
                    <span className="activity-ip">IP: {activity.ip_address}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="activity-footer">
        <p>Показано: {filteredActivities.length} из {activities.length} записей</p>
      </div>
    </div>
  );
}

export default ActivityLog;
