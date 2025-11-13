import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiMessageCircle, FiLock, FiSend, FiTrash2, FiLoader } from 'react-icons/fi';
import './Comments.css';
import { API_BASE_URL, ASSET_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

function AdminComments({ invoiceId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = async () => {
    if (!user?.id) {
      console.error('User not provided to AdminComments component');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/comments/invoice/${invoiceId}?userId=${user.id}&userRole=${user.role}`
      );
      setComments(response.data);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
      setError('Не удалось загрузить комментарии');
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!newComment.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/comments`, {
        invoice_id: invoiceId,
        user_id: user.id,
        comment_text: newComment,
        is_internal: isInternal
      });

      setNewComment('');
      setIsInternal(false);
      fetchComments();
    } catch (err) {
      console.error('Ошибка отправки комментария:', err);
      setError(err.response?.data?.error || 'Не удалось добавить комментарий');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Удалить комментарий?')) return;

    try {
      await axios.delete(
        `${API_URL}/comments/${commentId}?user_id=${user.id}&user_role=${user.role}`
      );
      fetchComments();
    } catch (err) {
      console.error('Ошибка удаления комментария:', err);
      alert(err.response?.data?.error || 'Не удалось удалить комментарий');
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className="comments-section">
      <h3 className="section-title comments-title">
        <FiMessageCircle className="inline-icon" aria-hidden="true" />
        Комментарии и заметки
      </h3>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="comment-form admin-comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            isInternal
              ? 'Внутренняя заметка (видно только админам и бухгалтерам)...'
              : 'Добавьте комментарий для клиента...'
          }
          rows="3"
          disabled={loading}
        />

        <div className="form-actions">
          <label className="internal-checkbox">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
            />
            <span>
              <FiLock className="inline-icon" aria-hidden="true" />
              Внутренняя заметка (видно только админам/бухгалтерам)
            </span>
          </label>

          <button
            type="submit"
            className={`comment-submit-btn${isInternal ? ' comment-submit-btn--internal' : ''}`}
            disabled={loading || !newComment.trim()}
          >
            {loading ? (
              <>
                <FiLoader className="inline-icon spin" aria-hidden="true" />
                Отправка...
              </>
            ) : (
              <>
                <FiSend className="inline-icon" aria-hidden="true" />
                {isInternal ? 'Сохранить заметку' : 'Отправить'}
              </>
            )}
          </button>
        </div>
      </form>

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">Комментариев пока нет</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${comment.is_internal ? 'internal-note' : ''}`}
            >
              {comment.is_internal && (
                <div className="internal-badge">
                  <FiLock className="inline-icon" aria-hidden="true" />
                  Внутренняя заметка
                </div>
              )}

              <div className="comment-header">
                <div className="comment-author">
                  <div className="author-avatar">
                    {comment.avatar ? (
                      <img
                        src={`${ASSET_BASE_URL}${comment.avatar}`}
                        alt={comment.full_name || comment.username}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {(comment.full_name || comment.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="author-info">
                    <span className="author-name">{comment.full_name || comment.username}</span>
                    <span className={`author-role role-badge role-${comment.role}`}>
                      {comment.role === 'admin'
                        ? 'Администратор'
                        : comment.role === 'accountant'
                        ? 'Бухгалтер'
                        : 'Клиент'}
                    </span>
                  </div>
                </div>
                <div className="comment-meta">
                  <span className="comment-date">{formatDate(comment.created_at)}</span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="comment-edited">(обновлено)</span>
                  )}
                  {(comment.user_id === user.id || user.role === 'admin') && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleDelete(comment.id)}
                      title="Удалить комментарий"
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <div className="comment-text">{comment.comment_text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminComments;
