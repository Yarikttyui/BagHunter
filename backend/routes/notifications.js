const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/user/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:userId/unread', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:userId/unread/count', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.params.userId]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Уведомление прочитано' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/user/:userId/read-all', async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.params.userId]
    );
    res.json({ message: 'Все уведомления прочитаны' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, type, title, message, invoice_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, type, title, message, invoice_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, type, title, message, invoice_id || null]
    );
    
    const notification = {
      id: result.insertId,
      user_id,
      type,
      title,
      message,
      link,
      is_read: false,
      created_at: new Date()
    };
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user_id}`).emit('new_notification', notification);
    }
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Уведомление создано',
      notification 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/user/:userId/clear-read', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE',
      [req.params.userId]
    );
    res.json({ message: 'Прочитанные уведомления удалены' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
