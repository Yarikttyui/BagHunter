const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');
const {
  getPagination,
  parseNumberRange,
  applyDateRange,
  applyNumberRange
} = require('../utils/queryHelpers');

router.get('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const transactionType = (req.query.transactionType || '').trim();
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const { min: minAmount, max: maxAmount } = parseNumberRange(req.query, 'minAmount', 'maxAmount');
    const search = (req.query.search || '').trim();

    const { page, pageSize, offset } = getPagination(req.query);

    const conditions = [];
    const params = [];

    if (transactionType) {
      conditions.push('t.transaction_type = ?');
      params.push(transactionType);
    }

    applyDateRange(conditions, params, 't.transaction_date', dateFrom, dateTo);
    applyNumberRange(conditions, params, 't.amount', minAmount, maxAmount);

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      conditions.push('(LOWER(i.invoice_number) LIKE ? OR LOWER(t.description) LIKE ?)');
      params.push(term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM transactions t
        LEFT JOIN invoices i ON t.invoice_id = i.id
        ${whereClause}
      `,
      params
    );

    const [rows] = await db.query(
      `
        SELECT 
          t.*,
          i.invoice_number
        FROM transactions t
        LEFT JOIN invoices i ON t.invoice_id = i.id
        ${whereClause}
        ORDER BY t.transaction_date DESC, t.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    res.json({
      items: rows,
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireRole('admin', 'accountant'), async (req, res) => {
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

router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
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

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Транзакция удалена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
