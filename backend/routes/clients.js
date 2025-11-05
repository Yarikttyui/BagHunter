const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
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
