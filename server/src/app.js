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

try {
  app.use(session({
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    }),
    secret: sessionSecret || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));
} catch (err) {
  console.error('Session store error:', err.message);
  app.use(session({
    secret: sessionSecret || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));
}

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
