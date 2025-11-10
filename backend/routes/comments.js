const express = require('express');
const router = express.Router();
const db = require('../config/database');

const COMMENT_PREVIEW_LIMIT = 140;

function buildCommentPreview(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  return normalized.length > COMMENT_PREVIEW_LIMIT
    ? `${normalized.slice(0, COMMENT_PREVIEW_LIMIT - 1)}…`
    : normalized;
}

async function notifyCommentParticipants({ db, invoiceId, author, comment, isInternal, io }) {
  const [[invoiceMeta]] = await db.query(
    `
      SELECT i.invoice_number, u.id AS client_user_id
      FROM invoices i
      LEFT JOIN users u ON u.client_id = i.client_id
      WHERE i.id = ?
    `,
    [invoiceId]
  );

  if (!invoiceMeta) {
    return;
  }

  const recipients = new Set();
  const [staffRows] = await db.query("SELECT id FROM users WHERE role IN ('admin', 'accountant')");

  if (author.role === 'client') {
    staffRows.forEach(({ id }) => {
      if (id !== author.id) {
        recipients.add(id);
      }
    });
  } else if (!isInternal && invoiceMeta.client_user_id && invoiceMeta.client_user_id !== author.id) {
    recipients.add(invoiceMeta.client_user_id);
  }

  if (!recipients.size) {
    return;
  }

  const preview = buildCommentPreview(comment.comment_text);
  const authorName = author.full_name || author.username || 'Пользователь';
  const notificationTitle = `💬 Комментарий по накладной №${invoiceMeta.invoice_number}`;
  const notificationMessage = preview ? `${authorName}: ${preview}` : authorName;

  for (const recipientId of recipients) {
    const [notifResult] = await db.query(
      'INSERT INTO notifications (user_id, type, title, message, invoice_id) VALUES (?, ?, ?, ?, ?)',
      [recipientId, 'comment', notificationTitle, notificationMessage, invoiceId]
    );

    if (io) {
      io.to(`user_${recipientId}`).emit('new_notification', {
        id: notifResult.insertId,
        type: 'comment',
        title: notificationTitle,
        message: notificationMessage,
        link: `/invoices/${invoiceId}`,
        invoice_id: invoiceId,
        is_read: false,
        created_at: new Date()
      });

      io.to(`user_${recipientId}`).emit('comment:new', {
        invoice_id: invoiceId,
        comment
      });
    }
  }
}

router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { userRole } = req.query;

    let query = `
      SELECT 
        c.id,
        c.invoice_id,
        c.user_id,
        c.comment_text,
        c.is_internal,
        c.created_at,
        c.updated_at,
        u.username,
        u.full_name,
        u.role,
        p.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE c.invoice_id = ?
    `;

    if (userRole === 'client') {
      query += ' AND c.is_internal = FALSE';
    }

    query += ' ORDER BY c.created_at ASC';

    const [comments] = await db.query(query, [invoiceId]);
    res.json(comments);
  } catch (error) {
    console.error('Не удалось получить комментарии:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { invoice_id, user_id, comment_text, is_internal } = req.body;

    if (!invoice_id || !user_id || !comment_text) {
      return res.status(400).json({
        error: 'Поля invoice_id, user_id и comment_text обязательны'
      });
    }

    const [authorRows] = await db.query('SELECT id, role, full_name, username FROM users WHERE id = ?', [user_id]);
    if (authorRows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const author = authorRows[0];

    if (is_internal && author.role === 'client') {
      return res.status(403).json({ error: 'Клиентам недоступны внутренние комментарии' });
    }

    const [result] = await db.query(
      'INSERT INTO comments (invoice_id, user_id, comment_text, is_internal) VALUES (?, ?, ?, ?)',
      [invoice_id, user_id, comment_text, Boolean(is_internal)]
    );

    const [newComment] = await db.query(
      `
      SELECT 
        c.id,
        c.invoice_id,
        c.user_id,
        c.comment_text,
        c.is_internal,
        c.created_at,
        c.updated_at,
        u.username,
        u.full_name,
        u.role,
        p.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE c.id = ?
    `,
      [result.insertId]
    );

    await db.query(
      'INSERT INTO invoice_logs (invoice_id, user_id, action, description) VALUES (?, ?, ?, ?)',
      [invoice_id, user_id, 'comment', `Комментарий: ${buildCommentPreview(comment_text)}`]
    );

    const io = req.app.get('io');
    await notifyCommentParticipants({
      db,
      invoiceId: invoice_id,
      author,
      comment: newComment[0],
      isInternal: Boolean(is_internal),
      io
    });

    res.status(201).json({
      message: 'Комментарий добавлен',
      comment: newComment[0]
    });
  } catch (error) {
    console.error('Не удалось добавить комментарий:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, comment_text } = req.body;

    if (!comment_text) {
      return res.status(400).json({ error: 'Текст комментария обязателен' });
    }

    const [comment] = await db.query('SELECT user_id, invoice_id FROM comments WHERE id = ?', [id]);

    if (comment.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (comment[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Изменять комментарий может только его автор' });
    }

    await db.query('UPDATE comments SET comment_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      comment_text,
      id
    ]);

    const [updatedComment] = await db.query(
      `
      SELECT 
        c.id,
        c.invoice_id,
        c.user_id,
        c.comment_text,
        c.is_internal,
        c.created_at,
        c.updated_at,
        u.username,
        u.full_name,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [id]
    );

    await db.query(
      'INSERT INTO invoice_logs (invoice_id, user_id, action, description) VALUES (?, ?, ?, ?)',
      [comment[0].invoice_id, user_id, 'comment_edit', `Комментарий обновлён: ${buildCommentPreview(comment_text)}`]
    );

    res.json({
      message: 'Комментарий обновлён',
      comment: updatedComment[0]
    });
  } catch (error) {
    console.error('Не удалось обновить комментарий:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role } = req.query;

    const [comment] = await db.query('SELECT user_id, invoice_id FROM comments WHERE id = ?', [id]);

    if (comment.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (user_role !== 'admin' && comment[0].user_id !== Number(user_id)) {
      return res.status(403).json({ error: 'Удалять комментарий может только автор или администратор' });
    }

    await db.query('DELETE FROM comments WHERE id = ?', [id]);

    await db.query(
      'INSERT INTO invoice_logs (invoice_id, user_id, action, description) VALUES (?, ?, ?, ?)',
      [comment[0].invoice_id, user_id || null, 'comment_delete', 'Комментарий удалён']
    );

    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    console.error('Не удалось удалить комментарий:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/count/all', async (req, res) => {
  try {
    const { userRole } = req.query;

    let query = `
      SELECT 
        invoice_id,
        COUNT(*) as comment_count
      FROM comments
    `;

    if (userRole === 'client') {
      query += ' WHERE is_internal = FALSE';
    }

    query += ' GROUP BY invoice_id';

    const [counts] = await db.query(query);
    res.json(counts);
  } catch (error) {
    console.error('Не удалось получить счётчики комментариев:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
