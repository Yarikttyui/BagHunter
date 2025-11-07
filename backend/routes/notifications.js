const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

const STAFF_ROLES = new Set(['admin', 'accountant']);

function canManageUserNotifications(req, userId) {
  if (!req.user) {
    return false;
  }
  if (STAFF_ROLES.has(req.user.role)) {
    return true;
  }
  return Number(userId) === req.user.id;
}

function ensureUserScope(req, res, userId) {
  if (!canManageUserNotifications(req, userId)) {
    res.status(403).json({ error: 'Недостаточно прав для доступа к уведомлениям пользователя' });
    return false;
  }
  return true;
}

async function ensureNotificationOwnership(req, res, notificationId) {
  const [[notification]] = await db.query(
    'SELECT user_id FROM notifications WHERE id = ?',
    [notificationId]
  );

  if (!notification) {
    res.status(404).json({ error: 'Уведомление не найдено' });
    return null;
  }

  if (!canManageUserNotifications(req, notification.user_id)) {
    res.status(403).json({ error: 'Недостаточно прав для изменения уведомления' });
    return null;
  }

  return notification;
}

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) {
      return;
    }

    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    res.status(500).json({ error: 'Не удалось загрузить уведомления' });
  }
});

router.get('/user/:userId/unread', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) {
      return;
    }

    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Ошибка получения списка непрочитанных уведомлений:', error);
    res.status(500).json({ error: 'Не удалось загрузить непрочитанные уведомления' });
  }
});

router.get('/user/:userId/unread/count', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) {
      return;
    }

    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Ошибка подсчёта непрочитанных уведомлений:', error);
    res.status(500).json({ error: 'Не удалось получить количество непрочитанных уведомлений' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notification = await ensureNotificationOwnership(req, res, req.params.id);
    if (!notification) {
      return;
    }

    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Уведомление успешно отмечено как прочитанное' });
  } catch (error) {
    console.error('Ошибка обновления статуса уведомления:', error);
    res.status(500).json({ error: 'Не удалось отметить уведомление' });
  }
});

router.put('/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) {
      return;
    }

    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    res.json({ message: 'Все уведомления успешно помечены прочитанными' });
  } catch (error) {
    console.error('Ошибка массового обновления уведомлений:', error);
    res.status(500).json({ error: 'Не удалось отметить уведомления' });
  }
});

router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { user_id, type, title, message, invoice_id, link } = req.body;
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, type, title, message, invoice_id, link) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, type, title, message, invoice_id || null, link || null]
    );

    const notification = {
      id: result.insertId,
      user_id,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
      created_at: new Date()
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user_id}`).emit('new_notification', notification);
    }

    res.status(201).json({
      id: result.insertId,
      message: 'Уведомление отправлено',
      notification
    });
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
    res.status(500).json({ error: 'Не удалось отправить уведомление' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const notification = await ensureNotificationOwnership(req, res, req.params.id);
    if (!notification) {
      return;
    }

    await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error('Ошибка удаления уведомления:', error);
    res.status(500).json({ error: 'Не удалось удалить уведомление' });
  }
});

router.delete('/user/:userId/clear-read', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureUserScope(req, res, userId)) {
      return;
    }

    await db.query('DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE', [userId]);
    res.json({ message: 'Прочитанные уведомления очищены' });
  } catch (error) {
    console.error('Ошибка очистки уведомлений:', error);
    res.status(500).json({ error: 'Не удалось очистить уведомления' });
  }
});

module.exports = router;
