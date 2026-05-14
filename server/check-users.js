require('dotenv').config();
const pool = require('./src/db/connection');

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, email, name, role FROM users ORDER BY id');
    console.log('\nExisting users in database:');
    if (result.rows.length === 0) {
      console.log('  (No users found - need to create admin)');
    } else {
      result.rows.forEach(r => {
        console.log(`  - ${r.email} (${r.name}) [${r.role}]`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
