const express = require('express');
const router = express.Router();
const db = require('../config/database');


router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { userId, userRole } = req.query; 

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
    console.error('Не удалось загрузить комментарии:', error);
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

    if (is_internal) {
      const [user] = await db.query('SELECT role FROM users WHERE id = ?', [user_id]);
      if (user.length === 0 || user[0].role === 'client') {
        return res.status(403).json({ 
          error: 'Создавать внутренние заметки могут только администраторы или бухгалтеры' 
        });
      }
    }

    const [result] = await db.query(
      'INSERT INTO comments (invoice_id, user_id, comment_text, is_internal) VALUES (?, ?, ?, ?)',
      [invoice_id, user_id, comment_text, is_internal || false]
    );

    const [newComment] = await db.query(`
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
    `, [result.insertId]);

    console.log(`✅ Добавлен комментарий к накладной #${invoice_id} от пользователя #${user_id}`);

    res.status(201).json({
      message: 'Комментарий успешно сохранён',
      comment: newComment[0]
    });
  } catch (error) {
    console.error('Не удалось сохранить комментарий:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, comment_text } = req.body;

    if (!comment_text) {
      return res.status(400).json({ error: 'Поле comment_text не может быть пустым' });
    }

    const [comment] = await db.query('SELECT user_id FROM comments WHERE id = ?', [id]);
    
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (comment[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Редактировать можно только собственные комментарии' });
    }

    await db.query(
      'UPDATE comments SET comment_text = ? WHERE id = ?',
      [comment_text, id]
    );

    const [updatedComment] = await db.query(`
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
    `, [id]);

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

    const [comment] = await db.query('SELECT user_id FROM comments WHERE id = ?', [id]);
    
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (user_role !== 'admin' && comment[0].user_id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления этого комментария' });
    }

    await db.query('DELETE FROM comments WHERE id = ?', [id]);

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
    console.error('Не удалось получить статистику комментариев:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
