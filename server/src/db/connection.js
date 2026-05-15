const { Pool } = require('pg');

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not available in production
  }
}

// Use DATABASE_URL if available, otherwise fallback to hardcoded RDS (us-east-2)
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

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

module.exports = pool;
