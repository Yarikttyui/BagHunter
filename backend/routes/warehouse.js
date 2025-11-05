const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения'));
    }
  }
});


router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT c.*, 
             p.name as parent_name,
             COUNT(DISTINCT pr.id) as products_count
      FROM product_categories c
      LEFT JOIN product_categories p ON c.parent_id = p.id
      LEFT JOIN products pr ON pr.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    
    res.json(categories);
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Название категории обязательно' });
    }
    
    const [result] = await db.query(
      'INSERT INTO product_categories (name, parent_id, description) VALUES (?, ?, ?)',
      [name, parent_id, description]
    );
    
    res.status(201).json({
      message: 'Категория создана',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    res.status(500).json({ error: 'Ошибка создания категории' });
  }
});


router.get('/products', async (req, res) => {
  try {
    const { search, category_id, status, low_stock } = req.query;
    
    let query = `
      SELECT p.*,
             c.name as category_name,
             COALESCE(SUM(s.quantity), 0) as total_quantity,
             COALESCE(SUM(s.reserved_quantity), 0) as total_reserved,
             COALESCE(SUM(s.quantity) - SUM(s.reserved_quantity), 0) as available_quantity
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY p.id';
    
    if (low_stock === 'true') {
      query += ' HAVING available_quantity < p.min_stock';
    }
    
    query += ' ORDER BY p.name ASC';
    
    const [products] = await db.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

router.get('/products/low-stock', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*,
             c.name as category_name,
             COALESCE(SUM(s.quantity), 0) as total_quantity,
             COALESCE(SUM(s.reserved_quantity), 0) as total_reserved,
             COALESCE(SUM(s.quantity) - SUM(s.reserved_quantity), 0) as available_quantity,
             p.min_stock
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.status = 'active'
      GROUP BY p.id
      HAVING available_quantity < p.min_stock
      ORDER BY (available_quantity / NULLIF(p.min_stock, 0)) ASC
    `);
    
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров с низким остатком:', error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*,
             c.name as category_name,
             COALESCE(SUM(s.quantity), 0) as total_quantity,
             COALESCE(SUM(s.reserved_quantity), 0) as total_reserved,
             COALESCE(SUM(s.quantity) - SUM(s.reserved_quantity), 0) as available_quantity
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [req.params.id]);
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(products[0]);
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      category_id,
      description,
      unit,
      price,
      min_stock,
      status = 'active'
    } = req.body;
    
    if (!name || !sku || !unit) {
      return res.status(400).json({ error: 'Название, артикул и единица измерения обязательны' });
    }
    
    const [existingSku] = await db.query(
      'SELECT id FROM products WHERE sku = ?',
      [sku]
    );
    
    if (existingSku.length > 0) {
      return res.status(400).json({ error: 'Товар с таким артикулом уже существует' });
    }
    
    if (barcode) {
      const [existingBarcode] = await db.query(
        'SELECT id FROM products WHERE barcode = ?',
        [barcode]
      );
      
      if (existingBarcode.length > 0) {
        return res.status(400).json({ error: 'Товар с таким штрих-кодом уже существует' });
      }
    }
    
    const image = req.file ? '/uploads/products/' + req.file.filename : null;
    
    const [result] = await db.query(
      `INSERT INTO products 
       (name, sku, barcode, category_id, description, unit, price, min_stock, status, image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, barcode, category_id, description, unit, price, min_stock, status, image]
    );
    
    res.status(201).json({
      message: 'Товар успешно создан',
      productId: result.insertId
    });
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

router.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      category_id,
      description,
      unit,
      price,
      min_stock,
      status
    } = req.body;
    
    const [existing] = await db.query(
      'SELECT id, image FROM products WHERE id = ?',
      [req.params.id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    if (sku) {
      const [duplicate] = await db.query(
        'SELECT id FROM products WHERE sku = ? AND id != ?',
        [sku, req.params.id]
      );
      
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'Товар с таким артикулом уже существует' });
      }
    }
    
    const image = req.file 
      ? '/uploads/products/' + req.file.filename 
      : existing[0].image;
    
    await db.query(
      `UPDATE products 
       SET name = COALESCE(?, name),
           sku = COALESCE(?, sku),
           barcode = COALESCE(?, barcode),
           category_id = COALESCE(?, category_id),
           description = COALESCE(?, description),
           unit = COALESCE(?, unit),
           price = COALESCE(?, price),
           min_stock = COALESCE(?, min_stock),
           status = COALESCE(?, status),
           image = ?
       WHERE id = ?`,
      [name, sku, barcode, category_id, description, unit, price, min_stock, status, image, req.params.id]
    );
    
    res.json({ message: 'Товар успешно обновлён' });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE products SET status = ? WHERE id = ?',
      ['discontinued', req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json({ message: 'Товар снят с производства' });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});


router.get('/stock/levels', async (req, res) => {
  try {
    const { warehouse_location } = req.query;
    
    let query = `
      SELECT s.*,
             p.name as product_name,
             p.sku,
             p.unit,
             p.min_stock,
             (s.quantity - s.reserved_quantity) as available_quantity,
             c.name as category_name
      FROM stock s
      INNER JOIN products p ON s.product_id = p.id
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (warehouse_location) {
      query += ' AND s.warehouse_location = ?';
      params.push(warehouse_location);
    }
    
    query += ' ORDER BY p.name ASC';
    
    const [stock] = await db.query(query, params);
    res.json(stock);
  } catch (error) {
    console.error('Ошибка получения остатков:', error);
    res.status(500).json({ error: 'Ошибка получения остатков' });
  }
});

router.post('/stock/adjust', async (req, res) => {
  try {
    const {
      product_id,
      warehouse_location,
      quantity_change,
      movement_type,
      notes,
      created_by
    } = req.body;
    
    if (!product_id || !warehouse_location || !quantity_change) {
      return res.status(400).json({ error: 'Товар, склад и количество обязательны' });
    }
    
    const [currentStock] = await db.query(
      'SELECT id, quantity FROM stock WHERE product_id = ? AND warehouse_location = ?',
      [product_id, warehouse_location]
    );
    
    if (currentStock.length === 0) {
      await db.query(
        'INSERT INTO stock (product_id, warehouse_location, quantity, reserved_quantity) VALUES (?, ?, ?, 0)',
        [product_id, warehouse_location, Math.max(0, quantity_change)]
      );
    } else {
      const newQuantity = Math.max(0, currentStock[0].quantity + quantity_change);
      await db.query(
        'UPDATE stock SET quantity = ? WHERE id = ?',
        [newQuantity, currentStock[0].id]
      );
    }
    
    await db.query(
      `INSERT INTO stock_movements 
       (product_id, movement_type, quantity, reference_type, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, movement_type || 'adjustment', Math.abs(quantity_change), 'manual', notes, created_by]
    );
    
    res.json({ message: 'Остатки успешно скорректированы' });
  } catch (error) {
    console.error('Ошибка корректировки остатков:', error);
    res.status(500).json({ error: 'Ошибка корректировки остатков' });
  }
});

router.post('/stock/reserve', async (req, res) => {
  try {
    const { invoice_id, items, created_by } = req.body;
    
    if (!invoice_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Накладная и товары обязательны' });
    }
    
    await db.query('START TRANSACTION');
    
    try {
      for (const item of items) {
        const { product_id, quantity, warehouse_location = 'main' } = item;
        
        const [stock] = await db.query(
          'SELECT id, quantity, reserved_quantity FROM stock WHERE product_id = ? AND warehouse_location = ?',
          [product_id, warehouse_location]
        );
        
        if (stock.length === 0 || (stock[0].quantity - stock[0].reserved_quantity) < quantity) {
          throw new Error(`Недостаточно товара на складе (ID: ${product_id})`);
        }
        
        await db.query(
          'UPDATE stock SET reserved_quantity = reserved_quantity + ? WHERE id = ?',
          [quantity, stock[0].id]
        );
        
        await db.query(
          `INSERT INTO stock_movements 
           (product_id, movement_type, quantity, reference_type, reference_id, created_by) 
           VALUES (?, 'reserved', ?, 'invoice', ?, ?)`,
          [product_id, quantity, invoice_id, created_by]
        );
      }
      
      await db.query('COMMIT');
      res.json({ message: 'Товары успешно зарезервированы' });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Ошибка резервирования:', error);
    res.status(500).json({ error: error.message || 'Ошибка резервирования' });
  }
});

router.post('/stock/deduct', async (req, res) => {
  try {
    const { invoice_id, created_by } = req.body;
    
    if (!invoice_id) {
      return res.status(400).json({ error: 'ID накладной обязателен' });
    }
    
    const [invoiceItems] = await db.query(
      'SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?',
      [invoice_id]
    );
    
    if (invoiceItems.length === 0) {
      return res.status(400).json({ error: 'В накладной нет товаров' });
    }
    
    await db.query('START TRANSACTION');
    
    try {
      for (const item of invoiceItems) {
        const { product_id, quantity } = item;
        
        const [stock] = await db.query(
          'SELECT id, quantity, reserved_quantity FROM stock WHERE product_id = ? AND warehouse_location = ?',
          [product_id, 'main']
        );
        
        if (stock.length > 0) {
          await db.query(
            'UPDATE stock SET quantity = quantity - ?, reserved_quantity = GREATEST(0, reserved_quantity - ?) WHERE id = ?',
            [quantity, quantity, stock[0].id]
          );
          
          await db.query(
            `INSERT INTO stock_movements 
             (product_id, movement_type, quantity, reference_type, reference_id, created_by) 
             VALUES (?, 'out', ?, 'invoice', ?, ?)`,
            [product_id, quantity, invoice_id, created_by]
          );
        }
      }
      
      await db.query('COMMIT');
      res.json({ message: 'Товары успешно списаны' });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Ошибка списания:', error);
    res.status(500).json({ error: 'Ошибка списания товаров' });
  }
});

router.get('/stock/movements/:productId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const [movements] = await db.query(`
      SELECT m.*,
             p.name as product_name,
             p.sku,
             u.username as created_by_name
      FROM stock_movements m
      INNER JOIN products p ON m.product_id = p.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.product_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [req.params.productId, parseInt(limit)]);
    
    res.json(movements);
  } catch (error) {
    console.error('Ошибка получения движений:', error);
    res.status(500).json({ error: 'Ошибка получения движений' });
  }
});


router.get('/stock/statistics', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_products,
        COALESCE(SUM(s.quantity), 0) as total_quantity,
        COALESCE(SUM(s.reserved_quantity), 0) as total_reserved,
        COALESCE(SUM(s.quantity * p.price), 0) as total_value,
        COUNT(DISTINCT CASE WHEN (s.quantity - s.reserved_quantity) < p.min_stock THEN p.id END) as low_stock_count
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
    `);
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

module.exports = router;
