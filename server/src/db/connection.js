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

// Use DATABASE_URL from environment, or fallback to hardcoded RDS connection
const dbUrl = process.env.DATABASE_URL || 'postgresql://ebroot:etMf3W5t4EchcjG@heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require';

if (!dbUrl) {
  console.error('❌ FATAL: No database URL available.');
  process.exit(1);
}

// Configure SSL for RDS
const poolConfig = {
  connectionString: dbUrl,
  ssl: false // Start with no SSL, will enable below if needed
};

console.log('Using database:', dbUrl.includes('heidi-voter-db-east2') ? 'us-east-2 RDS' : 'custom/env');

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
