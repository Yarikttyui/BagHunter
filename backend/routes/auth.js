const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const TOKEN_EXPIRES_IN = '12h';

function buildUserResponse(dbUser) {
  if (!dbUser) {
    return null;
  }

  const {
    password,
    recovery_code,
    ...safeFields
  } = dbUser;

  return safeFields;
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

function generateRecoveryCode() {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

async function generateUniqueRecoveryCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateRecoveryCode();
    const [rows] = await db.query('SELECT id FROM users WHERE recovery_code = ?', [code]);
    if (rows.length === 0) {
      return code;
    }
  }
  throw new Error('Unable to generate unique recovery code');
}

router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      full_name,
      phone,
      company_name,
      company_inn,
      company_address
    } = req.body;

    if (company_inn && !/^\d+$/.test(company_inn)) {
      return res.status(400).json({ error: 'INN must contain digits only' });
    }

    if (!username || !email || !password || !full_name || !phone) {
      return res.status(400).json({ error: 'Username, email, password, full name and phone are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters' });
    }

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with the provided username or email already exists' });
    }

    const recoveryCode = await generateUniqueRecoveryCode();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [clientResult] = await db.query(
      `INSERT INTO clients
       (company_name, contact_person, email, phone, address, inn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [
        company_name || 'New client',
        full_name,
        email,
        phone,
        company_address || null,
        company_inn || null
      ]
    );

    const clientId = clientResult.insertId;

    const [userResult] = await db.query(
      `INSERT INTO users
       (username, email, password, recovery_code, role, full_name, phone,
        company_name, is_verified, client_id)
       VALUES (?, ?, ?, ?, 'client', ?, ?, ?, TRUE, ?)`,
      [
        username,
        email,
        hashedPassword,
        recoveryCode,
        full_name,
        phone,
        company_name || null,
        clientId
      ]
    );

    const newUserId = userResult.insertId;
    const [createdUsers] = await db.query(
      `SELECT id, username, email, role, client_id, full_name, phone,
              company_name, is_verified
       FROM users
       WHERE id = ?`,
      [newUserId]
    );

    const userRecord = buildUserResponse(createdUsers[0]);
    const token = signToken({
      id: userRecord.id,
      role: userRecord.role,
      username: userRecord.username,
      client_id: userRecord.client_id || null
    });

    res.status(201).json({
      token,
      user: userRecord,
      recoveryCode
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Client with the provided email already exists' });
    }
    res.status(500).json({ error: 'Unable to register user right now' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await db.query(
      `SELECT id, username, password, role, client_id, email, full_name, phone, is_verified
       FROM users
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Account is not verified yet' });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      username: user.username,
      client_id: user.client_id || null
    });

    res.json({
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Unable to login right now' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { recoveryCode, newPassword } = req.body;

    if (!recoveryCode || !newPassword) {
      return res.status(400).json({ error: 'Recovery code and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters' });
    }

    const [users] = await db.query(
      'SELECT id, username FROM users WHERE recovery_code = ?',
      [recoveryCode]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Recovery code not found' });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully',
      username: user.username
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Unable to reset password right now' });
  }
});

router.post('/log-activity', async (req, res) => {
  try {
    const {
      user_id,
      action_type,
      action_description,
      resource_type,
      resource_id,
      ip_address,
      user_agent
    } = req.body;

    if (!user_id || !action_type) {
      return res.status(400).json({ error: 'user_id and action_type are required' });
    }

    await db.query(
      `INSERT INTO user_activity_log
       (user_id, action_type, action_description, resource_type, resource_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, action_type, action_description, resource_type, resource_id, ip_address, user_agent]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: 'Unable to store activity record right now' });
  }
});

router.get('/activity-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Number(req.query.limit || 50);

    const [activities] = await db.query(
      `SELECT *
       FROM user_activity_log
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json(activities);
  } catch (error) {
    console.error('Activity history error:', error);
    res.status(500).json({ error: 'Unable to load activity history right now' });
  }
});

module.exports = router;
