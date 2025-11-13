const express = require('express');
const router = express.Router();
const db = require('../config/database');
const excelService = require('../services/excelService');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reports ORDER BY generated_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function buildRangeClause(column, start, end, alias = null) {
  const conditions = [];
  const params = [];
  if (start) {
    conditions.push(`${alias ? `${alias}.` : ''}${column} >= ?`);
    params.push(start);
  }
  if (end) {
    conditions.push(`${alias ? `${alias}.` : ''}${column} <= ?`);
    params.push(end);
  }
  const clause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

function buildClientFilter(isClient, clientId, alias = '') {
  const normalizedAlias = alias ? `${alias}.` : '';
  return isClient ? `${normalizedAlias}client_id = ?` : null;
}

router.get('/stats', requireRole('admin', 'accountant', 'client'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const currentUser = req.user || {};
    const isClient = currentUser.role === 'client';

    if (isClient && !currentUser.client_id) {
      return res.json({
        income: 0,
        expense: 0,
        profit: 0,
        invoices: {
          total_invoices: 0,
          delivered: 0,
          in_transit: 0,
          pending: 0,
          total_amount: 0
        }
      });
    }

    const clientCondition = buildClientFilter(isClient, currentUser.client_id, 'i');

    const buildTransactionTotal = async (type) => {
      let query = `
        SELECT COALESCE(SUM(t.amount), 0) as total 
        FROM transactions t
        LEFT JOIN invoices i ON i.id = t.invoice_id
        WHERE t.transaction_type = ?
      `;
      const params = [type];
      if (start_date) {
        query += ' AND t.transaction_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND t.transaction_date <= ?';
        params.push(end_date);
      }
      if (clientCondition) {
        query += ` AND ${clientCondition}`;
        params.push(currentUser.client_id);
      }
      const [rows] = await db.query(query, params);
      return rows[0]?.total || 0;
    };

    const incomeTotal = await buildTransactionTotal('income');
    const expenseTotal = await buildTransactionTotal('expense');

    const { clause: invoiceClause, params: invoiceParams } = buildRangeClause(
      'invoice_date',
      start_date,
      end_date
    );

    const invoiceConditions = [];
    if (invoiceClause) {
      invoiceConditions.push(invoiceClause.replace(' WHERE ', ''));
    }
    if (isClient) {
      invoiceConditions.push('client_id = ?');
      invoiceParams.push(currentUser.client_id);
    }
    const whereClause = invoiceConditions.length ? `WHERE ${invoiceConditions.join(' AND ')}` : '';

    const [invoiceStats] = await db.query(
      `
        SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(total_amount) as total_amount
        FROM invoices
        ${whereClause}
      `,
      invoiceParams
    );

    res.json({
      income: incomeTotal,
      expense: expenseTotal,
      profit: incomeTotal - expenseTotal,
      invoices: invoiceStats[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/excel', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let incomeQuery = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE transaction_type = 'income'
    `;
    const incomeParams = [];
    if (start_date) {
      incomeQuery += ' AND transaction_date >= ?';
      incomeParams.push(start_date);
    }
    if (end_date) {
      incomeQuery += ' AND transaction_date <= ?';
      incomeParams.push(end_date);
    }
    const [income] = await db.query(incomeQuery, incomeParams);

    let expenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE transaction_type = 'expense'
    `;
    const expenseParams = [];
    if (start_date) {
      expenseQuery += ' AND transaction_date >= ?';
      expenseParams.push(start_date);
    }
    if (end_date) {
      expenseQuery += ' AND transaction_date <= ?';
      expenseParams.push(end_date);
    }
    const [expense] = await db.query(expenseQuery, expenseParams);

    const { clause: invoiceClause, params: invoiceParams } = buildRangeClause(
      'invoice_date',
      start_date,
      end_date
    );

    const [invoiceStats] = await db.query(
      `
        SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(total_amount) as total_amount
        FROM invoices
        ${invoiceClause}
      `,
      invoiceParams
    );

    const { clause: transactionsClause, params: transactionsParams } = buildRangeClause(
      'transaction_date',
      start_date,
      end_date
    );
    const [transactions] = await db.query(
      `
        SELECT * FROM transactions
        ${transactionsClause}
        ORDER BY transaction_date DESC
      `,
      transactionsParams
    );

    const { clause: invoicesListClause, params: invoicesListParams } = buildRangeClause(
      'invoice_date',
      start_date,
      end_date,
      'i'
    );
    const [invoicesList] = await db.query(
      `
        SELECT i.*, c.company_name as client_name 
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id
        ${invoicesListClause}
        ORDER BY i.invoice_date DESC
      `,
      invoicesListParams
    );

    const reportData = {
      start_date,
      end_date,
      income: income[0].total,
      expense: expense[0].total,
      profit: income[0].total - expense[0].total,
      invoices: invoiceStats[0],
      transactions,
      invoicesList
    };

    await excelService.generateFinancialReportExcel(reportData, res);
  } catch (error) {
    console.error('Ошибка генерации отчёта:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { report_type, start_date, end_date } = req.body;
    
    const [income] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = "income" AND transaction_date BETWEEN ? AND ?',
      [start_date, end_date]
    );

    const [expense] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = "expense" AND transaction_date BETWEEN ? AND ?',
      [start_date, end_date]
    );

    const [result] = await db.query(
      'INSERT INTO reports (report_type, start_date, end_date, total_income, total_expense) VALUES (?, ?, ?, ?, ?)',
      [report_type, start_date, end_date, income[0].total, expense[0].total]
    );

    res.status(201).json({ id: result.insertId, message: 'Отчёт сформирован' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
