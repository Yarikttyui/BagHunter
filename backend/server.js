const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { authenticate } = require('./middleware/auth');
const {
  adminPanelUrl,
  clientPortalUrl,
  landingSiteUrl,
  allowedOrigins
} = require('./config/appConfig');

const corsOptions = {
  origin: allowedOrigins,
  credentials: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;

app.set('io', io);

io.on('connection', (socket) => {
  console.log('[ws] client connected:', socket.id);

  socket.on('join_user_room', (userId) => {
    if (!userId) {
      return;
    }
    const roomId = String(userId);
    socket.join(roomId);
    console.log(`[ws] client joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('[ws] client disconnected:', socket.id);
  });
});

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const invoicesRoutes = require('./routes/invoices');
const transactionsRoutes = require('./routes/transactions');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const commentsRoutes = require('./routes/comments');
const profilesRoutes = require('./routes/profiles');
const trackingRoutes = require('./routes/tracking');
const searchRoutes = require('./routes/search');
const productsRoutes = require('./routes/products');

app.use('/api/auth', authRoutes);
app.use('/api', authenticate);
app.use('/api/clients', clientsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/search', searchRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    version: '2.0.0',
    endpoints: {
      clients: '/api/clients',
      invoices: '/api/invoices',
      transactions: '/api/transactions',
      reports: '/api/reports',
      users: '/api/users',
      notifications: '/api/notifications',
      settings: '/api/settings',
      analytics: '/api/analytics'
    },
    features: {
      pdf_export: 'GET /api/invoices/:id/pdf',
      excel_invoices: 'GET /api/invoices/export/excel',
      excel_reports: 'GET /api/reports/export/excel',
      logo_upload: 'POST /api/settings/logo',
      income_expense_chart: 'GET /api/analytics/income-expense-chart',
      top_clients: 'GET /api/analytics/top-clients',
      revenue_forecast: 'GET /api/analytics/revenue-forecast'
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] server listening on port ${PORT}`);
  console.log('[api] allowed origins:', allowedOrigins);
  console.log('[ws] server ready');
});

