const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.client_id,
              u.is_verified, u.created_at, p.avatar
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id`
    );
    res.json(rows);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      full_name,
      phone,
      role = 'client',
      client_id = null
    } = req.body;

    if (!username || !password || !email || !full_name) {
      return res.status(400).json({ error: 'Username, password, email and full name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (username, password, email, full_name, phone, role, is_verified, client_id)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [username, hashedPassword, email, full_name, phone, role, client_id]
    );

    res.status(201).json({ id: result.insertId, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      full_name,
      phone,
      role,
      is_verified,
      client_id
    } = req.body;

    await db.query(
      `UPDATE users
       SET email = ?, full_name = ?, phone = ?, role = ?, is_verified = ?, client_id = ?
       WHERE id = ?`,
      [email, full_name, phone, role, is_verified, client_id, id]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
