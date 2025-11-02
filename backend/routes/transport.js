const express = require('express');
const router = express.Router();
const db = require('../config/database');


router.get('/drivers', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM drivers';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY full_name ASC';
    
    const [drivers] = await db.query(query, params);
    res.json(drivers);
  } catch (error) {
    console.error('Ошибка получения водителей:', error);
    res.status(500).json({ error: 'Ошибка получения водителей' });
  }
});

router.get('/drivers/:id', async (req, res) => {
  try {
    const [drivers] = await db.query(
      'SELECT * FROM drivers WHERE id = ?',
      [req.params.id]
    );
    
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Водитель не найден' });
    }
    
    res.json(drivers[0]);
  } catch (error) {
    console.error('Ошибка получения водителя:', error);
    res.status(500).json({ error: 'Ошибка получения водителя' });
  }
});

router.post('/drivers', async (req, res) => {
  try {
    const {
      full_name,
      phone,
      license_number,
      license_category,
      employment_date,
      status = 'active'
    } = req.body;
    
    if (!full_name || !phone || !license_number) {
      return res.status(400).json({ 
        error: 'ФИО, телефон и номер прав обязательны' 
      });
    }
    
    const [existing] = await db.query(
      'SELECT id FROM drivers WHERE license_number = ?',
      [license_number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Водитель с таким номером прав уже существует' 
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO drivers 
       (full_name, phone, license_number, license_category, employment_date, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, phone, license_number, license_category, employment_date, status]
    );
    
    res.status(201).json({
      message: 'Водитель успешно создан',
      driverId: result.insertId
    });
  } catch (error) {
    console.error('Ошибка создания водителя:', error);
    res.status(500).json({ error: 'Ошибка создания водителя' });
  }
});

router.put('/drivers/:id', async (req, res) => {
  try {
    const {
      full_name,
      phone,
      license_number,
      license_category,
      employment_date,
      status
    } = req.body;
    
    const [existing] = await db.query(
      'SELECT id FROM drivers WHERE id = ?',
      [req.params.id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Водитель не найден' });
    }
    
    if (license_number) {
      const [duplicate] = await db.query(
        'SELECT id FROM drivers WHERE license_number = ? AND id != ?',
        [license_number, req.params.id]
      );
      
      if (duplicate.length > 0) {
        return res.status(400).json({ 
          error: 'Водитель с таким номером прав уже существует' 
        });
      }
    }
    
    await db.query(
      `UPDATE drivers 
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           license_number = COALESCE(?, license_number),
           license_category = COALESCE(?, license_category),
           employment_date = COALESCE(?, employment_date),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [full_name, phone, license_number, license_category, employment_date, status, req.params.id]
    );
    
    res.json({ message: 'Водитель успешно обновлён' });
  } catch (error) {
    console.error('Ошибка обновления водителя:', error);
    res.status(500).json({ error: 'Ошибка обновления водителя' });
  }
});

router.delete('/drivers/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE drivers SET status = ? WHERE id = ?',
      ['inactive', req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Водитель не найден' });
    }
    
    res.json({ message: 'Водитель деактивирован' });
  } catch (error) {
    console.error('Ошибка удаления водителя:', error);
    res.status(500).json({ error: 'Ошибка удаления водителя' });
  }
});


router.get('/vehicles', async (req, res) => {
  try {
    const { status, driver_id } = req.query;
    
    let query = `
      SELECT v.*, d.full_name as default_driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON v.default_driver_id = d.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND v.status = ?';
      params.push(status);
    }
    
    if (driver_id) {
      query += ' AND v.default_driver_id = ?';
      params.push(driver_id);
    }
    
    query += ' ORDER BY v.vehicle_number ASC';
    
    const [vehicles] = await db.query(query, params);
    res.json(vehicles);
  } catch (error) {
    console.error('Ошибка получения транспорта:', error);
    res.status(500).json({ error: 'Ошибка получения транспорта' });
  }
});

router.get('/vehicles/available', async (req, res) => {
  try {
    const [vehicles] = await db.query(`
      SELECT v.*, d.full_name as default_driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON v.default_driver_id = d.id
      WHERE v.status = 'available'
      AND v.id NOT IN (
        SELECT DISTINCT vehicle_id 
        FROM waybills 
        WHERE status = 'in_progress' 
        AND vehicle_id IS NOT NULL
      )
      ORDER BY v.vehicle_number ASC
    `);
    
    res.json(vehicles);
  } catch (error) {
    console.error('Ошибка получения доступного транспорта:', error);
    res.status(500).json({ error: 'Ошибка получения доступного транспорта' });
  }
});

router.get('/vehicles/:id', async (req, res) => {
  try {
    const [vehicles] = await db.query(`
      SELECT v.*, d.full_name as default_driver_name
      FROM vehicles v
      LEFT JOIN drivers d ON v.default_driver_id = d.id
      WHERE v.id = ?
    `, [req.params.id]);
    
    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Транспорт не найден' });
    }
    
    res.json(vehicles[0]);
  } catch (error) {
    console.error('Ошибка получения транспорта:', error);
    res.status(500).json({ error: 'Ошибка получения транспорта' });
  }
});

router.post('/vehicles', async (req, res) => {
  try {
    const {
      vehicle_number,
      brand,
      model,
      year,
      capacity,
      volume,
      fuel_type,
      default_driver_id,
      status = 'available',
      insurance_expiry,
      inspection_expiry
    } = req.body;
    
    if (!vehicle_number || !brand || !model) {
      return res.status(400).json({ 
        error: 'Номер, марка и модель обязательны' 
      });
    }
    
    const [existing] = await db.query(
      'SELECT id FROM vehicles WHERE vehicle_number = ?',
      [vehicle_number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Транспорт с таким номером уже существует' 
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO vehicles 
       (vehicle_number, brand, model, year, capacity, volume, fuel_type, 
        default_driver_id, status, insurance_expiry, inspection_expiry) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicle_number, brand, model, year, capacity, volume, fuel_type, 
       default_driver_id, status, insurance_expiry, inspection_expiry]
    );
    
    res.status(201).json({
      message: 'Транспорт успешно создан',
      vehicleId: result.insertId
    });
  } catch (error) {
    console.error('Ошибка создания транспорта:', error);
    res.status(500).json({ error: 'Ошибка создания транспорта' });
  }
});

router.put('/vehicles/:id', async (req, res) => {
  try {
    const {
      vehicle_number,
      brand,
      model,
      year,
      capacity,
      volume,
      fuel_type,
      default_driver_id,
      status,
      insurance_expiry,
      inspection_expiry
    } = req.body;
    
    const [existing] = await db.query(
      'SELECT id FROM vehicles WHERE id = ?',
      [req.params.id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Транспорт не найден' });
    }
    
    if (vehicle_number) {
      const [duplicate] = await db.query(
        'SELECT id FROM vehicles WHERE vehicle_number = ? AND id != ?',
        [vehicle_number, req.params.id]
      );
      
      if (duplicate.length > 0) {
        return res.status(400).json({ 
          error: 'Транспорт с таким номером уже существует' 
        });
      }
    }
    
    await db.query(
      `UPDATE vehicles 
       SET vehicle_number = COALESCE(?, vehicle_number),
           brand = COALESCE(?, brand),
           model = COALESCE(?, model),
           year = COALESCE(?, year),
           capacity = COALESCE(?, capacity),
           volume = COALESCE(?, volume),
           fuel_type = COALESCE(?, fuel_type),
           default_driver_id = COALESCE(?, default_driver_id),
           status = COALESCE(?, status),
           insurance_expiry = COALESCE(?, insurance_expiry),
           inspection_expiry = COALESCE(?, inspection_expiry)
       WHERE id = ?`,
      [vehicle_number, brand, model, year, capacity, volume, fuel_type, 
       default_driver_id, status, insurance_expiry, inspection_expiry, req.params.id]
    );
    
    res.json({ message: 'Транспорт успешно обновлён' });
  } catch (error) {
    console.error('Ошибка обновления транспорта:', error);
    res.status(500).json({ error: 'Ошибка обновления транспорта' });
  }
});

router.delete('/vehicles/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE vehicles SET status = ? WHERE id = ?',
      ['inactive', req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Транспорт не найден' });
    }
    
    res.json({ message: 'Транспорт деактивирован' });
  } catch (error) {
    console.error('Ошибка удаления транспорта:', error);
    res.status(500).json({ error: 'Ошибка удаления транспорта' });
  }
});


router.get('/waybills', async (req, res) => {
  try {
    const { status, vehicle_id, driver_id } = req.query;
    
    let query = `
      SELECT w.*,
             v.vehicle_number, v.brand, v.model,
             d.full_name as driver_name,
             i.invoice_number
      FROM waybills w
      LEFT JOIN vehicles v ON w.vehicle_id = v.id
      LEFT JOIN drivers d ON w.driver_id = d.id
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND w.status = ?';
      params.push(status);
    }
    
    if (vehicle_id) {
      query += ' AND w.vehicle_id = ?';
      params.push(vehicle_id);
    }
    
    if (driver_id) {
      query += ' AND w.driver_id = ?';
      params.push(driver_id);
    }
    
    query += ' ORDER BY w.created_at DESC';
    
    const [waybills] = await db.query(query, params);
    res.json(waybills);
  } catch (error) {
    console.error('Ошибка получения путевых листов:', error);
    res.status(500).json({ error: 'Ошибка получения путевых листов' });
  }
});

router.get('/waybills/by-invoice/:invoiceId', async (req, res) => {
  try {
    const [waybills] = await db.query(`
      SELECT w.*,
             v.vehicle_number, v.brand, v.model,
             d.full_name as driver_name, d.phone as driver_phone,
             i.invoice_number
      FROM waybills w
      LEFT JOIN vehicles v ON w.vehicle_id = v.id
      LEFT JOIN drivers d ON w.driver_id = d.id
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE w.invoice_id = ?
    `, [req.params.invoiceId]);
    
    if (waybills.length === 0) {
      return res.status(404).json({ error: 'Путевой лист для этой накладной не найден' });
    }
    
    res.json(waybills[0]);
  } catch (error) {
    console.error('Ошибка получения путевого листа:', error);
    res.status(500).json({ error: 'Ошибка получения путевого листа' });
  }
});

router.get('/waybills/:id', async (req, res) => {
  try {
    const [waybills] = await db.query(`
      SELECT w.*,
             v.vehicle_number, v.brand, v.model,
             d.full_name as driver_name, d.phone as driver_phone,
             i.invoice_number
      FROM waybills w
      LEFT JOIN vehicles v ON w.vehicle_id = v.id
      LEFT JOIN drivers d ON w.driver_id = d.id
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE w.id = ?
    `, [req.params.id]);
    
    if (waybills.length === 0) {
      return res.status(404).json({ error: 'Путевой лист не найден' });
    }
    
    res.json(waybills[0]);
  } catch (error) {
    console.error('Ошибка получения путевого листа:', error);
    res.status(500).json({ error: 'Ошибка получения путевого листа' });
  }
});

router.post('/waybills', async (req, res) => {
  try {
    const {
      waybill_number,
      invoice_id,
      vehicle_id,
      driver_id,
      route_from,
      route_to,
      departure_date,
      distance_km,
      fuel_start,
      status = 'pending'
    } = req.body;
    
    if (!waybill_number || !vehicle_id || !driver_id || !route_from || !route_to) {
      return res.status(400).json({ 
        error: 'Номер, транспорт, водитель и маршрут обязательны' 
      });
    }
    
    const [existing] = await db.query(
      'SELECT id FROM waybills WHERE waybill_number = ?',
      [waybill_number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Путевой лист с таким номером уже существует' 
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO waybills 
       (waybill_number, invoice_id, vehicle_id, driver_id, route_from, route_to, 
        departure_date, distance_km, fuel_start, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [waybill_number, invoice_id, vehicle_id, driver_id, route_from, route_to, 
       departure_date, distance_km, fuel_start, status]
    );
    
    if (invoice_id) {
      await db.query(
        'UPDATE invoices SET waybill_id = ?, vehicle_id = ?, driver_id = ? WHERE id = ?',
        [result.insertId, vehicle_id, driver_id, invoice_id]
      );
    }
    
    res.status(201).json({
      message: 'Путевой лист успешно создан',
      waybillId: result.insertId
    });
  } catch (error) {
    console.error('Ошибка создания путевого листа:', error);
    res.status(500).json({ error: 'Ошибка создания путевого листа' });
  }
});

router.put('/waybills/:id', async (req, res) => {
  try {
    const {
      waybill_number,
      invoice_id,
      vehicle_id,
      driver_id,
      route_from,
      route_to,
      departure_date,
      arrival_date,
      distance_km,
      fuel_start,
      fuel_end,
      status
    } = req.body;
    
    const [existing] = await db.query(
      'SELECT id FROM waybills WHERE id = ?',
      [req.params.id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Путевой лист не найден' });
    }
    
    let fuel_consumed = null;
    if (fuel_start && fuel_end) {
      fuel_consumed = fuel_start - fuel_end;
    }
    
    await db.query(
      `UPDATE waybills 
       SET waybill_number = COALESCE(?, waybill_number),
           invoice_id = COALESCE(?, invoice_id),
           vehicle_id = COALESCE(?, vehicle_id),
           driver_id = COALESCE(?, driver_id),
           route_from = COALESCE(?, route_from),
           route_to = COALESCE(?, route_to),
           departure_date = COALESCE(?, departure_date),
           arrival_date = COALESCE(?, arrival_date),
           distance_km = COALESCE(?, distance_km),
           fuel_start = COALESCE(?, fuel_start),
           fuel_end = COALESCE(?, fuel_end),
           fuel_consumed = COALESCE(?, fuel_consumed),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [waybill_number, invoice_id, vehicle_id, driver_id, route_from, route_to, 
       departure_date, arrival_date, distance_km, fuel_start, fuel_end, 
       fuel_consumed, status, req.params.id]
    );
    
    res.json({ message: 'Путевой лист успешно обновлён' });
  } catch (error) {
    console.error('Ошибка обновления путевого листа:', error);
    res.status(500).json({ error: 'Ошибка обновления путевого листа' });
  }
});

router.put('/waybills/:id/complete', async (req, res) => {
  try {
    const { arrival_date, fuel_end } = req.body;
    
    if (!arrival_date || !fuel_end) {
      return res.status(400).json({ 
        error: 'Дата прибытия и конечное топливо обязательны' 
      });
    }
    
    const [waybill] = await db.query(
      'SELECT fuel_start FROM waybills WHERE id = ?',
      [req.params.id]
    );
    
    if (waybill.length === 0) {
      return res.status(404).json({ error: 'Путевой лист не найден' });
    }
    
    const fuel_consumed = waybill[0].fuel_start - fuel_end;
    
    await db.query(
      `UPDATE waybills 
       SET arrival_date = ?, fuel_end = ?, fuel_consumed = ?, status = 'completed'
       WHERE id = ?`,
      [arrival_date, fuel_end, fuel_consumed, req.params.id]
    );
    
    res.json({ 
      message: 'Путевой лист завершён',
      fuel_consumed: fuel_consumed
    });
  } catch (error) {
    console.error('Ошибка завершения путевого листа:', error);
    res.status(500).json({ error: 'Ошибка завершения путевого листа' });
  }
});

router.delete('/waybills/:id', async (req, res) => {
  try {
    const [waybill] = await db.query(
      'SELECT invoice_id FROM waybills WHERE id = ?',
      [req.params.id]
    );
    
    if (waybill.length === 0) {
      return res.status(404).json({ error: 'Путевой лист не найден' });
    }
    
    await db.query('DELETE FROM waybills WHERE id = ?', [req.params.id]);
    
    if (waybill[0].invoice_id) {
      await db.query(
        'UPDATE invoices SET waybill_id = NULL, vehicle_id = NULL, driver_id = NULL WHERE id = ?',
        [waybill[0].invoice_id]
      );
    }
    
    res.json({ message: 'Путевой лист удалён' });
  } catch (error) {
    console.error('Ошибка удаления путевого листа:', error);
    res.status(500).json({ error: 'Ошибка удаления путевого листа' });
  }
});

module.exports = router;
