import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./Comments.css";
import { API_BASE_URL, ASSET_BASE_URL } from "../config/api";
import { FiMessageCircle, FiSend, FiLoader, FiTrash2 } from "react-icons/fi";

const API_URL = API_BASE_URL;

function Comments({ invoiceId, user }) {
  const userId = user?.id;
  const userRole = user?.role;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchComments = useCallback(async () => {
    if (!userId) {
      console.error("User not provided to Comments component");
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/comments/invoice/${invoiceId}?userId=${userId}&userRole=${userRole}`,
      );
      setComments(response.data || []);
    } catch (err) {
      console.error("Ошибка загрузки комментариев:", err);
      setError("Не удалось загрузить комментарии");
    }
  }, [invoiceId, userId, userRole]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) {
      setError("Комментарий не может быть пустым");
      return;
    }

    setLoading(true);
    setError("");
    if (!userId) {
      setError("Пользователь не найден");
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/comments`, {
        invoice_id: invoiceId,
        user_id: userId,
        comment_text: newComment,
        is_internal: false,
      });

      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error("Ошибка отправки комментария:", err);
      setError(err.response?.data?.error || "Не удалось отправить комментарий");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Удалить комментарий?")) return;

    try {
      await axios.delete(
        `${API_URL}/comments/${commentId}?user_id=${userId}&user_role=${userRole}`,
      );
      fetchComments();
    } catch (err) {
      console.error("Ошибка удаления комментария:", err);
      alert(err.response?.data?.error || "Не удалось удалить комментарий");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="comments-section">
      <h3 className="section-title comments-title">
        <FiMessageCircle className="inline-icon" aria-hidden="true" />
        Комментарии
      </h3>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Введите комментарий..."
          rows="3"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newComment.trim()}>
          {loading ? (
            <>
              <FiLoader className="inline-icon spin" aria-hidden="true" />
              Отправляем...
            </>
          ) : (
            <>
              <FiSend className="inline-icon" aria-hidden="true" />
              Отправить
            </>
          )}
        </button>
      </form>

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">Комментариев пока нет. Будьте первым!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
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
                        {(comment.full_name || comment.username)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="author-info">
                    <span className="author-name">
                      {comment.full_name || comment.username}
                    </span>
                    <span
                      className={`author-role role-badge role-${comment.role}`}
                    >
                      {comment.role === "admin"
                        ? "Администратор"
                        : comment.role === "accountant"
                          ? "Бухгалтер"
                          : "Клиент"}
                    </span>
                  </div>
                </div>
                <div className="comment-meta">
                  <span className="comment-date">
                    {formatDate(comment.created_at)}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="comment-edited">(ред.)</span>
                  )}
                  {comment.user_id === user.id && (
                    <button
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

export default Comments;
