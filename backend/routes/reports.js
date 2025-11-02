const express = require('express');
const router = express.Router();
const db = require('../config/database');
const excelService = require('../services/excelService');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reports ORDER BY generated_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const [income] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE transaction_type = 'income' 
      ${start_date ? 'AND transaction_date >= ?' : ''} 
      ${end_date ? 'AND transaction_date <= ?' : ''}
    `, [start_date, end_date].filter(Boolean));

    const [expense] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE transaction_type = 'expense' 
      ${start_date ? 'AND transaction_date >= ?' : ''} 
      ${end_date ? 'AND transaction_date <= ?' : ''}
    `, [start_date, end_date].filter(Boolean));

    const [invoiceStats] = await db.query(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(total_amount) as total_amount
      FROM invoices
      ${start_date ? 'WHERE invoice_date >= ?' : ''} 
      ${end_date ? 'AND invoice_date <= ?' : ''}
    `, [start_date, end_date].filter(Boolean));

    res.json({
      income: income[0].total,
      expense: expense[0].total,
      profit: income[0].total - expense[0].total,
      invoices: invoiceStats[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const [income] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE transaction_type = 'income' 
      ${start_date ? 'AND transaction_date >= ?' : ''} 
      ${end_date ? 'AND transaction_date <= ?' : ''}
    `, [start_date, end_date].filter(Boolean));

    const [expense] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE transaction_type = 'expense' 
      ${start_date ? 'AND transaction_date >= ?' : ''} 
      ${end_date ? 'AND transaction_date <= ?' : ''}
    `, [start_date, end_date].filter(Boolean));

    const [invoiceStats] = await db.query(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(total_amount) as total_amount
      FROM invoices
      ${start_date ? 'WHERE invoice_date >= ?' : ''} 
      ${end_date ? 'AND invoice_date <= ?' : ''}
    `, [start_date, end_date].filter(Boolean));

    const [transactions] = await db.query(`
      SELECT * FROM transactions 
      ${start_date ? 'WHERE transaction_date >= ?' : ''} 
      ${end_date ? 'AND transaction_date <= ?' : ''}
      ORDER BY transaction_date DESC
    `, [start_date, end_date].filter(Boolean));

    const [invoicesList] = await db.query(`
      SELECT i.*, c.company_name as client_name 
      FROM invoices i 
      LEFT JOIN clients c ON i.client_id = c.id
      ${start_date ? 'WHERE i.invoice_date >= ?' : ''} 
      ${end_date ? 'AND i.invoice_date <= ?' : ''}
      ORDER BY i.invoice_date DESC
    `, [start_date, end_date].filter(Boolean));

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
    console.error('Ошибка экспорта отчета:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
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

    res.status(201).json({ id: result.insertId, message: 'Отчет создан' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

