const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

function validateProductPayload(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return 'Название товара обязательно';
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return 'Цена должна быть положительным числом';
  }

  const stock = body.stock_quantity === undefined ? 0 : Number(body.stock_quantity);
  if (!Number.isFinite(stock) || stock < 0) {
    return 'Количество на складе должно быть положительным числом';
  }

  return null;
}

router.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive).toLowerCase() === 'true';
    const sql = includeInactive
      ? 'SELECT * FROM products ORDER BY is_active DESC, category, name'
      : 'SELECT * FROM products WHERE is_active = TRUE ORDER BY category, name';

    const [products] = await db.query(sql);
    res.json(products);
  } catch (error) {
    console.error('Ошибка загрузки списка товаров:', error);
    res.status(500).json({ error: 'Ошибка загрузки списка товаров' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const validationError = validateProductPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { name, description, unit, price, stock_quantity, category } = req.body;
  const normalizedName = name.trim();
  const normalizedPrice = Number(price);
  const normalizedStock = stock_quantity === undefined ? 0 : Number(stock_quantity);
  const normalizedUnit = (unit || 'шт').trim() || 'шт';

  try {
    const [result] = await db.query(
      'INSERT INTO products (name, description, unit, price, stock_quantity, category) VALUES (?, ?, ?, ?, ?, ?)',
      [normalizedName, description, normalizedUnit, normalizedPrice, normalizedStock, category || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Товар создан' });
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  const validationError = validateProductPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { name, description, unit, price, stock_quantity, category, is_active } = req.body;
  const normalizedName = name.trim();
  const normalizedPrice = Number(price);
  const normalizedStock = stock_quantity === undefined ? 0 : Number(stock_quantity);
  const normalizedUnit = (unit || 'шт').trim() || 'шт';
  const normalizedActive = typeof is_active === 'boolean' ? is_active : Boolean(Number(is_active));

  try {
    await db.query(
      'UPDATE products SET name = ?, description = ?, unit = ?, price = ?, stock_quantity = ?, category = ?, is_active = ? WHERE id = ?',
      [normalizedName, description, normalizedUnit, normalizedPrice, normalizedStock, category || null, normalizedActive, req.params.id]
    );

    res.json({ message: 'Товар обновлён' });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

router.delete('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await db.query('UPDATE products SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Товар снят с продажи' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

module.exports = router;
