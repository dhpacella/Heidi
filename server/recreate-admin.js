const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode')
    ? { rejectUnauthorized: false }
    : false
});

async function recreateAdmin() {
  try {
    console.log('📦 Connecting to database...');

    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Hash password
    const password = 'Admin123!';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed');

    // Delete existing admin if exists
    await pool.query('DELETE FROM users WHERE email = $1', ['admin@test.com']);
    console.log('🗑️  Removed old admin user');

    // Create new admin
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, name, role`,
      ['admin@test.com', 'Admin', passwordHash, 'admin']
    );

    console.log('✅ Admin user created:');
    console.log('   Email:', result.rows[0].email);
    console.log('   Name:', result.rows[0].name);
    console.log('   Role:', result.rows[0].role);
    console.log('   Password: Admin123!');
    console.log('\n✨ You can now log in with these credentials');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

recreateAdmin();
