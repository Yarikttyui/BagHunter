const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/income-expense-chart', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const [data] = await db.query(`
      SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as month,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month ASC
    `, [months]);

    res.json(data);
  } catch (error) {
    console.error('Ошибка получения данных графика:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/top-clients', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [clients] = await db.query(`
      SELECT 
        c.id,
        c.company_name as name,
        c.email,
        COUNT(i.id) as invoice_count,
        SUM(i.total_amount) as total_revenue,
        AVG(i.total_amount) as avg_invoice,
        MAX(i.invoice_date) as last_invoice_date
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE i.status != 'cancelled'
      GROUP BY c.id, c.company_name, c.email
      ORDER BY total_revenue DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json(clients);
  } catch (error) {
    console.error('Ошибка получения ТОП-клиентов:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoice-status-stats', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM invoices
      GROUP BY status
    `);

    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики накладных:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices-trend', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const [data] = await db.query(`
      SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m') as month,
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM invoices
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month ASC
    `, [months]);

    res.json(data);
  } catch (error) {
    console.error('Ошибка получения динамики накладных:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/revenue-forecast', async (req, res) => {
  try {
    const [avgData] = await db.query(`
      SELECT 
        AVG(monthly_income) as avg_income,
        STDDEV(monthly_income) as stddev_income
      FROM (
        SELECT 
          DATE_FORMAT(transaction_date, '%Y-%m') as month,
          SUM(amount) as monthly_income
        FROM transactions
        WHERE transaction_type = 'income'
          AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ) as monthly_data
    `);

    const [trendData] = await db.query(`
      SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as month,
        SUM(amount) as income
      FROM transactions
      WHERE transaction_type = 'income'
        AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month ASC
    `);

    let forecast = [];
    if (trendData.length > 0) {
      const lastMonth = trendData[trendData.length - 1];
      const avgIncome = avgData[0].avg_income || 0;
      const growthRate = trendData.length > 1 
        ? (trendData[trendData.length - 1].income - trendData[0].income) / trendData[0].income / trendData.length
        : 0;

      for (let i = 1; i <= 3; i++) {
        const forecastValue = avgIncome * (1 + growthRate * i);
        forecast.push({
          month: `Прогноз +${i}`,
          forecast_income: Math.round(forecastValue),
          confidence: Math.max(0, 100 - (i * 15)) // Уверенность снижается с каждым месяцем
        });
      }
    }

    res.json({
      historical: trendData,
      forecast: forecast,
      avg_income: avgData[0].avg_income,
      growth_rate: trendData.length > 1 
        ? ((trendData[trendData.length - 1].income - trendData[0].income) / trendData[0].income * 100).toFixed(2)
        : 0
    });
  } catch (error) {
    console.error('Ошибка прогноза доходов:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment-methods', async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE transaction_type = 'income'
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `);

    res.json(data);
  } catch (error) {
    console.error('Ошибка получения методов оплаты:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/quarterly-stats', async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        CONCAT(year_num, '-Q', quarter_num) as quarter,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END) as profit
      FROM (
        SELECT 
          YEAR(transaction_date) as year_num,
          QUARTER(transaction_date) as quarter_num,
          transaction_type,
          amount
        FROM transactions
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
      ) as t
      GROUP BY year_num, quarter_num
      ORDER BY year_num ASC, quarter_num ASC
    `);

    res.json(data);
  } catch (error) {
    console.error('Ошибка получения квартальной статистики:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/dashboard', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const [finance] = await db.query(`
      SELECT 
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COALESCE(AVG(i.total_amount), 0) as avg_invoice_value,
        COUNT(DISTINCT CASE WHEN i.status = 'delivered' THEN i.id END) as delivered_count,
        COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END) as pending_count
      FROM invoices i
      WHERE (? IS NULL OR i.invoice_date >= ?)
        AND (? IS NULL OR i.invoice_date <= ?)
    `, [start_date, start_date, end_date, end_date]);
    
    const [clients] = await db.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clients,
        COUNT(DISTINCT i.client_id) as clients_with_orders
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
        AND (? IS NULL OR i.invoice_date >= ?)
        AND (? IS NULL OR i.invoice_date <= ?)
    `, [start_date, start_date, end_date, end_date]);
    
    const [transport] = await db.query(`
      SELECT 
        COUNT(DISTINCT v.id) as total_vehicles,
        COUNT(DISTINCT CASE WHEN v.status = 'available' THEN v.id END) as available_vehicles,
        COUNT(DISTINCT d.id) as total_drivers,
        COUNT(DISTINCT CASE WHEN d.status = 'available' THEN d.id END) as available_drivers,
        COUNT(DISTINCT w.id) as total_waybills,
        COUNT(DISTINCT CASE WHEN w.status = 'completed' THEN w.id END) as completed_waybills
      FROM vehicles v
      CROSS JOIN drivers d
      LEFT JOIN waybills w ON (? IS NULL OR w.departure_date >= ?)
        AND (? IS NULL OR w.departure_date <= ?)
    `, [start_date, start_date, end_date, end_date]);
    
    const [warehouse] = await db.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_products,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        COALESCE(SUM(s.quantity * p.price), 0) as stock_value,
        COUNT(DISTINCT CASE WHEN (s.quantity - s.reserved_quantity) < p.min_stock THEN p.id END) as low_stock_count
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
    `);
    
    res.json({
      finance: finance[0],
      clients: clients[0],
      transport: transport[0],
      warehouse: warehouse[0]
    });
  } catch (error) {
    console.error('Ошибка получения дашборда:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});


router.get('/drivers', async (req, res) => {
  try {
    const { start_date, end_date, driver_id } = req.query;
    
    let query = `
      SELECT 
        d.id,
        d.full_name,
        d.license_number,
        d.status,
        COUNT(DISTINCT w.id) as total_trips,
        COUNT(DISTINCT CASE WHEN w.status = 'completed' THEN w.id END) as completed_trips,
        COUNT(DISTINCT CASE WHEN w.status = 'in_progress' THEN w.id END) as active_trips,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.distance_km END), 0) as total_distance,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.fuel_consumed END), 0) as total_fuel,
        COALESCE(AVG(CASE WHEN w.status = 'completed' THEN w.distance_km END), 0) as avg_distance,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN i.total_amount END), 0) as total_revenue,
        COUNT(DISTINCT w.vehicle_id) as vehicles_used,
        MIN(w.departure_date) as first_trip,
        MAX(w.arrival_date) as last_trip
      FROM drivers d
      LEFT JOIN waybills w ON d.id = w.driver_id
        AND (? IS NULL OR w.departure_date >= ?)
        AND (? IS NULL OR w.departure_date <= ?)
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [start_date, start_date, end_date, end_date];
    
    if (driver_id) {
      query += ' AND d.id = ?';
      params.push(driver_id);
    }
    
    query += ' GROUP BY d.id ORDER BY completed_trips DESC';
    
    const [drivers] = await db.query(query, params);
    res.json(drivers);
  } catch (error) {
    console.error('Ошибка аналитики водителей:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики' });
  }
});

router.get('/drivers/ranking', async (req, res) => {
  try {
    const { metric = 'trips', limit = 10 } = req.query;
    
    let orderBy = 'completed_trips DESC';
    if (metric === 'distance') orderBy = 'total_distance DESC';
    if (metric === 'revenue') orderBy = 'total_revenue DESC';
    if (metric === 'efficiency') orderBy = '(total_distance / NULLIF(total_fuel, 0)) DESC';
    
    const [ranking] = await db.query(`
      SELECT 
        d.id,
        d.full_name,
        d.phone,
        COUNT(DISTINCT CASE WHEN w.status = 'completed' THEN w.id END) as completed_trips,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.distance_km END), 0) as total_distance,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.fuel_consumed END), 0) as total_fuel,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN i.total_amount END), 0) as total_revenue,
        ROUND(COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.distance_km END), 0) / 
              NULLIF(SUM(CASE WHEN w.status = 'completed' THEN w.fuel_consumed END), 0), 2) as fuel_efficiency
      FROM drivers d
      LEFT JOIN waybills w ON d.id = w.driver_id
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE d.status = 'available'
      GROUP BY d.id
      ORDER BY ${orderBy}
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json(ranking);
  } catch (error) {
    console.error('Ошибка рейтинга водителей:', error);
    res.status(500).json({ error: 'Ошибка получения рейтинга' });
  }
});


router.get('/vehicles', async (req, res) => {
  try {
    const { start_date, end_date, vehicle_id } = req.query;
    
    let query = `
      SELECT 
        v.id,
        v.vehicle_number,
        v.model,
        v.status,
        COUNT(DISTINCT w.id) as total_trips,
        COUNT(DISTINCT CASE WHEN w.status = 'completed' THEN w.id END) as completed_trips,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.distance_km END), 0) as total_distance,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.fuel_consumed END), 0) as total_fuel,
        ROUND(COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.distance_km END), 0) / 
              NULLIF(SUM(CASE WHEN w.status = 'completed' THEN w.fuel_consumed END), 0), 2) as fuel_efficiency,
        COALESCE(SUM(CASE WHEN w.status = 'completed' THEN i.total_amount END), 0) as total_revenue,
        COUNT(DISTINCT w.driver_id) as drivers_used,
        DATEDIFF(CURDATE(), v.last_maintenance_date) as days_since_maintenance
      FROM vehicles v
      LEFT JOIN waybills w ON v.id = w.vehicle_id
        AND (? IS NULL OR w.departure_date >= ?)
        AND (? IS NULL OR w.departure_date <= ?)
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [start_date, start_date, end_date, end_date];
    
    if (vehicle_id) {
      query += ' AND v.id = ?';
      params.push(vehicle_id);
    }
    
    query += ' GROUP BY v.id ORDER BY completed_trips DESC';
    
    const [vehicles] = await db.query(query, params);
    res.json(vehicles);
  } catch (error) {
    console.error('Ошибка аналитики транспорта:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики' });
  }
});

router.get('/vehicles/high-mileage', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [vehicles] = await db.query(`
      SELECT 
        v.*,
        COALESCE(SUM(w.distance_km), 0) as total_distance,
        COUNT(DISTINCT w.id) as trips_count,
        DATEDIFF(CURDATE(), v.last_maintenance_date) as days_since_maintenance
      FROM vehicles v
      LEFT JOIN waybills w ON v.id = w.vehicle_id AND w.status = 'completed'
      GROUP BY v.id
      HAVING days_since_maintenance > 90 OR total_distance > 10000
      ORDER BY total_distance DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json(vehicles);
  } catch (error) {
    console.error('Ошибка получения транспорта:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});


router.get('/warehouse/movements', async (req, res) => {
  try {
    const { start_date, end_date, product_id } = req.query;
    
    let query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        c.name as category_name,
        COUNT(DISTINCT m.id) as total_movements,
        COALESCE(SUM(CASE WHEN m.movement_type IN ('in', 'adjustment') THEN m.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN m.movement_type IN ('out', 'reserved') THEN m.quantity ELSE 0 END), 0) as total_out,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        COALESCE(SUM(s.reserved_quantity), 0) as reserved_stock
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN stock_movements m ON p.id = m.product_id
        AND (? IS NULL OR m.created_at >= ?)
        AND (? IS NULL OR m.created_at <= ?)
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE 1=1
    `;
    const params = [start_date, start_date, end_date, end_date];
    
    if (product_id) {
      query += ' AND p.id = ?';
      params.push(product_id);
    }
    
    query += ' GROUP BY p.id ORDER BY total_movements DESC';
    
    const [movements] = await db.query(query, params);
    res.json(movements);
  } catch (error) {
    console.error('Ошибка аналитики движений:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики' });
  }
});

router.get('/warehouse/popular', async (req, res) => {
  try {
    const { limit = 10, start_date, end_date } = req.query;
    
    const [popular] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        c.name as category_name,
        COUNT(DISTINCT ii.invoice_id) as orders_count,
        COALESCE(SUM(ii.quantity), 0) as total_sold,
        COALESCE(SUM(ii.quantity * ii.unit_price), 0) as total_revenue
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      INNER JOIN invoice_items ii ON p.id = ii.product_id
      INNER JOIN invoices i ON ii.invoice_id = i.id
      WHERE (? IS NULL OR i.invoice_date >= ?)
        AND (? IS NULL OR i.invoice_date <= ?)
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT ?
    `, [start_date, start_date, end_date, end_date, parseInt(limit)]);
    
    res.json(popular);
  } catch (error) {
    console.error('Ошибка получения популярных товаров:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});


router.get('/trends/sales', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const [trends] = await db.query(`
      SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m') as month,
        COUNT(DISTINCT id) as invoices_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_invoice_value,
        COUNT(DISTINCT client_id) as unique_clients
      FROM invoices
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY month
      ORDER BY month DESC
    `, [parseInt(months)]);
    
    res.json(trends);
  } catch (error) {
    console.error('Ошибка трендов продаж:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

router.get('/trends/transport', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const [trends] = await db.query(`
      SELECT 
        DATE_FORMAT(w.departure_date, '%Y-%m') as month,
        COUNT(DISTINCT w.id) as trips_count,
        COUNT(DISTINCT w.vehicle_id) as vehicles_used,
        COUNT(DISTINCT w.driver_id) as drivers_used,
        COALESCE(SUM(w.distance_km), 0) as total_distance,
        COALESCE(SUM(w.fuel_consumed), 0) as total_fuel,
        ROUND(COALESCE(SUM(w.distance_km), 0) / NULLIF(SUM(w.fuel_consumed), 0), 2) as avg_efficiency
      FROM waybills w
      WHERE w.departure_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        AND w.status = 'completed'
      GROUP BY month
      ORDER BY month DESC
    `, [parseInt(months)]);
    
    res.json(trends);
  } catch (error) {
    console.error('Ошибка трендов транспорта:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});


router.get('/clients/top', async (req, res) => {
  try {
    const { metric = 'revenue', limit = 10, start_date, end_date } = req.query;
    
    let orderBy = 'total_revenue DESC';
    if (metric === 'orders') orderBy = 'orders_count DESC';
    if (metric === 'avg_order') orderBy = 'avg_order_value DESC';
    
    const [topClients] = await db.query(`
      SELECT 
        c.id,
        c.company_name,
        c.contact_person,
        c.email,
        c.phone,
        COUNT(DISTINCT i.id) as orders_count,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COALESCE(AVG(i.total_amount), 0) as avg_order_value,
        MIN(i.invoice_date) as first_order,
        MAX(i.invoice_date) as last_order,
        DATEDIFF(CURDATE(), MAX(i.invoice_date)) as days_since_last_order
      FROM clients c
      INNER JOIN invoices i ON c.id = i.client_id
      WHERE (? IS NULL OR i.invoice_date >= ?)
        AND (? IS NULL OR i.invoice_date <= ?)
      GROUP BY c.id
      ORDER BY ${orderBy}
      LIMIT ?
    `, [start_date, start_date, end_date, end_date, parseInt(limit)]);
    
    res.json(topClients);
  } catch (error) {
    console.error('Ошибка ТОП клиентов:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

module.exports = router;
