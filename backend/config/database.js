const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'logistics_accounting',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err.message);
    console.error('Check the DB_* variables inside backend/.env.');
    console.error(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   DB_USER: ${process.env.DB_USER || 'root'}`);
    console.error(`   DB_NAME: ${process.env.DB_NAME || 'logistics_accounting'}`);
    console.error(`   DB_PORT: ${process.env.DB_PORT || 3306}`);
  } else {
    console.log('MySQL connection pool established.');
    connection.release();
  }
});

module.exports = promisePool;
