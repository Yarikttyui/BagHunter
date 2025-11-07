require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATION_TABLE = 'schema_migrations';
const DEFAULT_DB_NAME = 'logistics_accounting';

const PASSWORD_SEEDS = [
  {
    placeholder: '{{ADMIN_PASSWORD_HASH}}',
    envKey: 'SEED_ADMIN_PASSWORD',
    defaultValue: 'admin123',
    username: 'admin',
    role: 'admin'
  },
  {
    placeholder: '{{ACCOUNTANT_PASSWORD_HASH}}',
    envKey: 'SEED_ACCOUNTANT_PASSWORD',
    defaultValue: 'acc123',
    username: 'accountant',
    role: 'accountant'
  },
  {
    placeholder: '{{CLIENT_PASSWORD_HASH}}',
    envKey: 'SEED_CLIENT_PASSWORD',
    defaultValue: 'client123',
    username: 'client',
    role: 'client'
  }
];

function computeChecksum(content) {
  return crypto.createHash('sha1').update(content, 'utf8').digest('hex');
}

async function resolvePlaceholders(sql) {
  let result = sql;
  const credentials = [];

  for (const seed of PASSWORD_SEEDS) {
    if (!result.includes(seed.placeholder)) {
      continue;
    }

    const password = process.env[seed.envKey] || seed.defaultValue;
    const hash = await bcrypt.hash(password, 10);
    result = result.replace(new RegExp(seed.placeholder, 'g'), hash);

    credentials.push({
      username: seed.username,
      role: seed.role,
      password
    });
  }

  return { sql: result, credentials };
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum CHAR(40) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function runMigrations(options = {}) {
  const {
    fresh = false,
    silent = false
  } = options;

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || DEFAULT_DB_NAME;
  const connection = await mysql.createConnection(dbConfig);

  try {
    if (fresh) {
      if (!silent) {
        console.log(`[migrate] Dropping database ${dbName}...`);
      }
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    }

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.changeUser({ database: dbName });

    await ensureMigrationTable(connection);

    const [appliedRows] = await connection.query(
      `SELECT filename, checksum FROM ${MIGRATION_TABLE}`
    );
    const appliedMap = new Map(
      appliedRows.map((row) => [row.filename, row.checksum])
    );

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const appliedMigrations = [];
    const seedCredentials = [];

    for (const filename of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const rawSql = fs.readFileSync(filePath, 'utf8');
      const checksum = computeChecksum(rawSql);
      const previouslyAppliedChecksum = appliedMap.get(filename);

      if (previouslyAppliedChecksum) {
        if (previouslyAppliedChecksum !== checksum) {
          console.warn(
            `[migrate] WARNING: Migration ${filename} was modified after being applied.`
          );
        }
        continue;
      }

      const { sql, credentials } = await resolvePlaceholders(rawSql);
      if (!sql.trim()) {
        continue;
      }

      if (!silent) {
        console.log(`[migrate] Applying ${filename}...`);
      }

      try {
        await connection.query(sql);
        await connection.query(
          `INSERT INTO ${MIGRATION_TABLE} (filename, checksum) VALUES (?, ?)`,
          [filename, checksum]
        );
        appliedMigrations.push(filename);
        if (credentials.length > 0) {
          seedCredentials.push(...credentials);
        }
      } catch (error) {
        console.error(`[migrate] Failed to apply ${filename}:`, error.message);
        throw error;
      }
    }

    if (!silent) {
      if (appliedMigrations.length === 0) {
        console.log('[migrate] Database is already up to date.');
      } else {
        console.log(`[migrate] Applied ${appliedMigrations.length} migration(s).`);
      }
    }

    return {
      appliedMigrations,
      seedCredentials
    };
  } finally {
    await connection.end();
  }
}

module.exports = {
  runMigrations
};

if (require.main === module) {
  const fresh = process.argv.includes('--fresh');

  runMigrations({ fresh })
    .then(({ appliedMigrations, seedCredentials }) => {
      if (appliedMigrations.length > 0) {
        console.log('[migrate] Completed successfully.');
      }

      if (seedCredentials.length > 0) {
        console.log('\nSeed credentials (use for local development):');
        seedCredentials.forEach((cred) => {
          console.log(
            `  ${cred.username} (${cred.role}) -> ${cred.password}`
          );
        });
        console.log();
      }
    })
    .catch((error) => {
      console.error('[migrate] Migration failed:', error);
      process.exitCode = 1;
    });
}

