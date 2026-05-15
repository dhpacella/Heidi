const { Pool } = require('pg');

const pool = new Pool({
  host: 'heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com',
  port: 5432,
  user: 'ebroot',
  password: 'etMf3W5t4EchcjG',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

console.log('Attempting connection...');

pool.query('SELECT version()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Code:', err.code);
  } else {
    console.log('✅ Connected successfully!');
    console.log('PostgreSQL version:', res.rows[0].version.substring(0, 50));
    
    // Try to check if admin user exists
    pool.query('SELECT COUNT(*) as count FROM users WHERE email = $1', ['admin@test.com'], (err2, res2) => {
      if (err2) {
        console.error('❌ Query failed:', err2.message);
      } else {
        console.log('Admin user count:', res2.rows[0].count);
      }
      pool.end();
      process.exit(0);
    });
  }
});

setTimeout(() => {
  console.error('⏱️ Timeout - no response');
  process.exit(1);
}, 10000);
