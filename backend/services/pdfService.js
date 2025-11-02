const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { clientPortalUrl } = require('../config/appConfig');


async function generateInvoicePDF(invoiceData, items, res) {
  try {
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      bufferPages: true,
      info: {
        Title: `Накладная ${invoiceData.invoice_number}`,
        Author: 'Логистическая система'
      }
    });
    
    const fontsPath = path.join(__dirname, '../fonts');
    
    let hasCustomFonts = false;
    let regularFont = path.join(fontsPath, 'DejaVuSans.ttf');
    let boldFont = path.join(fontsPath, 'DejaVuSans-Bold.ttf');
    
    if (!fs.existsSync(regularFont) || !fs.existsSync(boldFont)) {
      const npmFontsPath = path.join(__dirname, '../node_modules/dejavu-fonts-ttf/ttf');
      regularFont = path.join(npmFontsPath, 'DejaVuSans.ttf');
      boldFont = path.join(npmFontsPath, 'DejaVuSans-Bold.ttf');
    }
    
    if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
      doc.registerFont('Regular', regularFont);
      doc.registerFont('Bold', boldFont);
      hasCustomFonts = true;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoice_number}.pdf`);
    doc.pipe(res);

    const regularFontName = hasCustomFonts ? 'Regular' : 'Helvetica';
    const boldFontName = hasCustomFonts ? 'Bold' : 'Helvetica-Bold';

    const logoPath = path.join(__dirname, '../uploads/company-logo.png');
    const hasLogo = fs.existsSync(logoPath);

    if (hasLogo) {
      doc.image(logoPath, 50, 45, { width: 80 });
      doc.moveDown(2);
    }

    doc.fontSize(24)
       .font(boldFontName)
       .text('ТОВАРНАЯ НАКЛАДНАЯ', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(14)
       .font(regularFontName)
       .text(`№ ${invoiceData.invoice_number}`, { align: 'center' })
       .moveDown(0.3);

    doc.fontSize(10)
       .text(`от ${formatDate(invoiceData.invoice_date)}`, { align: 'center' })
       .moveDown(1.5);

    const qrCodeUrl = `${clientPortalUrl}/track/${invoiceData.invoice_number}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, { width: 100, margin: 1 });
    const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    
    doc.image(qrBuffer, doc.page.width - 120, 100, { width: 70 });
    doc.fontSize(7)
       .text('Отследить накладную', doc.page.width - 120, 175, { width: 70, align: 'center' });

    const leftColumn = 50;
    const currentY = doc.y;

    doc.fontSize(11)
       .font(boldFontName)
       .text('Клиент:', leftColumn, currentY);
    
    doc.font(regularFontName)
       .fontSize(10)
       .text(invoiceData.client_name || 'Не указан', leftColumn, doc.y + 5)
       .text(`ИНН: ${invoiceData.inn || 'Не указан'}`, leftColumn, doc.y + 3)
       .text(`Email: ${invoiceData.email || 'Не указан'}`, leftColumn, doc.y + 3)
       .text(`Телефон: ${invoiceData.phone || 'Не указан'}`, leftColumn, doc.y + 3)
       .text(`Адрес: ${invoiceData.address || 'Не указан'}`, leftColumn, doc.y + 3);

    doc.moveDown(1.5);
    
    const deliveryY = doc.y;
    doc.fontSize(11)
       .font(boldFontName)
       .text('Информация о доставке:', leftColumn, deliveryY);

    doc.font(regularFontName)
       .fontSize(10)
       .text(`Дата накладной: ${formatDate(invoiceData.invoice_date)}`, leftColumn, doc.y + 5)
       .text(`Дата доставки: ${invoiceData.delivery_date ? formatDate(invoiceData.delivery_date) : 'Не указана'}`, leftColumn, doc.y + 3)
       .text(`Статус: ${getStatusText(invoiceData.status)}`, leftColumn, doc.y + 3);

    doc.moveDown(2);
    const tableTop = doc.y;
    
    doc.fontSize(10)
       .font(boldFontName);
    
    drawTableHeader(doc, tableTop);

    doc.font(regularFontName);
    let itemY = tableTop + 25;
    let itemNumber = 1;

    items.forEach(item => {
      if (itemY > doc.page.height - 150) {
        doc.addPage();
        itemY = 50;
        drawTableHeader(doc, itemY);
        itemY += 25;
      }

      drawTableRow(doc, itemY, itemNumber, item);
      itemY += 25;
      itemNumber++;
    });

    doc.moveTo(50, itemY)
       .lineTo(550, itemY)
       .stroke();

    doc.moveDown(2);
    doc.fontSize(12)
       .font(boldFontName)
       .text('ИТОГО:', 350, doc.y, { width: 100 })
       .text(formatCurrency(invoiceData.total_amount), 450, doc.y - 12, { width: 100, align: 'right' });

    if (invoiceData.notes) {
      doc.moveDown(2);
      doc.fontSize(10)
         .font(boldFontName)
         .text('Примечания:');
      
      doc.font(regularFontName)
         .fontSize(9)
         .text(invoiceData.notes, { width: 500 });
    }

    doc.moveDown(3);
    const signatureY = doc.y;
    
    doc.fontSize(10)
       .font(regularFontName)
       .text('Отпустил: ___________________', 50, signatureY)
       .text('Получил: ___________________', 320, signatureY);

    doc.fontSize(8)
       .text('(подпись)', 50, signatureY + 20)
       .text('(подпись)', 320, signatureY + 20);

    const footerY = doc.page.height - 50;
    doc.fontSize(8)
       .font(regularFontName)
       .fillColor('#888888')
       .text('Логистическая система бухгалтерии', 50, footerY, { align: 'center', width: 500 })
       .text(`Документ создан: ${new Date().toLocaleString('ru-RU')}`, 50, footerY + 12, { align: 'center', width: 500 });

    doc.end();

  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    throw error;
  }
}


function drawTableHeader(doc, y) {
  doc.rect(50, y, 500, 20)
     .fillAndStroke('#667eea', '#667eea');
  
  doc.fillColor('#ffffff')
     .text('№', 55, y + 5, { width: 30 })
     .text('Наименование', 90, y + 5, { width: 200 })
     .text('Кол-во', 295, y + 5, { width: 60 })
     .text('Цена', 360, y + 5, { width: 80 })
     .text('Сумма', 445, y + 5, { width: 100, align: 'right' });
  
  doc.fillColor('#000000');
}


function drawTableRow(doc, y, number, item) {
  const rowHeight = 20;
  
  if (number % 2 === 0) {
    doc.rect(50, y, 500, rowHeight)
       .fillAndStroke('#f8f9fa', '#e0e0e0');
  } else {
    doc.moveTo(50, y + rowHeight)
       .lineTo(550, y + rowHeight)
       .stroke('#e0e0e0');
  }

  doc.fillColor('#000000')
     .fontSize(9)
     .text(number.toString(), 55, y + 5, { width: 30 })
     .text(item.product_name, 90, y + 5, { width: 200 })
     .text(item.quantity.toString(), 295, y + 5, { width: 60 })
     .text(formatCurrency(item.unit_price), 360, y + 5, { width: 80 })
     .text(formatCurrency(item.total_price), 445, y + 5, { width: 100, align: 'right' });
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
    pending: '⏳ Ожидает обработки',
    in_transit: '🚚 В пути',
    delivered: '✅ Доставлено',
    cancelled: '❌ Отменено'
  };
  return statuses[status] || status;
}

module.exports = {
  generateInvoicePDF
};
