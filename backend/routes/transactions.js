const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, i.invoice_number 
      FROM transactions t 
      LEFT JOIN invoices i ON t.invoice_id = i.id 
      ORDER BY t.transaction_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Транзакция не найдена' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { invoice_id, transaction_type, amount, transaction_date, payment_method, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO transactions (invoice_id, transaction_type, amount, transaction_date, payment_method, description) VALUES (?, ?, ?, ?, ?, ?)',
      [invoice_id || null, transaction_type, amount, transaction_date, payment_method, description]
    );
    res.status(201).json({ id: result.insertId, message: 'Транзакция создана' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Транзакция удалена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
