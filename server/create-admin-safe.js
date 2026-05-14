const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/db/connection');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function createAdmin() {
  try {
    const email = 'admin@test.com';
    const password = 'Admin123!';

    // First, ensure schema exists
    console.log('📦 Ensuring database schema exists...');
    const schemaPath = path.join(__dirname, 'src/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Schema ready');

    // Then create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id',
      [email, hashedPassword, 'Test Admin', 'admin']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin user created');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('✅ Admin user already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
