const { Pool } = require('pg');

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not available in production
  }
}

console.log('📦 Initializing database pool...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : 'NOT SET');

// Use environment variables if available, otherwise hardcoded RDS (us-east-2)
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  host: 'heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com',
  port: 5432,
  user: 'ebroot',
  password: 'etMf3W5t4EchcjG',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

console.log('PoolConfig:', {
  host: poolConfig.host,
  port: poolConfig.port,
  database: poolConfig.database,
  user: poolConfig.user,
  connectionString: poolConfig.connectionString ? '***SET***' : undefined
});

console.log('Creating pool with poolConfig...');
console.log('Actual poolConfig object:', JSON.stringify(poolConfig, null, 2));

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  console.error('Error details:', {
    address: err.address,
    port: err.port,
    code: err.code
  });
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

module.exports = pool;
