const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://ebroot:HeiDi2025!Secure@awseb-e-6ptp5j74j4-stack-awsebrdsdatabase-rboc67jcwldv.cgjywa0isf5t.us-east-1.rds.amazonaws.com:5432/postgres'
});

async function createAdmin() {
  const email = 'admin@test.com';
  const password = 'Admin123!';
  const name = 'Test Admin';

  try {
    // Delete existing user first
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    console.log('✅ Deleted existing user');

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'admin']
    );

    const user = result.rows[0];
    console.log('\n✅ Admin user created in RDS database!\n');
    console.log('Email:', user.email);
    console.log('Password:', password);
    console.log('Role:', user.role);

    pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
  }
}

createAdmin();
