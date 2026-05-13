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

// /api/auth — public endpoints (login, register) + protected (me, token)
app.use('/api/auth', require('./routes/auth'));

// All remaining /api/* routes require auth (session OR JWT bearer)
app.use('/api/voters', requireApiAuth, require('./routes/voters'));
app.use('/api/precincts', requireApiAuth, require('./routes/precincts'));
app.use('/api/analysis', requireApiAuth, require('./routes/analysis'));
app.use('/api/canvassing', requireApiAuth, require('./routes/canvassing'));
app.use('/api/referrals', requireApiAuth, require('./routes/referrals'));
app.use('/api/super-picks', requireApiAuth, require('./routes/superPicks'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
// Last deploy: Sun May 10 20:47:53 CDT 2026
