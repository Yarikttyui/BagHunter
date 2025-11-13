const ExcelJS = require('exceljs');


async function generateFinancialReportExcel(reportData, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Логистическая система';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Общая статистика', {
      properties: { tabColor: { argb: '667eea' } }
    });

    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'ФИНАНСОВЫЙ ОТЧЕТ';
    titleCell.font = { size: 18, bold: true, color: { argb: '667eea' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:E2');
    const periodCell = summarySheet.getCell('A2');
    periodCell.value = `Период: ${reportData.start_date || 'Начало'} — ${reportData.end_date || 'Конец'}`;
    periodCell.font = { size: 12, italic: true };
    periodCell.alignment = { horizontal: 'center' };

    summarySheet.addRow([]);
    summarySheet.addRow(['Показатель', 'Значение']);
    
    const headerRow = summarySheet.getRow(4);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '667eea' }
    };

    summarySheet.addRow(['Общий доход', formatCurrency(reportData.income || 0)]);
    summarySheet.addRow(['Общие расходы', formatCurrency(reportData.expense || 0)]);
    summarySheet.addRow(['Чистая прибыль', formatCurrency(reportData.profit || 0)]);
    summarySheet.addRow(['Всего накладных', reportData.invoices?.total_invoices || 0]);
    summarySheet.addRow(['Доставлено', reportData.invoices?.delivered || 0]);
    summarySheet.addRow(['В пути', reportData.invoices?.in_transit || 0]);
    summarySheet.addRow(['Ожидает', reportData.invoices?.pending || 0]);
    summarySheet.addRow(['Отменено', reportData.invoices?.cancelled || 0]);
    summarySheet.addRow(['Сумма накладных', formatCurrency(reportData.invoices?.total_amount || 0)]);

    for (let i = 5; i <= 13; i++) {
      const row = summarySheet.getRow(i);
      row.getCell(1).font = { bold: true };
      const valueCell = row.getCell(2);
      if (i === 5) {
        valueCell.font = { bold: true, color: { argb: '28a745' } };
      } else if (i === 6) {
        valueCell.font = { bold: true, color: { argb: 'dc3545' } };
      } else if (i === 7) {
        valueCell.font = { bold: true, color: { argb: reportData.profit >= 0 ? '28a745' : 'dc3545' } };
      } else {
        valueCell.font = { bold: true, color: { argb: '667eea' } };
      }
    }

    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 20;

    ['A4', 'B4', 'A5', 'B5', 'A6', 'B6', 'A7', 'B7', 'A8', 'B8', 'A9', 'B9', 'A10', 'B10', 'A11', 'B11', 'A12', 'B12', 'A13', 'B13'].forEach(cell => {
      summarySheet.getCell(cell).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    if (reportData.transactions && reportData.transactions.length > 0) {
      const transSheet = workbook.addWorksheet('Транзакции', {
        properties: { tabColor: { argb: '28a745' } }
      });

      transSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Тип', key: 'type', width: 15 },
        { header: 'Сумма', key: 'amount', width: 15 },
        { header: 'Дата', key: 'date', width: 15 },
        { header: 'Метод оплаты', key: 'method', width: 20 },
        { header: 'Описание', key: 'description', width: 40 }
      ];

      const headerRow2 = transSheet.getRow(1);
      headerRow2.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '28a745' }
      };

      reportData.transactions.forEach(trans => {
        transSheet.addRow({
          id: trans.id,
          type: trans.transaction_type === 'income' ? 'Доход' : 'Расход',
          amount: formatCurrency(trans.amount),
          date: formatDate(trans.transaction_date),
          method: trans.payment_method,
          description: trans.description || '-'
        });
      });

      transSheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }

    if (reportData.invoicesList && reportData.invoicesList.length > 0) {
      const invSheet = workbook.addWorksheet('Накладные', {
        properties: { tabColor: { argb: 'ffc107' } }
      });

      invSheet.columns = [
        { header: 'Номер', key: 'number', width: 15 },
        { header: 'Клиент', key: 'client', width: 25 },
        { header: 'Дата', key: 'date', width: 15 },
        { header: 'Доставка', key: 'delivery', width: 15 },
        { header: 'Статус', key: 'status', width: 15 },
        { header: 'Сумма', key: 'amount', width: 15 }
      ];

      const headerRow3 = invSheet.getRow(1);
      headerRow3.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ffc107' }
      };

      reportData.invoicesList.forEach(inv => {
        invSheet.addRow({
          number: inv.invoice_number,
          client: inv.client_name,
          date: formatDate(inv.invoice_date),
          delivery: formatDate(inv.delivery_date),
          status: getStatusText(inv.status),
          amount: formatCurrency(inv.total_amount)
        });
      });

      invSheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=financial-report-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Ошибка генерации Excel:', error);
    throw error;
  }
}


async function generateInvoicesExcel(invoices, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Накладные');

    sheet.columns = [
      { header: '№ Накладной', key: 'number', width: 15 },
      { header: 'Клиент', key: 'client', width: 30 },
      { header: 'Дата накладной', key: 'date', width: 15 },
      { header: 'Дата доставки', key: 'delivery', width: 15 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Сумма', key: 'amount', width: 15 },
      { header: 'Примечания', key: 'notes', width: 40 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '667eea' }
    };

    invoices.forEach(inv => {
      sheet.addRow({
        number: inv.invoice_number,
        client: inv.client_name,
        date: formatDate(inv.invoice_date),
        delivery: formatDate(inv.delivery_date),
        status: getStatusText(inv.status),
        amount: formatCurrency(inv.total_amount),
        notes: inv.notes || '-'
      });
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Ошибка генерации Excel:', error);
    throw error;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ru-RU');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  }).format(amount || 0);
}

function getStatusText(status) {
  const statuses = {
    pending: 'Ожидает',
    in_transit: 'В пути',
    delivered: 'Доставлено',
    cancelled: 'Отменено'
  };
  return statuses[status] || status;
}

module.exports = {
  generateFinancialReportExcel,
  generateInvoicesExcel
};
