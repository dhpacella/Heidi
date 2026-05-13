const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../db/connection');
const { requireSession } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const DASHBOARD_HTML = path.join(__dirname, '..', '..', '..', 'heidi_voter_dashboard_final_27.html');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

function setSession(req, user) {
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.name = user.name;
  req.session.role = user.role;
}

router.get('/', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  console.log('🔐 Login attempt:', { email, hasPassword: !!password });

  if (!email || !password) {
    console.log('❌ Missing email or password');
    return res.status(400).send('Email and password required');
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    console.log('📊 User lookup result:', { found: rows.length > 0, email });

    const user = rows[0];
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).send('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Password comparison:', { match: passwordMatch });

    if (!passwordMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).send('Invalid email or password');
    }

    setSession(req, user);
    console.log('✅ Login successful:', { email, userId: user.id });
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).send('Login failed');
  }
});

// Registration is disabled - only admins can create users via /api/admin/create-user

router.post('/logout', (req, res) => {
  if (!req.session) return res.redirect('/login');
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Logout failed');
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

router.get('/dashboard', requireSession, (req, res) => {
  res.sendFile(DASHBOARD_HTML);
});

router.get('/admin/users', requireSession, (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).send('Access denied. Admin privileges required.');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'admin-users.html'));
});

router.get('/sms-compose', requireSession, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'campaign_manager') {
    return res.status(403).send('Access denied. Admin or Campaign Manager required.');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'sms-compose.html'));
});

router.get('/sms-history', requireSession, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'campaign_manager') {
    return res.status(403).send('Access denied. Admin or Campaign Manager required.');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'sms-history.html'));
});

router.get('/email-compose', requireSession, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'campaign_manager') {
    return res.status(403).send('Access denied. Admin or Campaign Manager required.');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'email-compose.html'));
});

router.get('/email-history', requireSession, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'campaign_manager') {
    return res.status(403).send('Access denied. Admin or Campaign Manager required.');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'email-history.html'));
});

router.get('/email-lists', requireSession, (req, res) => {
  if (req.session.role !== 'admin' && req.session.role !== 'campaign_manager') {
    return res.status(403).send('Access denied. Admin or Campaign Manager required.');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'email-lists.html'));
});

module.exports = router;
