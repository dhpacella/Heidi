// Load .env only in development (not deployed to EB)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const morgan = require('morgan');
const requestId = require('./middleware/requestId');

const pool = require('./db/connection');
const { requireApiAuth } = require('./middleware/auth');
const { xrayMiddleware } = require('./middleware/xray');

const app = express();

app.set('trust proxy', 1);

// X-Ray distributed tracing middleware (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(xrayMiddleware.openSegment('heidi-voter-dashboard'));
}

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:5000',
      'http://192.168.86.51:3002',
      'http://192.168.86.51:3000',
      'http://192.168.90.51:3002',
      'https://dbgikokghbz7o.amplifyapp.com',
      process.env.CLIENT_URL,
      process.env.VOTER_SITE_URL,
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, curl) and any amplifyapp.com subdomain
    if (!origin || allowed.includes(origin) || /\.amplifyapp\.com$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (msg) => console.info(msg.trim()) },
}));

// Named page routes — must come BEFORE static middleware to avoid dashboard.html conflict
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'heidi_voter_dashboard_final_27.html')));

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
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// HTML auth routes (login/logout via session)
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
app.use('/api/lighthouse', requireApiAuth, require('./routes/lighthouse'));

// SES webhook (no auth — authenticated by SNS topic ARN)
app.post('/api/email/webhooks/ses', express.json({ type: '*/*' }), require('./routes/sesWebhook'));

// Email tracking endpoints (no auth — email clients need to access without a session)
app.use('/api/email/track', require('./routes/emailTracking'));

// Public voter content (no auth required)
app.use('/api/public', require('./routes/publicContent'));

// Claude AI and Assistant routes (auth handled per-route, not globally)
app.use('/api/ai', require('./routes/ai'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/content', require('./routes/content'));
app.use('/api/email', requireApiAuth, require('./routes/email'));
app.use('/api/lists', requireApiAuth, require('./routes/lists'));
app.use('/api/volunteers', requireApiAuth, require('./routes/volunteers'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/system-logs', require('./routes/system-logs'));

app.get('/health', async (req, res) => {
  const start = Date.now();
  let dbOk = false;
  let dbLatencyMs = null;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    console.error('Health check DB failure', { message: err.message });
  }
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: { connected: dbOk, latencyMs: dbLatencyMs },
    uptime: Math.floor(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date().toISOString(),
  });
});
// One-time setup endpoint - initializes database and creates admin user (dev only)
app.post('/api/setup', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Setup endpoint disabled in production' });
  }
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
  console.error('Unhandled error', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });
  res.status(err.status || 500).json({ error: 'Internal server error', requestId: req.id });
});

// X-Ray close segment (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(xrayMiddleware.closeSegment());
}

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Server started on port ${PORT} (${process.env.NODE_ENV || 'development'})`);

    // Initialize async pool (Secrets Manager, if needed)
    try {
      await pool.initAsync();
    } catch (err) {
      console.error('⚠️ Pool async initialization failed:', err.message);
    }

    // Load configuration from SSM Parameter Store (production)
    if (process.env.NODE_ENV === 'production') {
      try {
        const { getParameters } = require('./lib/parameterStore');
        const params = await getParameters([
          '/heidi/s3-bucket',
          '/heidi/sqs-queue-url',
          '/heidi/pinpoint-app-id',
          '/heidi/kinesis-stream-name',
          '/heidi/kinesis-gps-stream',
          '/heidi/email-batch-size',
          '/heidi/sms-batch-size'
        ]);

        // Populate process.env for backward compatibility
        if (params['s3-bucket']) process.env.S3_BUCKET = params['s3-bucket'];
        if (params['sqs-queue-url']) process.env.SQS_QUEUE_URL = params['sqs-queue-url'];
        if (params['pinpoint-app-id']) process.env.PINPOINT_APP_ID = params['pinpoint-app-id'];
        if (params['kinesis-stream-name']) process.env.KINESIS_STREAM_NAME = params['kinesis-stream-name'];
        if (params['kinesis-gps-stream']) process.env.KINESIS_GPS_STREAM = params['kinesis-gps-stream'];
        if (params['email-batch-size']) process.env.EMAIL_BATCH_SIZE = params['email-batch-size'];
        if (params['sms-batch-size']) process.env.SMS_BATCH_SIZE = params['sms-batch-size'];

        console.log('✅ SSM parameters loaded');
      } catch (err) {
        console.warn('⚠️ Failed to load SSM parameters, using environment variables:', err.message);
      }
    }

    // Initialize database schema and create admin user on first startup
    try {
      const fs = require('fs');
      const path = require('path');
      const bcryptjs = require('bcryptjs');

      console.log('🔧 Initializing database...');

      const schemaPath = path.join(__dirname, 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database schema ready');

      // Create admin user if it doesn't exist (only on first startup)
      const adminEmail = 'admin@test.com';
      const adminPassword = 'Admin123!';

      console.log('🔐 Hashing admin password...');
      const hashedPassword = await bcryptjs.hash(adminPassword, 12);
      console.log('✅ Password hashed, attempting to create user...');

      // Create admin user if not already present
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id, email',
        [adminEmail, hashedPassword, 'Admin', 'admin']
      );

      if (result.rows.length > 0) {
        console.log(`✅ Admin user created with ID: ${result.rows[0].id}`);
        console.log('✅ Ready to login: admin@test.com / Admin123!');
      } else {
        console.log('✅ Admin user already exists');
      }
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

    // Register Lighthouse performance audit scheduler
    try {
      const { scheduleLighthouseAudits } = require('../scheduler/lighthouse-scheduler');
      scheduleLighthouseAudits();
    } catch (err) {
      console.error('⚠️ Failed to start Lighthouse scheduler:', err.message);
    }

    // Start SQS blast worker for async email/SMS dispatch
    try {
      const { startBlastWorker } = require('./workers/blastWorker');
      startBlastWorker();
    } catch (err) {
      console.error('⚠️ Failed to start blast worker:', err.message);
    }
  });
}

module.exports = app;
// Last deploy: Sun May 10 20:47:53 CDT 2026
