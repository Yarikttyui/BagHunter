const express = require('express');
const router = express.Router();
const db = require('../config/database');


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
      drivers: [],
      vehicles: [],
      waybills: [],
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
           OR i.delivery_address LIKE ?
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
          p.sku,
          p.barcode,
          p.price,
          p.status,
          c.name as category_name,
          'product' as entity_type
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.name LIKE ?
           OR p.sku LIKE ?
           OR p.barcode LIKE ?
           OR p.description LIKE ?
        ORDER BY p.name ASC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.products = products;
    }
    
    if (types.includes('all') || types.includes('drivers')) {
      const [drivers] = await db.query(`
        SELECT 
          id,
          full_name,
          license_number,
          phone,
          status,
          'driver' as entity_type
        FROM drivers
        WHERE full_name LIKE ?
           OR license_number LIKE ?
           OR phone LIKE ?
        ORDER BY full_name ASC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.drivers = drivers;
    }
    
    if (types.includes('all') || types.includes('vehicles')) {
      const [vehicles] = await db.query(`
        SELECT 
          v.id,
          v.vehicle_number,
          v.model,
          v.vehicle_type,
          v.status,
          d.full_name as default_driver_name,
          'vehicle' as entity_type
        FROM vehicles v
        LEFT JOIN drivers d ON v.default_driver_id = d.id
        WHERE v.vehicle_number LIKE ?
           OR v.model LIKE ?
           OR v.vin_number LIKE ?
        ORDER BY v.vehicle_number ASC
        LIMIT ?
      `, [searchTerm, searchTerm, searchTerm, maxResults]);
      
      results.vehicles = vehicles;
    }
    
    if (types.includes('all') || types.includes('waybills')) {
      const [waybills] = await db.query(`
        SELECT 
          w.id,
          w.waybill_number,
          w.departure_date,
          w.status,
          v.vehicle_number,
          d.full_name as driver_name,
          w.route,
          'waybill' as entity_type
        FROM waybills w
        LEFT JOIN vehicles v ON w.vehicle_id = v.id
        LEFT JOIN drivers d ON w.driver_id = d.id
        WHERE w.waybill_number LIKE ?
           OR w.route LIKE ?
        ORDER BY w.departure_date DESC
        LIMIT ?
      `, [searchTerm, searchTerm, maxResults]);
      
      results.waybills = waybills;
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
      has_waybill,
      limit = 50
    } = req.query;
    
    let query = `
      SELECT 
        i.*,
        c.company_name as client_name,
        c.contact_person,
        v.vehicle_number,
        d.full_name as driver_name,
        w.waybill_number
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN drivers d ON i.driver_id = d.id
      LEFT JOIN waybills w ON i.id = w.invoice_id
      WHERE 1=1
    `;
    const params = [];
    
    if (q) {
      query += ' AND (i.invoice_number LIKE ? OR c.company_name LIKE ? OR i.delivery_address LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term);
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
    
    if (has_waybill === 'true') {
      query += ' AND w.id IS NOT NULL';
    } else if (has_waybill === 'false') {
      query += ' AND w.id IS NULL';
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
      low_stock,
      in_stock,
      limit = 50
    } = req.query;
    
    let query = `
      SELECT 
        p.*,
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
    
    if (q) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term);
    }
    
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    if (price_min) {
      query += ' AND p.price >= ?';
      params.push(price_min);
    }
    
    if (price_max) {
      query += ' AND p.price <= ?';
      params.push(price_max);
    }
    
    query += ' GROUP BY p.id';
    
    if (low_stock === 'true') {
      query += ' HAVING available_quantity < p.min_stock';
    }
    
    if (in_stock === 'true') {
      query += ' HAVING available_quantity > 0';
    } else if (in_stock === 'false') {
      query += ' HAVING available_quantity = 0';
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
    
    const searchTerm = `%${q}%`;
    const maxResults = Math.min(parseInt(limit), 20);
    
    let suggestions = [];
    
    switch (type) {
      case 'clients':
        const [clients] = await db.query(
          'SELECT id, company_name as label, contact_person as sublabel FROM clients WHERE company_name LIKE ? OR contact_person LIKE ? LIMIT ?',
          [searchTerm, searchTerm, maxResults]
        );
        suggestions = clients;
        break;
        
      case 'products':
        const [products] = await db.query(
          'SELECT id, name as label, sku as sublabel FROM products WHERE name LIKE ? OR sku LIKE ? LIMIT ?',
          [searchTerm, searchTerm, maxResults]
        );
        suggestions = products;
        break;
        
      case 'drivers':
        const [drivers] = await db.query(
          'SELECT id, full_name as label, phone as sublabel FROM drivers WHERE full_name LIKE ? LIMIT ?',
          [searchTerm, maxResults]
        );
        suggestions = drivers;
        break;
        
      case 'vehicles':
        const [vehicles] = await db.query(
          'SELECT id, vehicle_number as label, model as sublabel FROM vehicles WHERE vehicle_number LIKE ? OR model LIKE ? LIMIT ?',
          [searchTerm, searchTerm, maxResults]
        );
        suggestions = vehicles;
        break;
        
      default:
        return res.status(400).json({ error: 'Неверный тип поиска' });
    }
    
    res.json(suggestions);
  } catch (error) {
    console.error('Ошибка автодополнения:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

module.exports = router;
