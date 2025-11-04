const express = require('express');
const router = express.Router();
const db = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const excelService = require('../services/excelService');
const { requireRole } = require('../middleware/auth');
const {
  getPagination,
  parseNumberRange,
  applyDateRange,
  applyNumberRange
} = require('../utils/queryHelpers');

const STATUS_TEXT = {
  pending: 'Ожидает подтверждения',
  in_transit: 'Отправлен клиенту',
  delivered: 'Доставлен получателю',
  cancelled: 'Отменён'
};

const STATUS_TEXT_EXTENDED = {
  pending: 'Документ ожидает обработки сотрудником склада',
  in_transit: 'Накладная передана в логистику и находится в пути',
  delivered: 'Поставка подтверждена и накладная закрыта',
  cancelled: 'Оформление отменено пользователем или администратором'
};

const STATUS_EMOJI = {
  pending: '⏳',
  in_transit: '🚚',
  delivered: '✅',
  cancelled: '❌'
};

function canCurrentUserAccessInvoice(user, invoiceClientId) {
  if (!user || !user.role) {
    return false;
  }
  if (user.role !== 'client') {
    return true;
  }
  return Boolean(user.client_id && user.client_id === invoiceClientId);
}

async function fetchInvoiceWithClient(invoiceId) {
  const [rows] = await db.query(`
    SELECT i.*, c.company_name as client_name, c.email, c.phone, c.address, i.client_id
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `, [invoiceId]);
  return rows;
}

router.get('/', requireRole('admin', 'accountant', 'client'), async (req, res) => {
  try {
    const currentUser = req.user || {};
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();
    const clientIdFilter = req.query.clientId ? Number.parseInt(req.query.clientId, 10) : undefined;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const { min: minAmount, max: maxAmount } = parseNumberRange(req.query, 'minAmount', 'maxAmount');

    const applyUserFilter = async () => {
      if (currentUser.role === 'client') {
        if (!currentUser.client_id) {
          return { conditions: ['1 = 0'], params: [] };
        }
        return { conditions: ['i.client_id = ?'], params: [currentUser.client_id] };
      }

      if (req.query.userRole === 'client' && req.query.userId) {
        const [userRows] = await db.query('SELECT client_id FROM users WHERE id = ?', [req.query.userId]);
        const clientId = userRows[0]?.client_id;
        if (!clientId) {
          return { conditions: ['1 = 0'], params: [] };
        }
        return { conditions: ['i.client_id = ?'], params: [clientId] };
      }

      return { conditions: [], params: [] };
    };

    const { conditions: baseConditions, params: baseParams } = await applyUserFilter();
    const { page, pageSize, offset } = getPagination(req.query);

    const conditions = [...baseConditions];
    const params = [...baseParams];

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      conditions.push('(LOWER(i.invoice_number) LIKE ? OR LOWER(c.company_name) LIKE ?)');
      params.push(term, term);
    }

    if (status) {
      conditions.push('i.status = ?');
      params.push(status);
    }

    if (clientIdFilter) {
      conditions.push('i.client_id = ?');
      params.push(clientIdFilter);
    }

    applyDateRange(conditions, params, 'i.invoice_date', dateFrom, dateTo);
    applyNumberRange(conditions, params, 'i.total_amount', minAmount, maxAmount);

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        ${whereClause}
      `,
      params
    );

    const [rows] = await db.query(
      `
        SELECT 
          i.*,
          c.company_name as client_name
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    res.json({
      items: rows,
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total
    });
  } catch (error) {
    console.error('Не удалось получить список накладных:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/excel', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT i.*, c.company_name as client_name 
      FROM invoices i 
      LEFT JOIN clients c ON i.client_id = c.id 
      ORDER BY i.created_at DESC
    `);

    await excelService.generateInvoicesExcel(invoices, res);
  } catch (error) {
    console.error('Ошибка при выгрузке накладных в Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs/all', requireRole('admin'), async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT 
        il.*,
        i.invoice_number,
        u.username,
        u.full_name,
        u.role as user_role,
        p.avatar
      FROM invoice_logs il
      LEFT JOIN invoices i ON il.invoice_id = i.id
      LEFT JOIN users u ON il.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ORDER BY il.created_at DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    console.error('Не удалось загрузить журнал накладных:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireRole('admin', 'accountant', 'client'), async (req, res) => {
  try {
    const currentUser = req.user || {};
    const invoiceRows = await fetchInvoiceWithClient(req.params.id);

    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Накладная не найдена' });
    }

    const invoice = invoiceRows[0];

    if (!canCurrentUserAccessInvoice(currentUser, invoice.client_id)) {
      return res.status(403).json({ error: 'У вас нет доступа к этой накладной' });
    }

    const [items] = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [req.params.id]
    );

    res.json({ ...invoice, items });
  } catch (error) {
    console.error('Invoice details error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/pdf', requireRole('admin', 'accountant', 'client'), async (req, res) => {
  try {
    const currentUser = req.user || {};
    const invoiceRows = await fetchInvoiceWithClient(req.params.id);

    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Накладная не найдена' });
    }

    const invoice = invoiceRows[0];

    if (!canCurrentUserAccessInvoice(currentUser, invoice.client_id)) {
      return res.status(403).json({ error: 'У вас нет прав на скачивание этой накладной' });
    }

    const [items] = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [req.params.id]
    );

    await pdfService.generateInvoicePDF(invoice, items, res);
  } catch (error) {
    console.error('Ошибка при формировании PDF-файла:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/logs', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT 
        il.*,
        u.username,
        u.full_name,
        u.role
      FROM invoice_logs il
      LEFT JOIN users u ON il.user_id = u.id
      WHERE il.invoice_id = ?
      ORDER BY il.created_at DESC
    `, [req.params.id]);
    res.json(logs);
  } catch (error) {
    console.error('Не удалось получить журнал изменений накладной:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireRole('admin', 'accountant', 'client'), async (req, res) => {
  try {
    const currentUser = req.user || {};
    const {
      invoice_number,
      client_id,
      invoice_date,
      delivery_date,
      status,
      notes,
      items
    } = req.body;

    let targetClientId = client_id;

    if (currentUser.role === 'client') {
      if (!currentUser.client_id) {
        return res.status(403).json({ error: 'У вас нет прав для создания накладной' });
      }
      targetClientId = currentUser.client_id;
    }
    
    const [result] = await db.query(
      'INSERT INTO invoices (invoice_number, client_id, invoice_date, delivery_date, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [invoice_number, targetClientId, invoice_date, delivery_date, status || 'pending', notes]
    );

    const invoiceId = result.insertId;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const product = item.product_id ? 
          await db.query('SELECT name FROM products WHERE id = ?', [item.product_id]) : 
          null;
        const productName = product && product[0] && product[0][0] ? product[0][0].name : (item.product_name || 'Товар');
        
        await db.query(
          'INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
          [invoiceId, item.product_id || null, productName, item.quantity, item.unit_price]
        );
      }
    }

    const [sum] = await db.query(
      'SELECT SUM(total_price) as total FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );
    
    await db.query(
      'UPDATE invoices SET total_amount = ? WHERE id = ?',
      [sum[0].total || 0, invoiceId]
    );

    const [client] = await db.query('SELECT company_name FROM clients WHERE id = ?', [targetClientId]);
    const clientName = client[0]?.company_name || 'Клиент';

    const [admins] = await db.query(
      "SELECT id, username FROM users WHERE role IN ('admin', 'accountant')"
    );

    const io = req.app.get('io');
    
    for (const admin of admins) {
      const [notifResult] = await db.query(
        'INSERT INTO notifications (user_id, type, title, message, invoice_id) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          'new_invoice',
          '📋 Новая накладная ожидает проверки',
          `Клиент "${clientName}" оформил накладную №${invoice_number}`,
          invoiceId
        ]
      );

      if (io) {
        io.to(`user_${admin.id}`).emit('new_notification', {
          id: notifResult.insertId,
          type: 'new_invoice',
          title: '📋 Новая накладная ожидает проверки',
          message: `Клиент "${clientName}" оформил накладную №${invoice_number}`,
          link: `/invoice/${invoiceId}`,
          invoice_id: invoiceId,
          is_read: false,
          created_at: new Date()
        });
      }
    }

    res.status(201).json({ id: invoiceId, message: 'Накладная успешно создана' });
  } catch (error) {
    console.error('Не удалось создать накладную:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { invoice_number, client_id, invoice_date, delivery_date, status, notes, user_id } = req.body;
    const actingUserId = user_id || req.user?.id;
    
    const [oldInvoice] = await db.query('SELECT status, client_id FROM invoices WHERE id = ?', [req.params.id]);
    
    if (oldInvoice.length === 0) {
      return res.status(404).json({ error: 'Накладная не найдена' });
    }
    
    const oldStatus = oldInvoice[0].status;
    
    await db.query(
      'UPDATE invoices SET invoice_number = ?, client_id = ?, invoice_date = ?, delivery_date = ?, status = ?, notes = ? WHERE id = ?',
      [invoice_number, client_id, invoice_date, delivery_date, status, notes, req.params.id]
    );

    if (status && status !== oldStatus && actingUserId) {
      await db.query(
        'INSERT INTO invoice_logs (invoice_id, user_id, action, old_status, new_status, description) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.params.id,
          actingUserId,
          'status_change',
          oldStatus,
          status,
          `Статус изменён с "${STATUS_TEXT_EXTENDED[oldStatus] || oldStatus}" на "${STATUS_TEXT_EXTENDED[status] || status}"`
        ]
      );
    }

    if (status && status !== oldStatus) {
      const [invoiceRows] = await db.query(`
        SELECT i.*, c.company_name as client_name, c.email, u.id as user_id
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN users u ON u.client_id = c.id
        WHERE i.id = ?
      `, [req.params.id]);

      if (invoiceRows.length > 0) {
        const invoiceData = invoiceRows[0];

        if (invoiceData.user_id) {
          const [notifResult] = await db.query(
            'INSERT INTO notifications (user_id, type, title, message, invoice_id) VALUES (?, ?, ?, ?, ?)',
            [
              invoiceData.user_id,
              'invoice_status',
              `${STATUS_EMOJI[status] || ''} Статус накладной обновлён`,
              `Накладная №${invoiceData.invoice_number}: ${STATUS_TEXT[status] || status}`,
              req.params.id
            ]
          );

          const io = req.app.get('io');
          if (io) {
            io.to(`user_${invoiceData.user_id}`).emit('new_notification', {
              id: notifResult.insertId,
              type: 'invoice_status',
              title: `${STATUS_EMOJI[status] || ''} Статус накладной обновлён`,
              message: `Накладная №${invoiceData.invoice_number}: ${STATUS_TEXT[status] || status}`,
              link: `/invoices/${req.params.id}`,
              is_read: false,
              created_at: new Date()
            });
          }
        }

      }
    }

    res.json({ message: 'Накладная успешно обновлена' });
  } catch (error) {
    console.error('Не удалось обновить накладную:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Накладная успешно удалена' });
  } catch (error) {
    console.error('Не удалось удалить накладную:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
