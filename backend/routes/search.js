const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin', 'accountant'));


router.get('/global', async (req, res) => {
  try {
    const { q, entity_types, limit = 50 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Минимум 2 символа для поиска' });
    }
    
    const searchTerm = `%${q}%`;
    const maxResults = Math.min(parseInt(limit), 100);
    const types = entity_types ? entity_types.split(',') : ['all'];
    
    const results = {
      invoices: [],
      clients: [],
      products: [],
      users: []
    };
    
    if (types.includes('all') || types.includes('invoices')) {
      const [invoices] = await db.query(`
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.total_amount,
          i.status,
          c.company_name as client_name,
          'invoice' as entity_type
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.invoice_number LIKE ?
           OR c.company_name LIKE ?
        ORDER BY i.invoice_date DESC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.invoices = invoices;
    }
    
    if (types.includes('all') || types.includes('clients')) {
      const [clients] = await db.query(`
        SELECT 
          id,
          company_name,
          contact_person,
          email,
          phone,
          status,
          'client' as entity_type
        FROM clients
        WHERE company_name LIKE ?
           OR contact_person LIKE ?
           OR email LIKE ?
           OR phone LIKE ?
           OR address LIKE ?
        ORDER BY company_name ASC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.clients = clients;
    }
    
    if (types.includes('all') || types.includes('products')) {
      const [products] = await db.query(`
        SELECT 
          p.id,
          p.name,
          p.unit,
          p.price,
          p.stock_quantity,
          p.category,
          p.is_active,
          'product' as entity_type
        FROM products p
        WHERE p.name LIKE ?
           OR COALESCE(p.category, '') LIKE ?
           OR COALESCE(p.description, '') LIKE ?
        ORDER BY p.name ASC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.products = products;
    }
    
    if (types.includes('all') || types.includes('users')) {
      const [users] = await db.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          up.full_name,
          up.phone,
          'user' as entity_type
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.username LIKE ?
           OR u.email LIKE ?
           OR up.full_name LIKE ?
           OR up.phone LIKE ?
        ORDER BY u.username ASC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.users = users;
    }
    
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    
    res.json({
      query: q,
      total_results: totalResults,
      results: results
    });
  } catch (error) {
    console.error('Ошибка глобального поиска:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});


router.get('/invoices', async (req, res) => {
  try {
    const {
      q,
      status,
      client_id,
      date_from,
      date_to,
      amount_min,
      amount_max,
      limit = 50
    } = req.query;
    
    let query = `
      SELECT 
        i.*,
        c.company_name as client_name,
        c.contact_person
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (q) {
      query += ' AND (i.invoice_number LIKE ? OR c.company_name LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term);
    }
    
    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    
    if (client_id) {
      query += ' AND i.client_id = ?';
      params.push(client_id);
    }
    
    if (date_from) {
      query += ' AND i.invoice_date >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND i.invoice_date <= ?';
      params.push(date_to);
    }
    
    if (amount_min) {
      query += ' AND i.total_amount >= ?';
      params.push(amount_min);
    }
    
    if (amount_max) {
      query += ' AND i.total_amount <= ?';
      params.push(amount_max);
    }
    
    query += ' ORDER BY i.invoice_date DESC LIMIT ?';
    params.push(Math.min(parseInt(limit), 100));
    
    const [invoices] = await db.query(query, params);
    res.json(invoices);
  } catch (error) {
    console.error('Ошибка поиска накладных:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

router.get('/clients', async (req, res) => {
  try {
    const {
      q,
      status,
      has_orders,
      order_count_min,
      revenue_min,
      limit = 50
    } = req.query;
    
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT i.id) as orders_count,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        MAX(i.invoice_date) as last_order_date
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE 1=1
    `;
    const params = [];
    
    if (q) {
      query += ' AND (c.company_name LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term, term);
    }
    
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY c.id';
    
    if (has_orders === 'true') {
      query += ' HAVING orders_count > 0';
    } else if (has_orders === 'false') {
      query += ' HAVING orders_count = 0';
    }
    
    if (order_count_min) {
      query += ' HAVING orders_count >= ?';
      params.push(order_count_min);
    }
    
    if (revenue_min) {
      query += ' HAVING total_revenue >= ?';
      params.push(revenue_min);
    }
    
    query += ' ORDER BY c.company_name ASC LIMIT ?';
    params.push(Math.min(parseInt(limit), 100));
    
    const [clients] = await db.query(query, params);
    res.json(clients);
  } catch (error) {
    console.error('Ошибка поиска клиентов:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const {
      q,
      category_id,
      status,
      price_min,
      price_max,
      limit = 50
    } = req.query;
    
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.unit,
        p.price,
        p.stock_quantity,
        p.category,
        p.is_active,
        'product' as entity_type
      FROM products p
      WHERE 1=1
    `;
    const params = [];
    
    if (q) {
      query += ' AND (p.name LIKE ? OR COALESCE(p.category, \'\') LIKE ? OR COALESCE(p.description, \'\') LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term);
    }
    
    const categoryFilter = req.query.category || category_id;
    if (categoryFilter) {
      query += ' AND p.category = ?';
      params.push(categoryFilter);
    }
    
    if (status) {
      if (status === 'active') {
        query += ' AND p.is_active = TRUE';
      } else if (status === 'inactive') {
        query += ' AND p.is_active = FALSE';
      }
    }
    
    if (price_min) {
      query += ' AND p.price >= ?';
      params.push(price_min);
    }
    
    if (price_max) {
      query += ' AND p.price <= ?';
      params.push(price_max);
    }
    
    query += ' ORDER BY p.name ASC LIMIT ?';
    params.push(Math.min(parseInt(limit), 100));
    
    const [products] = await db.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Ошибка поиска товаров:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});


router.get('/suggestions', async (req, res) => {
  try {
    const { q, type, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    
    const allowedTypes = ['clients', 'invoices', 'transactions', 'users', 'products'];
    const requestedTypes = (type || allowedTypes.join(','))
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    
    const activeTypes = requestedTypes.filter((item) => allowedTypes.includes(item));
    if (!activeTypes.length) {
      return res.status(400).json({ error: 'Недопустимый тип подсказки' });
    }
    
    const searchTerm = `%${q}%`;
    const maxResults = Math.min(Number.parseInt(limit, 10) || 10, 20);
    const perTypeLimit = Math.max(2, Math.ceil(maxResults / activeTypes.length));
    
    const suggestions = [];
    
    if (activeTypes.includes('clients')) {
      const [clients] = await db.query(
        `
          SELECT id, company_name, contact_person, email, status
          FROM clients
          WHERE company_name LIKE ?
             OR contact_person LIKE ?
             OR email LIKE ?
             OR phone LIKE ?
          ORDER BY company_name ASC
          LIMIT ?
        `,
        [searchTerm, searchTerm, searchTerm, searchTerm, perTypeLimit]
      );
      
      suggestions.push(
        ...clients.map((client) => ({
          id: client.id,
          entity_type: 'client',
          label: client.company_name,
          sublabel: client.contact_person || client.email || '',
          meta: { status: client.status }
        }))
      );
    }
    
    if (activeTypes.includes('invoices')) {
      const [invoices] = await db.query(
        `
          SELECT 
            i.id,
            i.invoice_number,
            i.status,
            i.total_amount,
            i.invoice_date,
            c.company_name AS client_name
          FROM invoices i
          LEFT JOIN clients c ON c.id = i.client_id
          WHERE i.invoice_number LIKE ?
             OR c.company_name LIKE ?
          ORDER BY i.invoice_date DESC
          LIMIT ?
        `,
        [searchTerm, searchTerm, perTypeLimit]
      );
      
      suggestions.push(
        ...invoices.map((invoice) => ({
          id: invoice.id,
          entity_type: 'invoice',
          label: invoice.invoice_number,
          sublabel: invoice.client_name
            ? `${invoice.client_name} • ${new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}`
            : new Date(invoice.invoice_date).toLocaleDateString('ru-RU'),
          meta: {
            status: invoice.status,
            amount: invoice.total_amount
          },
          search_value: invoice.invoice_number
        }))
      );
    }
    
    if (activeTypes.includes('transactions')) {
      const [transactions] = await db.query(
        `
          SELECT 
            t.id,
            t.transaction_type,
            t.amount,
            t.transaction_date,
            t.payment_method,
            i.invoice_number
          FROM transactions t
          LEFT JOIN invoices i ON i.id = t.invoice_id
          WHERE t.description LIKE ?
             OR i.invoice_number LIKE ?
          ORDER BY t.transaction_date DESC
          LIMIT ?
        `,
        [searchTerm, searchTerm, perTypeLimit]
      );
      
      suggestions.push(
        ...transactions.map((transaction) => ({
          id: transaction.id,
          entity_type: 'transaction',
          label: `${transaction.transaction_type === 'income' ? 'Приход' : 'Расход'} • ${Number(transaction.amount || 0).toLocaleString('ru-RU')} ₽`,
          sublabel: transaction.invoice_number
            ? `Накладная ${transaction.invoice_number}`
            : new Date(transaction.transaction_date).toLocaleDateString('ru-RU'),
          meta: {
            payment_method: transaction.payment_method
          },
          search_value: transaction.invoice_number || String(transaction.id)
        }))
      );
    }
    
    if (activeTypes.includes('users')) {
      const [users] = await db.query(
        `
          SELECT 
            u.id,
            u.username,
            u.email,
            u.role,
            COALESCE(up.full_name, '') AS full_name
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          WHERE u.username LIKE ?
             OR u.email LIKE ?
             OR up.full_name LIKE ?
          ORDER BY u.username ASC
          LIMIT ?
        `,
        [searchTerm, searchTerm, searchTerm, perTypeLimit]
      );
      
      suggestions.push(
        ...users.map((user) => ({
          id: user.id,
          entity_type: 'user',
          label: user.full_name || user.username,
          sublabel: user.email || `@${user.username}`,
          meta: { role: user.role },
          search_value: user.username
        }))
      );
    }
    
    if (activeTypes.includes('products')) {
      const [products] = await db.query(
        `
          SELECT 
            p.id,
            p.name,
            p.category,
            p.unit,
            p.price,
            p.is_active
          FROM products p
          WHERE p.name LIKE ?
             OR COALESCE(p.category, '') LIKE ?
          ORDER BY p.name ASC
          LIMIT ?
        `,
        [searchTerm, searchTerm, perTypeLimit]
      );
      
      suggestions.push(
        ...products.map((product) => ({
          id: product.id,
          entity_type: 'product',
          label: product.name,
          sublabel: product.category || product.unit || '',
          meta: { price: product.price, active: Boolean(product.is_active) }
        }))
      );
    }
    
    const collator = new Intl.Collator('ru-RU');
    const normalized = suggestions
      .sort((a, b) => collator.compare(a.label, b.label))
      .slice(0, maxResults);
    
    res.json(normalized);
  } catch (error) {
    console.error('Ошибка получения подсказок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
