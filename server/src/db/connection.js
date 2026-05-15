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

let dbUrl = process.env.DATABASE_URL || '';
const { getSecret } = require('../lib/secretsClient');

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
  // PostgreSQL for production/RDS, or mock DB for local development
  const { Pool } = require('pg');
  const mockDb = require('./mock-db');

  // In development mode, prefer mock database unless explicitly using localhost
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocalDb = dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'));

  if (isDev && !isLocalDb) {
    console.log('✅ Using in-memory mock database for local development');
    module.exports = mockDb;
  } else {
    let poolConfig = dbUrl ? {
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

    let pgPool = new Pool(poolConfig);
    let connectionFailed = false;

    pgPool.on('error', (err) => {
      if (!connectionFailed) {
        console.warn('⚠️ Database connection error:', err.message);
        connectionFailed = true;
      }
    });

    pgPool.on('connect', () => {
      console.log('✅ PostgreSQL connected');
    });

    // Wrapper that automatically falls back to mock DB on connection errors
    const pool = {
      query: async (sql, params = []) => {
        if (connectionFailed) {
          return mockDb.query(sql, params);
        }
        try {
          return await pgPool.query(sql, params);
        } catch (err) {
          if (!connectionFailed) {
            console.warn('⚠️ PostgreSQL query failed, switching to mock database');
            connectionFailed = true;
          }
          return mockDb.query(sql, params);
        }
      },
      connect: (callback) => {
        if (connectionFailed) {
          return mockDb.connect(callback);
        }
        return pgPool.connect(callback);
      },
      on: (event, handler) => {
        if (!connectionFailed) {
          pgPool.on(event, handler);
        }
      },
      end: () => pgPool.end(),
      initAsync: async function() {
        // Fetch RDS credentials from Secrets Manager if not already set via DATABASE_URL
        if (!dbUrl && process.env.NODE_ENV === 'production') {
          try {
            console.log('🔐 Fetching database credentials from Secrets Manager...');
            const secret = await getSecret('heidi-voter-dashboard/db');
            const connectionString = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.database}?sslmode=require`;

            // Reinitialize pool with Secrets Manager credentials
            await pgPool.end();
            poolConfig = {
              connectionString,
              ssl: { rejectUnauthorized: false }
            };
            pgPool = new Pool(poolConfig);
            connectionFailed = false;
            console.log('✅ Database credentials loaded from Secrets Manager');
          } catch (err) {
            console.warn('⚠️ Failed to fetch from Secrets Manager, using fallback credentials:', err.message);
          }
        }
      }
    };

    module.exports = pool;
  }
}
