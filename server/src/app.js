require('dotenv').config();
console.log('🚀 Starting app, DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const pool = require('./db/connection');
const { requireApiAuth } = require('./middleware/auth');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET is required in production');
}

// Session middleware - use in-memory for now (will auto-migrate to DB once initialized)
app.use(session({
  secret: sessionSecret || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// HTML auth + dashboard routes (sessions)
app.use('/', require('./routes/htmlAuth'));

// /api/auth — public endpoints (login) + protected (me, token)
// Note: registration is disabled; only admins can create users via /api/admin/create-user
app.use('/api/auth', require('./routes/auth'));

// /api/admin — admin-only endpoints (user management, etc.)
app.use('/api/admin', requireApiAuth, require('./routes/admin'));

// All remaining /api/* routes require auth (session OR JWT bearer)
app.use('/api/voters', requireApiAuth, require('./routes/voters'));
app.use('/api/precincts', requireApiAuth, require('./routes/precincts'));
app.use('/api/analysis', requireApiAuth, require('./routes/analysis'));
app.use('/api/canvassing', requireApiAuth, require('./routes/canvassing'));
app.use('/api/referrals', requireApiAuth, require('./routes/referrals'));
app.use('/api/super-picks', requireApiAuth, require('./routes/superPicks'));
app.use('/api/sms', requireApiAuth, require('./routes/sms'));

// SES webhook (no auth — authenticated by SNS topic ARN)
app.post('/api/email/webhooks/ses', express.json({ type: '*/*' }), require('./routes/sesWebhook'));

// Email tracking endpoints (no auth — email clients need to access without a session)
app.use('/api/email/track', require('./routes/emailTracking'));

app.use('/api/email', requireApiAuth, require('./routes/email'));
app.use('/api/lists', requireApiAuth, require('./routes/lists'));
app.use('/api/volunteers', requireApiAuth, require('./routes/volunteers'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


// Database migration endpoint - applies pending schema changes
app.post('/api/migrate-db', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const client = await pool.connect();
    try {
      const schemaPath = path.join(__dirname, 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);

      console.log('✅ Database schema migration successful');
      res.json({ success: true, message: 'Database schema migrated successfully' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// One-time setup endpoint - initializes database and creates admin user
app.post('/api/setup', async (req, res) => {
  try {
    const { adminPassword } = req.body;
    if (!adminPassword) {
      return res.status(400).json({ error: 'adminPassword required' });
    }

    const fs = require('fs');
    const path = require('path');
    const bcrypt = require('bcryptjs');

    const client = await pool.connect();
    try {
      // Run migrations
      const schemaPath = path.join(__dirname, 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);

      // Create admin user
      const adminEmail = 'admin@heidi.local';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await client.query(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [adminEmail, 'Admin', hashedPassword, 'admin']
      );

      res.json({
        success: true,
        message: 'Database initialized',
        email: adminEmail,
        password: adminPassword
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Initialize database schema and admin user on startup
    try {
      const fs = require('fs');
      const path = require('path');
      const bcryptjs = require('bcryptjs');

      console.log('🔧 Initializing database...');

      const schemaPath = path.join(__dirname, 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database schema ready');

      // Create admin user with optimized bcrypt rounds
      // Use 6 rounds for faster password comparison
      const adminEmail = 'admin@test.com';
      const adminPassword = 'Admin123!';

      console.log('🔐 Hashing admin password...');
      const hashedPassword = await bcryptjs.hash(adminPassword, 6);
      console.log('✅ Password hashed, attempting to create user...');

      // Delete existing admin user if present to ensure fresh hash
      const deleteResult = await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
      console.log(`🗑️ Deleted ${deleteResult.rowCount} existing admin user(s)`);

      // Create new admin user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email',
        [adminEmail, hashedPassword, 'Test Admin', 'admin']
      );
      console.log(`✅ Admin user created with ID: ${result.rows[0].id}`);
      console.log('✅ Ready to login: admin@test.com / Admin123!');
    } catch (err) {
      console.error('❌ Database initialization error:', err.message);
      console.error('Stack:', err.stack);
    }

    // Register email scheduler for dispatching scheduled blasts
    try {
      const { scheduleDispatcher } = require('./scheduler');
      scheduleDispatcher(pool);
    } catch (err) {
      console.error('⚠️ Failed to start email scheduler:', err.message);
    }
  });
}

module.exports = app;
// Last deploy: Sun May 10 20:47:53 CDT 2026
