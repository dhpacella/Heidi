const path = require('path');

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  try {
    // Try .env.local first (local development), then .env
    const envLocal = path.join(__dirname, '../../.env.local');
    const fs = require('fs');
    if (fs.existsSync(envLocal)) {
      require('dotenv').config({ path: envLocal });
    } else {
      require('dotenv').config();
    }
  } catch (e) {
    // dotenv not available in production
  }
}

const dbUrl = process.env.DATABASE_URL || '';

// Check if using SQLite or PostgreSQL
if (dbUrl.startsWith('sqlite:')) {
  // SQLite for local development
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = dbUrl.replace('sqlite:', '');
  const fullPath = path.isAbsolute(dbPath) ? dbPath : path.join(__dirname, '../../', dbPath);

  const db = new sqlite3.Database(fullPath, (err) => {
    if (err) {
      console.error('❌ SQLite connection error:', err.message);
    } else {
      console.log('✅ SQLite connected:', fullPath);
    }
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Wrapper to make SQLite API compatible with pg Pool API
  const pool = {
    query: (sql, params, callback) => {
      // Convert PostgreSQL placeholders ($1, $2) to SQLite (?)
      const sqliteQuery = sql.replace(/\$\d+/g, '?');

      if (typeof params === 'function') {
        callback = params;
        params = [];
      }

      if (!callback) {
        return new Promise((resolve, reject) => {
          if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sqliteQuery, params || [], (err, rows) => {
              if (err) reject(err);
              else resolve({ rows: rows || [] });
            });
          } else {
            db.run(sqliteQuery, params || [], function(err) {
              if (err) reject(err);
              else resolve({ rowCount: this.changes, lastID: this.lastID });
            });
          }
        });
      }

      if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sqliteQuery, params || [], (err, rows) => {
          if (err) callback(err);
          else callback(null, { rows: rows || [] });
        });
      } else {
        db.run(sqliteQuery, params || [], function(err) {
          if (err) callback(err);
          else callback(null, { rowCount: this.changes, lastID: this.lastID });
        });
      }
    },
    connect: (callback) => {
      if (callback) callback(null, { query: pool.query, release: () => {} });
      return { query: pool.query, release: () => {} };
    },
    on: () => {},
    end: () => db.close()
  };

  module.exports = pool;
} else {
  // PostgreSQL for production/RDS
  const { Pool } = require('pg');

  const poolConfig = dbUrl ? {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  } : {
    host: 'heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com',
    port: 5432,
    user: 'ebroot',
    password: 'etMf3W5t4EchcjG',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  };

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
  });

  pool.on('connect', () => {
    console.log('✅ PostgreSQL connected');
  });

  module.exports = pool;
}
