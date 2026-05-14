require('dotenv').config();
const pool = require('./src/db/connection');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const email = 'admin@test.com';
  const password = 'Admin123!';
  const name = 'Test Admin';
  const role = 'admin';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );

    const user = result.rows[0];
    console.log('\n✅ Admin user created successfully!\n');
    console.log('Email:', user.email);
    console.log('Password:', password);
    console.log('Role:', user.role);
    console.log('\nYou can now log in with these credentials at:');
    console.log('http://heidi-prod-east2.eba-qgvayvcf.us-east-2.elasticbeanstalk.com/login');

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
