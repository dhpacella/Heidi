const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('📦 Initializing database pool...');

// Configure SSL for RDS
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false // Start with no SSL, will enable below if needed
};

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
