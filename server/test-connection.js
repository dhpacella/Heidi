const { Pool } = require('pg');

const connectionString = 'postgresql://ebroot:etMf3W5t4EchcjG@heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require';

console.log('Testing connection to:', connectionString.split('@')[1].split(':')[0]);

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connection successful:', res.rows[0]);
  pool.end();
  process.exit(0);
});

setTimeout(() => {
  console.error('⏱️ Connection timeout');
  process.exit(1);
}, 10000);
