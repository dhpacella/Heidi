const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

// POST /api/system-logs - Create a new system log entry
router.post('/', async (req, res) => {
  try {
    const { check_type, status, message, details } = req.body;

    if (!check_type || !status || !message) {
      return res.status(400).json({ error: 'check_type, status, and message are required' });
    }

    const result = await pool.query(
      'INSERT INTO system_logs (check_type, status, message, details) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [check_type, status, message, details ? JSON.stringify(details) : null]
    );

    res.status(201).json({
      id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (err) {
    console.error('System log create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system-logs - Retrieve system logs with pagination
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      'SELECT id, check_type, status, message, details, created_at FROM system_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    // Parse JSON details if they exist
    const logs = result.rows.map(log => ({
      ...log,
      details: log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : null
    }));

    res.json(logs);
  } catch (err) {
    console.error('System logs fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system-logs/stats - Get log statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM system_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
    `);

    const stats = {
      last_24h: {},
      total: 0
    };

    result.rows.forEach(row => {
      stats.last_24h[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    res.json(stats);
  } catch (err) {
    console.error('System logs stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
