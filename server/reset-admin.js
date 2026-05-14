const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('✅ Loading .env from:', path.join(__dirname, '.env'));
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');

const pool = require('./src/db/connection');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  const email = 'admin@test.com';
  const password = 'Admin123!';
  const name = 'Test Admin';

  try {
    // Delete existing user
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    console.log('✅ Deleted existing user');

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'admin']
    );

    const user = result.rows[0];
    console.log('\n✅ Admin user created successfully!\n');
    console.log('Email:', user.email);
    console.log('Password:', password);
    console.log('Role:', user.role);
    console.log('\nYou can now log in with these credentials at:');
    console.log('http://heidi-prod.eba-dkbkgcjs.us-east-1.elasticbeanstalk.com/login');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetAdmin();
