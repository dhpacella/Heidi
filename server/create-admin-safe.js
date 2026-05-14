require('dotenv').config();
const pool = require('./src/db/connection');
const bcryptjs = require('bcryptjs');

async function createAdmin() {
  try {
    const email = 'admin@test.com';
    const password = 'Admin123!';
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
