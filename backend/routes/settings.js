const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'company-logo' + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Только изображения разрешены (jpeg, jpg, png, gif)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB максимум
  fileFilter: fileFilter
});

router.post('/logo', requireRole('admin'), upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    res.json({
      message: 'Логотип успешно загружен',
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Ошибка загрузки логотипа:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/logo', (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(uploadDir);
    const logoFile = files.find(file => file.startsWith('company-logo'));

    if (logoFile) {
      res.json({
        exists: true,
        filename: logoFile,
        path: `/uploads/${logoFile}`
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.json({ exists: false });
  }
});

router.delete('/logo', requireRole('admin'), (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(uploadDir);
    const logoFile = files.find(file => file.startsWith('company-logo'));

    if (logoFile) {
      fs.unlinkSync(path.join(uploadDir, logoFile));
      res.json({ message: 'Логотип удален' });
    } else {
      res.status(404).json({ error: 'Логотип не найден' });
    }
  } catch (error) {
    console.error('Ошибка удаления логотипа:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
