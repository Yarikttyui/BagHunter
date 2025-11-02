require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DEFAULT_DB_NAME = 'logistics_accounting';

async function recreateDatabase() {
  let connection;

  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;

  const defaultCredentials = [
    { placeholder: 'TEMP_HASH_ADMIN', label: 'admin', password: 'admin123' },
    { placeholder: 'TEMP_HASH_ACCOUNTANT1', label: 'accountant1', password: 'acc123' },
    { placeholder: 'TEMP_HASH_ACCOUNTANT2', label: 'accountant2', password: 'acc456' },
    { placeholder: 'TEMP_HASH_CLIENT', label: 'client1', password: 'client123' }
  ];

  try {
    console.log('--------------------------------------------');
    console.log('Starting database recreation');
    console.log(`Target: mysql://${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbName}`);
    console.log('--------------------------------------------');

    connection = await mysql.createConnection(dbConfig);

    console.log(`Dropping database "${dbName}" if it exists...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log(`Creating database "${dbName}"...`);
    await connection.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${dbName}\``);

    const sqlPath = path.join(__dirname, 'config', 'database.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Loaded seed SQL from ${sqlPath}`);

    console.log('Hashing default user passwords...');
    for (const cred of defaultCredentials) {
      const hash = await bcrypt.hash(cred.password, 10);
      sql = sql.replace(new RegExp(cred.placeholder, 'g'), hash);
    }

    console.log('Applying SQL statements...');
    const statements = sql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter(Boolean);

    let tablesCreated = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await connection.query(stmt);
        if (stmt.toLowerCase().startsWith('create table')) {
          tablesCreated++;
        }
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error(`  Statement ${i + 1} failed:`, err.message);
        }
      }
    }

    console.log(`Tables created: ${tablesCreated}`);

    const [users] = await connection.query(
      'SELECT id, username, email, full_name, is_verified FROM users ORDER BY id'
    );

    console.log('\nSeeded users:');
    users.forEach((user, index) => {
      console.log(` ${index + 1}. ${user.username}`);
      console.log(`    Email: ${user.email || '<not set>'}`);
      console.log(`    Name: ${user.full_name || '<not set>'}`);
      console.log(`    Verified: ${user.is_verified ? 'yes' : 'no'}\n`);
    });

    console.log('Default credentials from demo data:');
    defaultCredentials.forEach((cred) => {
      console.log(`  ${cred.label}: ${cred.password}`);
    });

    console.log('\nDatabase recreation completed successfully.');
    console.log('Use start-all.bat for a quick port reference.\n');
  } catch (error) {
    console.error('\nDatabase recreation failed:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(process.exitCode || 0);
  }
}

recreateDatabase();
