const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/delivery/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, 'delivery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif) и PDF'));
    }
  }
});

const generateTrackingCode = async () => {
  let code;
  let exists = true;
  
  while (exists) {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    code = `TRK-${date}-${random}`;
    
    const [result] = await db.query(
      'SELECT id FROM invoices WHERE tracking_code = ?',
      [code]
    );
    exists = result.length > 0;
  }
  
  return code;
};


router.post('/generate-code/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const [invoice] = await db.query(
      'SELECT id, tracking_code FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (invoice.length === 0) {
      return res.status(404).json({ error: 'Накладная не найдена' });
    }
    
    if (invoice[0].tracking_code) {
      return res.status(400).json({ 
        error: 'У накладной уже есть tracking code',
        tracking_code: invoice[0].tracking_code
      });
    }
    
    const trackingCode = await generateTrackingCode();
    
    await db.query(
      'UPDATE invoices SET tracking_code = ? WHERE id = ?',
      [trackingCode, invoiceId]
    );
    
    res.json({
      message: 'Tracking code успешно создан',
      tracking_code: trackingCode
    });
  } catch (error) {
    console.error('Ошибка генерации tracking code:', error);
    res.status(500).json({ error: 'Ошибка генерации tracking code' });
  }
});


router.post('/status', async (req, res) => {
  try {
    const {
      invoice_id,
      status,
      location,
      comment,
      changed_by
    } = req.body;
    
    if (!invoice_id || !status) {
      return res.status(400).json({ 
        error: 'invoice_id и status обязательны' 
      });
    }
    
    const [invoice] = await db.query(
      'SELECT id FROM invoices WHERE id = ?',
      [invoice_id]
    );
    
    if (invoice.length === 0) {
      return res.status(404).json({ error: 'Накладная не найдена' });
    }
    
    await db.query(
      `INSERT INTO invoice_status_history 
       (invoice_id, status, location, comment, changed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [invoice_id, status, location, comment, changed_by]
    );
    
    await db.query(
      'UPDATE invoices SET status = ? WHERE id = ?',
      [status, invoice_id]
    );
    
    res.json({ message: 'Статус успешно обновлён' });
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

router.get('/history/:invoiceId', async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT h.*, u.username as changed_by_name
      FROM invoice_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.invoice_id = ?
      ORDER BY h.changed_at DESC
    `, [req.params.invoiceId]);
    
    res.json(history);
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});


router.get('/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params;
    
    const [invoice] = await db.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.tracking_code,
        i.status,
        i.invoice_date,
        i.delivery_date,
        c.company_name as client_name,
        c.phone as client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.tracking_code = ?
    `, [trackingCode]);
    
    if (invoice.length === 0) {
      return res.status(404).json({ error: 'Накладная с таким tracking code не найдена' });
    }
    
    const [history] = await db.query(`
      SELECT status, location, comment, changed_at
      FROM invoice_status_history
      WHERE invoice_id = ?
      ORDER BY changed_at ASC
    `, [invoice[0].id]);
    
    const [delivery] = await db.query(`
      SELECT recipient_name, recipient_position, received_at, notes
      FROM delivery_confirmations
      WHERE invoice_id = ?
    `, [invoice[0].id]);
    
    const [transport] = await db.query(`
      SELECT 
        v.vehicle_number, v.brand, v.model,
        d.full_name as driver_name, d.phone as driver_phone
      FROM invoices i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN drivers d ON i.driver_id = d.id
      WHERE i.id = ?
    `, [invoice[0].id]);
    
    res.json({
      invoice: invoice[0],
      history: history,
      delivery: delivery[0] || null,
      transport: transport[0] || null
    });
  } catch (error) {
    console.error('Ошибка публичного трекинга:', error);
    res.status(500).json({ error: 'Ошибка получения данных трекинга' });
  }
});


router.post('/confirm-delivery', upload.fields([
  { name: 'signature', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      invoice_id,
      recipient_name,
      recipient_position,
      notes
    } = req.body;
    
    if (!invoice_id || !recipient_name) {
      return res.status(400).json({ 
        error: 'invoice_id и recipient_name обязательны' 
      });
    }
    
    const [invoice] = await db.query(
      'SELECT id FROM invoices WHERE id = ?',
      [invoice_id]
    );
    
    if (invoice.length === 0) {
      return res.status(404).json({ error: 'Накладная не найдена' });
    }
    
    const [existing] = await db.query(
      'SELECT id FROM delivery_confirmations WHERE invoice_id = ?',
      [invoice_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Доставка уже подтверждена для этой накладной' 
      });
    }
    
    const signature_image = req.files['signature'] 
      ? '/uploads/delivery/' + req.files['signature'][0].filename 
      : null;
      
    const photo_image = req.files['photo'] 
      ? '/uploads/delivery/' + req.files['photo'][0].filename 
      : null;
    
    await db.query(
      `INSERT INTO delivery_confirmations 
       (invoice_id, recipient_name, recipient_position, signature_image, photo_image, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoice_id, recipient_name, recipient_position, signature_image, photo_image, notes]
    );
    
    await db.query(
      'UPDATE invoices SET status = ? WHERE id = ?',
      ['delivered', invoice_id]
    );
    
    await db.query(
      `INSERT INTO invoice_status_history 
       (invoice_id, status, comment) 
       VALUES (?, ?, ?)`,
      [invoice_id, 'delivered', `Доставлено. Получил: ${recipient_name}`]
    );
    
    res.json({ 
      message: 'Доставка успешно подтверждена',
      signature_image,
      photo_image
    });
  } catch (error) {
    console.error('Ошибка подтверждения доставки:', error);
    res.status(500).json({ error: 'Ошибка подтверждения доставки' });
  }
});

router.get('/confirmation/:invoiceId', async (req, res) => {
  try {
    const [confirmation] = await db.query(`
      SELECT dc.*
      FROM delivery_confirmations dc
      WHERE dc.invoice_id = ?
    `, [req.params.invoiceId]);
    
    if (confirmation.length === 0) {
      return res.status(404).json({ error: 'Подтверждение доставки не найдено' });
    }
    
    res.json(confirmation[0]);
  } catch (error) {
    console.error('Ошибка получения подтверждения:', error);
    res.status(500).json({ error: 'Ошибка получения подтверждения' });
  }
});


router.get('/stats/by-status', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM invoices
      WHERE tracking_code IS NOT NULL
      GROUP BY status
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

module.exports = router;
