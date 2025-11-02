const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены (jpeg, jpg, png, gif)'));
    }
  }
});


router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await db.query(
      `SELECT 
        u.id, u.username, u.email, u.full_name, u.phone, u.role,
        u.company_name, u.avatar as user_avatar, u.last_login, u.created_at,
        p.avatar, p.telegram, p.whatsapp, 
        p.company_inn, p.company_address,
        p.updated_at
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(users[0]);

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      full_name,
      phone,
      email,
      company_name,
      telegram,
      whatsapp,
      company_inn,
      company_address
    } = req.body;

    await db.query(
      `UPDATE users 
       SET full_name = ?, phone = ?, email = ?, company_name = ?
       WHERE id = ?`,
      [full_name, phone, email, company_name, userId]
    );

    const [existingProfile] = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingProfile.length === 0) {
      await db.query(
        `INSERT INTO user_profiles 
         (user_id, full_name, phone, email, company_name, company_inn, company_address, telegram, whatsapp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, full_name, phone, email, company_name, company_inn, company_address, telegram, whatsapp]
      );
    } else {
      await db.query(
        `UPDATE user_profiles 
         SET full_name = ?, phone = ?, email = ?, company_name = ?, 
             company_inn = ?, company_address = ?, telegram = ?, whatsapp = ?
         WHERE user_id = ?`,
        [full_name, phone, email, company_name, company_inn, company_address, telegram, whatsapp, userId]
      );
    }

    console.log(`✅ Профиль пользователя #${userId} обновлён`);

    res.json({
      success: true,
      message: 'Профиль успешно обновлён'
    });

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    const [existingProfile] = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingProfile.length === 0) {
      await db.query(
        'INSERT INTO user_profiles (user_id, avatar) VALUES (?, ?)',
        [userId, avatarPath]
      );
    } else {
      await db.query(
        'UPDATE user_profiles SET avatar = ? WHERE user_id = ?',
        [avatarPath, userId]
      );
    }

    console.log(`✅ Аватар загружен для пользователя #${userId}: ${avatarPath}`);

    res.json({
      success: true,
      message: 'Аватар успешно загружен',
      avatarUrl: avatarPath
    });

  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/:userId/change-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Оба пароля обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
    }

    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    console.log(`✅ Пароль изменён для пользователя #${userId}`);

    res.json({
      success: true,
      message: 'Пароль успешно изменён'
    });

  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:userId/activity-stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const [invoiceStats] = await db.query(`
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM invoice_logs
      WHERE user_id = ?
      GROUP BY action
      ORDER BY count DESC
    `, [userId]);

    const [totalCount] = await db.query(
      'SELECT COUNT(*) as total FROM invoice_logs WHERE user_id = ?',
      [userId]
    );

    res.json({
      total: totalCount[0]?.total || 0,
      byType: invoiceStats
    });

  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
