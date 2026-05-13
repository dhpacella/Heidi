require('dotenv').config();
const pool = require('./server/src/db/connection');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, 'server/src/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
