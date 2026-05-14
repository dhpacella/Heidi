#!/bin/bash
set -e

echo "Creating admin user..."
cd /var/app/current/server

# Run Node script to create admin user
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode')
    ? { rejectUnauthorized: false }
    : false
});

async function createAdmin() {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash('Admin123!', 10);

    // Delete existing admin if exists
    await pool.query('DELETE FROM users WHERE email = \$1', ['admin@test.com']);

    // Create new admin
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (\$1, \$2, \$3, \$4, NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id, email, name, role',
      ['admin@test.com', 'Admin', passwordHash, 'admin']
    );

    console.log('✅ Admin user created/updated: ' + result.rows[0].email);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    process.exit(1);
  }
}

createAdmin();
"

echo "Admin user creation completed"
