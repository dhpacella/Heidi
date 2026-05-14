const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://ebroot:HeiDi2025!Secure@heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com:5432/postgres'
});

async function setupDatabase() {
  try {
    console.log('📦 Setting up us-east-2 database...\n');

    // Read schema
    const schemaPath = path.join(__dirname, 'src/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Run migrations
    console.log('🔧 Creating tables...');
    await pool.query(schema);
    console.log('✅ Tables created\n');

    // Create admin user
    const email = 'admin@test.com';
    const password = 'Admin123!';
    const hashedPassword = await bcryptjs.hash(password, 10);

    console.log('👤 Creating admin user...');
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, 'Test Admin', 'admin']
    );

    console.log('✅ Admin user created\n');
    console.log('═════════════════════════════════════════');
    console.log('🎉 us-east-2 Database Setup Complete!\n');
    console.log('Login Credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\nAccess at:');
    console.log('  http://heidi-prod-east2.eba-qgvayvcf.us-east-2.elasticbeanstalk.com/login');
    console.log('═════════════════════════════════════════\n');

    pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    pool.end();
    process.exit(1);
  }
}

setupDatabase();
