const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const STATUS_META = {
  pending: { label: 'Ожидает обработки', color: '#facc15', textColor: '#854d0e', icon: '⏳' },
  in_transit: { label: 'В пути', color: '#38bdf8', textColor: '#0c4a6e', icon: '🚚' },
  delivered: { label: 'Доставлено', color: '#4ade80', textColor: '#14532d', icon: '✅' },
  cancelled: { label: 'Отменено', color: '#f87171', textColor: '#7f1d1d', icon: '⛔' },
  default: { label: 'Статус не указан', color: '#9ca3af', textColor: '#1f2937', icon: 'ℹ️' }
};

const PALETTE = {
  background: '#ffffff',
  border: '#d1d5db',
  borderStrong: '#9ca3af',
  textPrimary: '#101828',
  textMuted: '#4b5563',
  headerFill: '#f3f4f6',
  tableStripe: '#f9fafb'
};

async function generateInvoicePDF(invoiceData, items = [], res) {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: `Товарная накладная ${invoiceData.invoice_number}`,
        Author: 'Логистическая система BagHunter'
      }
    });

    const fontsPath = path.join(__dirname, '../fonts');
    let regularFont = path.join(fontsPath, 'DejaVuSans.ttf');
    let boldFont = path.join(fontsPath, 'DejaVuSans-Bold.ttf');

    if (!fs.existsSync(regularFont) || !fs.existsSync(boldFont)) {
      const fallbackPath = path.join(__dirname, '../node_modules/dejavu-fonts-ttf/ttf');
      regularFont = path.join(fallbackPath, 'DejaVuSans.ttf');
      boldFont = path.join(fallbackPath, 'DejaVuSans-Bold.ttf');
    }

    const hasCustomFonts = fs.existsSync(regularFont) && fs.existsSync(boldFont);
    const regularFontName = hasCustomFonts ? 'Regular' : 'Helvetica';
    const boldFontName = hasCustomFonts ? 'Bold' : 'Helvetica-Bold';

    if (hasCustomFonts) {
      doc.registerFont('Regular', regularFont);
      doc.registerFont('Bold', boldFont);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoiceData.invoice_number}.pdf`
    );

    doc.pipe(res);
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(PALETTE.background);
    doc.font(regularFontName).fillColor(PALETTE.textPrimary);

    const margin = doc.page.margins.left;
    const contentWidth = doc.page.width - margin * 2;
    const logoPath = path.join(__dirname, '../uploads/company-logo.png');
    const logoExists = fs.existsSync(logoPath);

    drawHeader(doc, {
      x: margin,
      y: margin,
      width: contentWidth,
      invoice: invoiceData,
      fonts: { regular: regularFontName, bold: boldFontName },
      palette: PALETTE,
      statusMeta: getStatusMeta(invoiceData.status),
      logoPath: logoExists ? logoPath : null
    });

    let cursorY = margin + 120;

    const leftInfoHeight = drawInfoCard(doc, {
      x: margin,
      y: cursorY,
      width: (contentWidth - 16) / 2,
      title: 'Клиент',
      rows: [
        { label: 'Компания', value: invoiceData.client_name || 'Не указано' },
        { label: 'ИНН', value: invoiceData.inn || 'Не указан' },
        { label: 'Email', value: invoiceData.email || 'Не указан' },
        { label: 'Телефон', value: invoiceData.phone || 'Не указан' },
        { label: 'Адрес', value: invoiceData.address || 'Не указан' }
      ],
      fonts: { regular: regularFontName, bold: boldFontName },
      palette: PALETTE
    });

    const rightInfoHeight = drawInfoCard(doc, {
      x: margin + (contentWidth - 16) / 2 + 16,
      y: cursorY,
      width: (contentWidth - 16) / 2,
      title: 'Доставка',
      rows: [
        { label: 'Дата накладной', value: formatDate(invoiceData.invoice_date) },
        {
          label: 'Плановая доставка',
          value: invoiceData.delivery_date ? formatDate(invoiceData.delivery_date) : 'Не указана'
        },
        { label: 'Статус', value: getStatusMeta(invoiceData.status).label },
        { label: 'Позиций', value: `${Math.max(items.length, 1)}` },
        { label: 'Сумма', value: formatCurrency(invoiceData.total_amount) }
      ],
      fonts: { regular: regularFontName, bold: boldFontName },
      palette: PALETTE
    });

    cursorY += Math.max(leftInfoHeight, rightInfoHeight) + 24;

    const tableBottom = drawItemsTable(doc, {
      x: margin,
      y: cursorY,
      width: contentWidth,
      items,
      fonts: { regular: regularFontName, bold: boldFontName },
      palette: PALETTE,
      margin
    });

    cursorY = tableBottom + 24;

    const totalsHeight = drawTotalsBlock(doc, {
      x: margin,
      y: cursorY,
      width: contentWidth,
      amount: invoiceData.total_amount,
      itemsCount: items.length,
      fonts: { regular: regularFontName, bold: boldFontName },
      palette: PALETTE
    });

    cursorY += totalsHeight + 24;

    if (invoiceData.notes) {
      const notesHeight = drawNotesBlock(doc, {
        x: margin,
        y: cursorY,
        width: contentWidth,
        note: invoiceData.notes,
        fonts: { regular: regularFontName, bold: boldFontName },
        palette: PALETTE
      });
      cursorY += notesHeight + 24;
    }

    drawSignatureBlock(doc, {
      x: margin,
      y: cursorY,
      width: contentWidth,
      fonts: { regular: regularFontName },
      palette: PALETTE
    });

    drawFooter(doc, {
      margin,
      width: contentWidth,
      fonts: { regular: regularFontName },
      palette: PALETTE
    });

    addNotesPage(doc, {
      margin,
      width: contentWidth,
      fonts: { regular: regularFontName, bold: boldFontName },
      palette: PALETTE
    });

    doc.end();
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    throw error;
  }
}

function drawHeader(doc, { x, y, width, invoice, fonts, palette, statusMeta, logoPath }) {
  doc.save();
  doc.roundedRect(x, y, width, 110, 8).fill('#ffffff');
  doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, y, width, 110, 8).stroke();
  doc.restore();

  if (logoPath) {
    doc.image(logoPath, x + width - 150, y + 18, { width: 120, height: 36, fit: [120, 36] });
  }

  doc.font(fonts.bold).fontSize(24).fillColor(palette.textPrimary);
  doc.text('ТОВАРНАЯ НАКЛАДНАЯ', x + 22, y + 20);

  doc.font(fonts.regular).fontSize(12).fillColor(palette.textMuted);
  doc.text(`№ ${invoice.invoice_number}`, x + 22, y + 58);
  doc.text(`от ${formatDate(invoice.invoice_date)}`, x + 22, y + 74);

  drawStatusBadge(doc, {
    x: x + width - 210,
    y: y + 70,
    width: 192,
    height: 30,
    statusMeta,
    fonts,
    palette
  });
}

function drawStatusBadge(doc, { x, y, width, height, statusMeta, fonts }) {
  doc.save();
  doc.fillColor(statusMeta.color);
  doc.roundedRect(x, y, width, height, height / 2).fill();
  doc.restore();

  doc.font(fonts.bold)
    .fontSize(11)
    .fillColor(statusMeta.textColor)
    .text(`${statusMeta.icon} ${statusMeta.label}`, x, y + height / 2 - 6, { width, align: 'center' });
}

function drawInfoCard(doc, { x, y, width, title, rows, fonts, palette }) {
  const rowGap = 28;
  const height = rows.length * rowGap + 54;

  doc.save();
  doc.roundedRect(x, y, width, height, 8).fill('#ffffff');
  doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, y, width, height, 8).stroke();
  doc.restore();

  doc.font(fonts.bold).fontSize(11).fillColor(palette.textPrimary);
  doc.text(title.toUpperCase(), x + 18, y + 16);

  let cursor = y + 40;
  rows.forEach((row) => {
    doc.font(fonts.bold).fontSize(9).fillColor(palette.textMuted);
    doc.text(row.label.toUpperCase(), x + 18, cursor, { width: width - 36 });

    doc.font(fonts.regular).fontSize(11).fillColor(palette.textPrimary);
    doc.text(row.value || '—', x + 18, cursor + 11, { width: width - 36 });

    cursor += rowGap;
  });

  return height;
}

function drawItemsTable(doc, { x, y, width, items, fonts, palette, margin }) {
  const columns = [
    { header: '№', width: 40, align: 'center', accessor: (_, idx) => `${idx + 1}` },
    {
      header: 'Наименование',
      width: width - 310,
      align: 'left',
      accessor: (item) => item.product_name || '—'
    },
    {
      header: 'Кол-во',
      width: 90,
      align: 'right',
      accessor: (item) => formatNumber(item.quantity)
    },
    {
      header: 'Цена',
      width: 100,
      align: 'right',
      accessor: (item) => formatCurrency(item.unit_price)
    },
    {
      header: 'Сумма',
      width: 120,
      align: 'right',
      accessor: (item) =>
        formatCurrency(item.total_price ?? Number(item.quantity || 0) * Number(item.unit_price || 0))
    }
  ];

  const headerHeight = 30;
  const rowHeight = 26;

  doc.save();
  doc.roundedRect(x, y, width, headerHeight, 6).fill(PALETTE.headerFill);
  doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, y, width, headerHeight, 6).stroke();
  doc.restore();

  let cursorX = x;
  columns.forEach((col) => {
    doc.font(fonts.bold).fontSize(10).fillColor(palette.textPrimary);
    doc.text(col.header, cursorX + 10, y + 8, { width: col.width - 20, align: col.align });
    cursorX += col.width;
  });

  let cursorY = y + headerHeight;
  const data = Array.isArray(items) && items.length ? items : [];

  if (!data.length) {
    doc.save();
    doc.roundedRect(x, cursorY, width, rowHeight, 6).fill('#ffffff');
    doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, cursorY, width, rowHeight, 6).stroke();
    doc.restore();

    doc.font(fonts.regular).fontSize(10).fillColor(palette.textMuted);
    doc.text('В накладной нет позиций', x + 12, cursorY + 7, { width: width - 24 });
    return cursorY + rowHeight;
  }

  data.forEach((item, index) => {
    if (cursorY + rowHeight > doc.page.height - margin - 100) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(PALETTE.background);
      doc.font(fonts.regular).fillColor(palette.textPrimary);
      cursorY = margin;

      doc.save();
      doc.roundedRect(x, cursorY, width, headerHeight, 6).fill(PALETTE.headerFill);
      doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, cursorY, width, headerHeight, 6).stroke();
      doc.restore();

      cursorX = x;
      columns.forEach((col) => {
        doc.font(fonts.bold).fontSize(10).fillColor(palette.textPrimary);
        doc.text(col.header, cursorX + 10, cursorY + 8, { width: col.width - 20, align: col.align });
        cursorX += col.width;
      });

      cursorY += headerHeight;
    }

    const isEven = index % 2 === 0;
    doc.save();
    doc.fillColor(isEven ? '#ffffff' : PALETTE.tableStripe);
    doc.rect(x, cursorY, width, rowHeight).fill();
    doc.restore();

    doc.save();
    doc.strokeColor(palette.border);
    doc.rect(x, cursorY, width, rowHeight).stroke();
    doc.restore();

    let cellX = x;
    columns.forEach((col) => {
      const value = col.accessor(item, index);
      doc.font(fonts.regular).fontSize(10).fillColor(palette.textPrimary);
      doc.text(value, cellX + 10, cursorY + 7, {
        width: col.width - 20,
        align: col.align,
        lineBreak: false
      });
      cellX += col.width;
    });

    cursorY += rowHeight;
  });

  return cursorY;
}

function drawTotalsBlock(doc, { x, y, width, amount, itemsCount, fonts, palette }) {
  const height = 70;

  doc.save();
  doc.roundedRect(x, y, width, height, 8).fill('#ffffff');
  doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, y, width, height, 8).stroke();
  doc.restore();

  doc.font(fonts.bold).fontSize(12).fillColor(palette.textPrimary);
  doc.text('ИТОГО К ОПЛАТЕ', x + 20, y + 20);

  doc.font(fonts.regular).fontSize(10).fillColor(palette.textMuted);
  doc.text(`${itemsCount} позиций · цены указаны в рублях`, x + 20, y + 38);

  doc.font(fonts.bold).fontSize(20).fillColor(palette.textPrimary);
  doc.text(formatCurrency(amount), x + width - 220, y + 26, { width: 200, align: 'right' });

  return height;
}

function drawNotesBlock(doc, { x, y, width, note, fonts, palette }) {
  doc.font(fonts.regular).fontSize(10);
  const textHeight = doc.heightOfString(note, { width: width - 40 });
  const height = Math.max(90, textHeight + 48);

  doc.save();
  doc.roundedRect(x, y, width, height, 8).fill('#ffffff');
  doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, y, width, height, 8).stroke();
  doc.restore();

  doc.font(fonts.bold).fontSize(11).fillColor(palette.textPrimary);
  doc.text('Комментарий', x + 18, y + 16);

  doc.font(fonts.regular).fontSize(10).fillColor(palette.textMuted);
  doc.text(note, x + 18, y + 36, { width: width - 36 });

  return height;
}

function drawSignatureBlock(doc, { x, y, width, fonts, palette }) {
  const blockHeight = 70;

  doc.save();
  doc.roundedRect(x, y, width, blockHeight, 8).fill('#ffffff');
  doc.strokeColor(palette.border).lineWidth(1).roundedRect(x, y, width, blockHeight, 8).stroke();
  doc.restore();

  const lineWidth = 220;
  const lineY = y + 32;

  doc.save();
  doc.strokeColor(palette.borderStrong).lineWidth(1);
  doc.moveTo(x + 40, lineY).lineTo(x + 40 + lineWidth, lineY).stroke();
  doc.moveTo(x + width - lineWidth - 40, lineY).lineTo(x + width - 40, lineY).stroke();
  doc.restore();

  doc.font(fonts.regular).fontSize(9).fillColor(palette.textMuted);
  doc.text('Ответственный', x + 40, lineY + 6);
  doc.text('Получатель', x + width - lineWidth - 40, lineY + 6);
}

function drawFooter(doc, { margin, width, fonts, palette }) {
  const footerY = doc.page.height - margin - 24;

  doc.font(fonts.regular).fontSize(8).fillColor(palette.textMuted);
  doc.text(`Документ создан автоматически ${formatDateTime(new Date())}`, margin, footerY, {
    width,
    align: 'center'
  });

  doc.text('Логистическая система BagHunter', margin, footerY + 12, {
    width,
    align: 'center'
  });
}

function addNotesPage(doc, { margin, width, fonts, palette }) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PALETTE.background);
  doc.font(fonts.bold).fontSize(18).fillColor(palette.textPrimary);
  doc.text('Замечания и дополнительные отметки', margin, margin);

  doc.font(fonts.regular).fontSize(10).fillColor(palette.textMuted);
  doc.text('Заполните вручную при необходимости.', margin, margin + 28);

  const startY = margin + 50;
  const lineGap = 28;
  const lines = 12;

  doc.save();
  doc.strokeColor(palette.border).lineWidth(0.7);
  for (let i = 0; i < lines; i += 1) {
    const lineY = startY + i * lineGap;
    doc.moveTo(margin, lineY).lineTo(margin + width, lineY).stroke();
  }
  doc.restore();
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ru-RU');
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function formatCurrency(amount) {
  const numeric = Number(amount) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(numeric)
    .replace(/\u00a0/g, ' ');
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  const hasDecimals = Math.abs(numeric) % 1 > 0;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  })
    .format(numeric)
    .replace(/\u00a0/g, ' ');
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.default;
}

module.exports = {
  generateInvoicePDF
};
