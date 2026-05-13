require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('📋 Running database initialization...\n');

    // Step 1: Run migrations
    console.log('1️⃣ Running migrations...');
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('   ✅ Migrations complete\n');

    // Step 2: Create admin user
    console.log('2️⃣ Creating admin user...');
    const adminEmail = 'admin@heidi.local';
    const adminPassword = 'HeidiAdmin2025!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await client.query(
      'INSERT INTO users (email, password_hash, role, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (email) DO NOTHING',
      [adminEmail, hashedPassword, 'admin']
    );
    console.log(`   ✅ Admin user created`);
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}\n`);

    // Step 3: Summary
    console.log('✅ Database initialization complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Log in with admin credentials above');
    console.log('   2. Import voter data: node src/scripts/importVoterData.js');
    console.log('   3. Access dashboard at: /dashboard\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}

module.exports = initializeDatabase;
