const nodemailer = require('nodemailer');
const { clientPortalUrl, adminPanelUrl } = require('../config/appConfig');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Почтовый сервис недоступен:', error.message);
  } else {
    console.log('✅ Почтовый сервис готов к отправке сообщений');
  }
});


async function sendInvoiceStatusEmail(invoiceData, clientEmail, newStatus) {
  const statusText = {
    pending: 'Ожидает подтверждения',
    in_transit: 'Отправлен клиенту',
    delivered: 'Доставлен получателю',
    cancelled: 'Отменён'
  };

  const statusEmoji = {
    pending: '⏳',
    in_transit: '🚚',
    delivered: '✅',
    cancelled: '❌'
  };

  const mailOptions = {
    from: `"Логистическая система" <${process.env.EMAIL_USER}>`,
    to: clientEmail,
    subject: `${statusEmoji[newStatus]} Статус накладной №${invoiceData.invoice_number} обновлён`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .status { display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .status.pending { background: #fff3cd; color: #856404; }
          .status.in_transit { background: #cce5ff; color: #004085; }
          .status.delivered { background: #d4edda; color: #155724; }
          .status.cancelled { background: #f8d7da; color: #721c24; }
          .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Обновление статуса доставки</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Мы зафиксировали обновление по накладной <strong>№${invoiceData.invoice_number}</strong>:</p>
            
            <div class="status ${newStatus}">
              ${statusEmoji[newStatus]} ${statusText[newStatus]}
            </div>
            
            <div class="info-box">
              <strong>Ключевые данные:</strong><br>
              📅 Дата оформления: ${new Date(invoiceData.invoice_date).toLocaleDateString('ru-RU')}<br>
              💰 Итоговая сумма: ${Number(invoiceData.total_amount || 0).toLocaleString('ru-RU')} ₽<br>
              ${invoiceData.delivery_date ? `🚚 Плановая доставка: ${new Date(invoiceData.delivery_date).toLocaleDateString('ru-RU')}<br>` : ''}
              ${invoiceData.notes ? `📝 Комментарий менеджера: ${invoiceData.notes}` : ''}
            </div>
            
            <p>Чтобы просмотреть подробности, перейдите в личный кабинет:</p>
            <a href="${clientPortalUrl}" class="button">Перейти в личный кабинет</a>
            
            <div class="footer">
              <p>Письмо сформировано автоматически, отвечать на него не требуется.</p>
              <p>© 2025 Логистическая система</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Письмо со статусом накладной отправлено:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Не удалось отправить письмо:', error);
    return { success: false, error: error.message };
  }
}


async function sendNewInvoiceNotification(invoiceData, accountantEmails) {
  const mailOptions = {
    from: `"Логистическая система" <${process.env.EMAIL_USER}>`,
    to: accountantEmails.join(', '),
    subject: `📋 Накладная №${invoiceData.invoice_number} ожидает проверки`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Новая накладная на проверке</h1>
          </div>
          <div class="content">
            <div class="alert">
              <strong>Нужна ваша проверка</strong><br>
              Клиент оформил новую накладную, и она ждёт подтверждения.
            </div>
            
            <p><strong>Номер накладной:</strong> ${invoiceData.invoice_number}</p>
            <p><strong>Клиент:</strong> ${invoiceData.client_name}</p>
            <p><strong>Дата оформления:</strong> ${new Date(invoiceData.invoice_date).toLocaleDateString('ru-RU')}</p>
            <p><strong>Сумма:</strong> ${Number(invoiceData.total_amount || 0).toLocaleString('ru-RU')} ₽</p>
            
            <a href="${adminPanelUrl}" class="button">Перейти в админ-панель</a>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Письмо бухгалтерам отправлено:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Не удалось отправить уведомление:', error);
    return { success: false, error: error.message };
  }
}


async function sendTestEmail(toEmail) {
  const mailOptions = {
    from: `"Логистическая система" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '✅ Проверка почтового сервиса',
    html: `
      <h2>🎉 Поздравляем!</h2>
      <p>Почтовый сервис настроен корректно и готов работать.</p>
      <p>Теперь система сможет автоматически уведомлять пользователей.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Тестовое письмо отправлено:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Не удалось отправить тестовое письмо:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendInvoiceStatusEmail,
  sendNewInvoiceNotification,
  sendTestEmail
};
