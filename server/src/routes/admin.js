const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const { requireApiAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Create a new user (admin only)
router.post('/create-user', requireApiAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, name, password, role } = req.body || {};

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const userRole = role && ['admin', 'staff'].includes(role) ? role : 'staff';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const insertRes = await pool.query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, name, passwordHash, userRole]
    );

    const user = insertRes.rows[0];
    res.status(201).json({
      success: true,
      message: `User ${email} created successfully`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all users (admin only)
router.get('/users', requireApiAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Delete a user (admin only)
router.delete('/users/:id', requireApiAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the current user
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deleteRes = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: `User ${deleteRes.rows[0].email} deleted`,
      user: deleteRes.rows[0]
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user role (admin only)
router.patch('/users/:id/role', requireApiAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!role || !['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updateRes = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;
