const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../db/connection');
const { signToken, requireApiAuth } = require('../middleware/auth');
const { putMetric } = require('../lib/cloudwatchClient');

const router = express.Router();

const BCRYPT_ROUNDS = 12;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await putMetric('LoginFailure', 1);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    await putMetric('LoginSuccess', 1);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('API login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Registration is disabled - only admins can create users via POST /api/admin/create-user

router.get('/me', requireApiAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('API me error:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

router.get('/session', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    user: {
      id: req.session.userId,
      email: req.session.email,
      name: req.session.name,
      role: req.session.role
    }
  });
});

router.post('/token', requireApiAuth, (req, res) => {
  const token = signToken(req.user);
  res.json({ token });
});

module.exports = router;
