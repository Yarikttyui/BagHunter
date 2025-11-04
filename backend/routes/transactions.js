const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10);
    const pageSize = Number.parseInt(req.query.pageSize, 10);
    const transactionType = (req.query.transactionType || '').trim();
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const rawMinAmount = req.query.minAmount;
    const rawMaxAmount = req.query.maxAmount;
    const minAmount =
      rawMinAmount !== undefined && rawMinAmount !== ''
        ? Number.parseFloat(rawMinAmount)
        : undefined;
    const maxAmount =
      rawMaxAmount !== undefined && rawMaxAmount !== ''
        ? Number.parseFloat(rawMaxAmount)
        : undefined;
    const search = (req.query.search || '').trim();

    if (Number.isInteger(page) && page > 0) {
      const normalizedSize = Math.min(Math.max(pageSize || 50, 1), 200);
      const offset = (page - 1) * normalizedSize;

      const conditions = [];
      const params = [];

      if (transactionType) {
        conditions.push('t.transaction_type = ?');
        params.push(transactionType);
      }

      if (dateFrom) {
        conditions.push('t.transaction_date >= ?');
        params.push(dateFrom);
      }

      if (dateTo) {
        conditions.push('t.transaction_date <= ?');
        params.push(dateTo);
      }

      if (minAmount !== undefined && !Number.isNaN(minAmount)) {
        conditions.push('t.amount >= ?');
        params.push(minAmount);
      }

      if (maxAmount !== undefined && !Number.isNaN(maxAmount)) {
        conditions.push('t.amount <= ?');
        params.push(maxAmount);
      }

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
        [...params, normalizedSize, offset]
      );

      return res.json({
        items: rows,
        total,
        page,
        pageSize: normalizedSize,
        hasMore: offset + rows.length < total
      });
    }

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
