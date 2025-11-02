const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY category, name'
    );
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(products[0]);
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

router.post('/', async (req, res) => {
  const { name, description, unit, price, stock_quantity, category } = req.body;
  
  try {
    const [result] = await db.query(
      'INSERT INTO products (name, description, unit, price, stock_quantity, category) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, unit || 'шт', price, stock_quantity || 0, category]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Товар создан' });
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description, unit, price, stock_quantity, category, is_active } = req.body;
  
  try {
    await db.query(
      'UPDATE products SET name = ?, description = ?, unit = ?, price = ?, stock_quantity = ?, category = ?, is_active = ? WHERE id = ?',
      [name, description, unit, price, stock_quantity, category, is_active, req.params.id]
    );
    
    res.json({ message: 'Товар обновлен' });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(
      'UPDATE products SET is_active = FALSE WHERE id = ?',
      [req.params.id]
    );
    
    res.json({ message: 'Товар деактивирован' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

module.exports = router;
