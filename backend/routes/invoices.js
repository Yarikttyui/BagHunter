const express = require('express');
const router = express.Router();
const db = require('../config/database');
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

function getStatusChangeDescription(oldStatus, newStatus) {
  return `\u0421\u0442\u0430\u0442\u0443\u0441 \u0438\u0437\u043c\u0435\u043d\u0451\u043d \u0441 \"${STATUS_TEXT_EXTENDED[oldStatus] || oldStatus}\" \u043d\u0430 \"${STATUS_TEXT_EXTENDED[newStatus] || newStatus}\"`;
}

const LOG_DESCRIPTIONS = {
  created: '\u041d\u0430\u043a\u043b\u0430\u0434\u043d\u0430\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0430',
  updated: '\u0414\u0430\u043d\u043d\u044b\u0435 \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u043e\u0439 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b'
};

const NOTIFICATION_TEXT = {
  newInvoiceTitle: '\u041d\u043e\u0432\u0430\u044f \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u0430\u044f \u043e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438',
  statusUpdatedTitle: '\u0421\u0442\u0430\u0442\u0443\u0441 \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u043e\u0439 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d'
};

function buildNewInvoiceNotificationMessage(clientName, invoiceNumber) {
  return `\u041a\u043b\u0438\u0435\u043d\u0442 \"${clientName}\" \u043e\u0444\u043e\u0440\u043c\u0438\u043b \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u0443\u044e №${invoiceNumber}`;
}

function buildStatusNotificationMessage(invoiceNumber, status) {
  return `\u041d\u0430\u043a\u043b\u0430\u0434\u043d\u0430\u044f №${invoiceNumber}: ${STATUS_TEXT[status] || status}`;
}

async function notifyStaffAboutNewInvoice({ invoiceId, clientId, invoiceNumber, req, initiatorRole }) {
  if (initiatorRole !== 'client') {
    return;
  }

  try {
    const [[client]] = await db.query('SELECT company_name FROM clients WHERE id = ?', [clientId]);
    const clientName = client?.company_name || 'Клиент';
    const [staffRows] = await db.query(
      "SELECT id FROM users WHERE role IN ('admin', 'accountant')"
    );

    if (!staffRows.length) {
      return;
    }

    const io = req.app.get('io');
    const message = buildNewInvoiceNotificationMessage(clientName, invoiceNumber);

    for (const staff of staffRows) {
      const [notifResult] = await db.query(
        'INSERT INTO notifications (user_id, type, title, message, invoice_id) VALUES (?, ?, ?, ?, ?)',
        [staff.id, 'new_invoice', NOTIFICATION_TEXT.newInvoiceTitle, message, invoiceId]
      );

      if (io) {
        io.to(`user_${staff.id}`).emit('new_notification', {
          id: notifResult.insertId,
          type: 'new_invoice',
          title: NOTIFICATION_TEXT.newInvoiceTitle,
          message,
          link: `/invoices/${invoiceId}`,
          invoice_id: invoiceId,
          is_read: false,
          created_at: new Date()
        });
      }
    }
  } catch (error) {
    console.error('[invoices] failed to notify staff about new invoice:', error);
  }
}

async function notifyClientAboutInvoiceEvent({ clientId, invoiceId, invoiceNumber, type, title, message, req }) {
  if (!clientId) {
    return;
  }

  try {
    const [clientUsers] = await db.query('SELECT id FROM users WHERE client_id = ?', [clientId]);
    if (!clientUsers.length) {
      return;
    }

    const io = req.app.get('io');

    for (const clientUser of clientUsers) {
      const [notifResult] = await db.query(
        'INSERT INTO notifications (user_id, type, title, message, invoice_id) VALUES (?, ?, ?, ?, ?)',
        [clientUser.id, type, title, message, invoiceId]
      );

      if (io) {
        io.to(`user_${clientUser.id}`).emit('new_notification', {
          id: notifResult.insertId,
          type,
          title,
          message,
          link: `/invoices/${invoiceId}`,
          invoice_id: invoiceId,
          is_read: false,
          created_at: new Date()
        });
      }
    }
  } catch (error) {
    console.error('[invoices] failed to notify client users:', error);
  }
}


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
  let connection;
  let invoiceId;
  let targetClientId = null;
  let invoiceNumberPayload = null;

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
    invoiceNumberPayload = invoice_number;

    if (!delivery_date) {
      return res.status(400).json({ error: 'Желаемая дата доставки обязательна' });
    }

    const normalizedInvoiceDate = new Date().toISOString().split('T')[0];
    const normalizedNotes = notes || null;

    targetClientId = client_id;

    if (currentUser.role === 'client') {
      if (!currentUser.client_id) {
        return res.status(403).json({ error: 'У вас нет прав для создания накладной' });
      }
      targetClientId = currentUser.client_id;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO invoices (invoice_number, client_id, invoice_date, delivery_date, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [
        invoice_number,
        targetClientId,
        normalizedInvoiceDate,
        delivery_date,
        status || 'pending',
        normalizedNotes
      ]
    );

    invoiceId = result.insertId;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        let productName = item.product_name || 'Товар';

        if (item.product_id) {
          const [productRows] = await connection.query('SELECT name FROM products WHERE id = ?', [item.product_id]);
          if (Array.isArray(productRows) && productRows[0] && productRows[0].name) {
            productName = productRows[0].name;
          }
        }

        await connection.query(
          'INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
          [invoiceId, item.product_id || null, productName, item.quantity, item.unit_price]
        );
      }
    }

    const [sumRows] = await connection.query(
      'SELECT SUM(total_price) as total FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );
    const totalAmount = sumRows[0]?.total || 0;

    await connection.query(
      'UPDATE invoices SET total_amount = ? WHERE id = ?',
      [totalAmount, invoiceId]
    );

    await connection.query(
      'INSERT INTO invoice_logs (invoice_id, user_id, action, old_status, new_status, description) VALUES (?, ?, ?, ?, ?, ?)',
      [
        invoiceId,
        currentUser.id || null,
        'created',
        null,
        status || 'pending',
        LOG_DESCRIPTIONS.created
      ]
    );

    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[invoices] rollback failed during create:', rollbackError);
      }
    }
    console.error('Не удалось создать накладную:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('[invoices] release failed after create:', releaseError);
      }
    }
  }

  const safeInvoiceNumber = invoiceNumberPayload || `INV-${invoiceId}`;

  await notifyStaffAboutNewInvoice({
    invoiceId,
    clientId: targetClientId,
    invoiceNumber: safeInvoiceNumber,
    req,
    initiatorRole: req.user?.role
  });

  return res.status(201).json({ id: invoiceId, message: 'Накладная успешно создана' });
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const {
      invoice_number,
      client_id,
      delivery_date,
      status,
      notes,
      user_id
    } = req.body;
    const actingUserId = user_id || req.user?.id;

    if (!delivery_date) {
      return res.status(400).json({ error: '\u0416\u0435\u043b\u0430\u0435\u043c\u0430\u044f \u0434\u0430\u0442\u0430 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430' });
    }

    const [existingRows] = await db.query(
      'SELECT invoice_date, status, client_id FROM invoices WHERE id = ?',
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: '\u041d\u0430\u043a\u043b\u0430\u0434\u043d\u0430\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430' });
    }

    const existingInvoice = existingRows[0];
    const preservedInvoiceDate = existingInvoice.invoice_date
      ? new Date(existingInvoice.invoice_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const normalizedNotes = notes || null;
    const nextStatus = status || existingInvoice.status;

    await db.query(
      'UPDATE invoices SET invoice_number = ?, client_id = ?, invoice_date = ?, delivery_date = ?, status = ?, notes = ? WHERE id = ?',
      [
        invoice_number,
        client_id,
        preservedInvoiceDate,
        delivery_date,
        nextStatus,
        normalizedNotes,
        req.params.id
      ]
    );

    if (nextStatus !== existingInvoice.status) {
      await db.query(
        'INSERT INTO invoice_logs (invoice_id, user_id, action, old_status, new_status, description) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.params.id,
          actingUserId || null,
          'status_changed',
          existingInvoice.status,
          nextStatus,
          getStatusChangeDescription(existingInvoice.status, nextStatus)
        ]
      );

      await notifyClientAboutInvoiceEvent({
        clientId: existingInvoice.client_id,
        invoiceId: Number(req.params.id),
        invoiceNumber: invoice_number || existingInvoice.invoice_number,
        type: 'invoice_status',
        title: NOTIFICATION_TEXT.statusUpdatedTitle,
        message: buildStatusNotificationMessage(invoice_number || existingInvoice.invoice_number, nextStatus),
        req
      });
    } else {
      await db.query(
        'INSERT INTO invoice_logs (invoice_id, user_id, action, old_status, new_status, description) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.params.id,
          actingUserId || null,
          'updated',
          existingInvoice.status,
          nextStatus,
          LOG_DESCRIPTIONS.updated
        ]
      );

      await notifyClientAboutInvoiceEvent({
        clientId: existingInvoice.client_id,
        invoiceId: Number(req.params.id),
        invoiceNumber: invoice_number || existingInvoice.invoice_number,
        type: 'invoice_update',
        title: 'Обновление накладной',
        message: `Накладная №${invoice_number || existingInvoice.invoice_number} была обновлена администратором`,
        req
      });
    }

    res.json({ message: 'Накладная успешно обновлена' });
  } catch (error) {
    console.error('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u0443\u044e:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Накладная успешно обновлена' });
  } catch (error) {
    console.error('Не удалось удалить накладную:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
