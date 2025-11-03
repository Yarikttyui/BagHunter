const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10);
    const pageSize = Number.parseInt(req.query.pageSize, 10);
    const search = (req.query.search || '').trim();

    if (Number.isInteger(page) && page > 0) {
      const normalizedSize = Math.min(Math.max(pageSize || 50, 1), 200);
      const offset = (page - 1) * normalizedSize;

      const conditions = [];
      const params = [];

      if (search) {
        const term = `%${search.toLowerCase()}%`;
        conditions.push(
          `(LOWER(c.company_name) LIKE ? OR LOWER(c.contact_person) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.address) LIKE ? OR c.phone LIKE ? OR c.inn LIKE ?)`
        );
        params.push(term, term, term, term, `%${search}%`, `%${search}%`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM clients c ${whereClause}`,
        params
      );

      const [rows] = await db.query(
        `
          SELECT 
            c.id,
            c.company_name,
            c.contact_person,
            c.email,
            c.phone,
            c.address,
            c.inn,
            c.status,
            c.created_at,
            c.updated_at
          FROM clients c
          ${whereClause}
          ORDER BY c.created_at DESC
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

    const [rows] = await db.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, address, inn, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO clients (company_name, contact_person, email, phone, address, inn, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [company_name, contact_person, email, phone, address, inn, status || 'active']
    );
    res.status(201).json({ id: result.insertId, message: 'Клиент создан' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, address, inn, status } = req.body;
    await db.query(
      'UPDATE clients SET company_name = ?, contact_person = ?, email = ?, phone = ?, address = ?, inn = ?, status = ? WHERE id = ?',
      [company_name, contact_person, email, phone, address, inn, status, req.params.id]
    );
    res.json({ message: 'Клиент обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ message: 'Клиент удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
