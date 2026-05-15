const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env only in development (not deployed to EB)
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

console.log('📦 Initializing database pool...');
console.log('DATABASE_URL env var:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 40)}...` : 'UNDEFINED');

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL not set. Cannot connect to database.');
  process.exit(1);
}

// Configure SSL for RDS
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false // Start with no SSL, will enable below if needed
};

console.log('Pool config connectionString:', poolConfig.connectionString ? `${poolConfig.connectionString.substring(0, 40)}...` : 'UNDEFINED');

// If DATABASE_URL contains sslmode parameter, use SSL
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode')) {
  console.log('🔒 SSL mode detected in DATABASE_URL');
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for RDS self-signed certificates
  };

  // Try to load RDS CA certificate if it exists
  const certPath = path.join(__dirname, '..', '..', 'rds-ca-bundle.pem');
  if (fs.existsSync(certPath)) {
    console.log('📜 Loading RDS CA certificate');
    try {
      poolConfig.ssl.ca = [fs.readFileSync(certPath, 'utf8')];
    } catch (err) {
      console.warn('⚠️ Could not read RDS certificate:', err.message);
    }
  }
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

module.exports = pool;
