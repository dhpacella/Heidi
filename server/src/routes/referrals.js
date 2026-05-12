const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

const ALLOWED_STATUSES = new Set(['sent', 'opened', 'clicked', 'interested', 'converted', 'not_interested']);
const ALLOWED_METHODS = new Set(['email', 'sms', 'both']);

router.get('/', async (req, res) => {
  try {
    const { status, method, from, to, search, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM voter_referrals WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (status && ALLOWED_STATUSES.has(status)) {
      sql += ` AND status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (method && ALLOWED_METHODS.has(method)) {
      sql += ` AND contact_method = $${paramIdx}`;
      params.push(method);
      paramIdx++;
    }

    if (from) {
      sql += ` AND created_at >= $${paramIdx}`;
      params.push(from);
      paramIdx++;
    }

    if (to) {
      sql += ` AND created_at < $${paramIdx}`;
      params.push(to);
      paramIdx++;
    }

    if (search) {
      sql += ` AND (referred_first_name ILIKE $${paramIdx} OR referred_last_name ILIKE $${paramIdx} OR referred_email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      paramIdx += 2;
    }

    const countRes = await pool.query(
      sql.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit);
    params.push(offset);

    const { rows } = await pool.query(sql, params);
    res.json({ referrals: rows, total });
  } catch (err) {
    console.error('Referrals list error:', err);
    res.status(500).json({ error: 'Failed to load referrals' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
        COUNT(CASE WHEN status = 'interested' THEN 1 END) as interested,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN status = 'not_interested' THEN 1 END) as not_interested
      FROM voter_referrals
    `);

    const stats = rows[0];
    const conversionRate = stats.total > 0
      ? ((stats.converted / stats.total) * 100).toFixed(1)
      : 0;

    res.json({
      total: parseInt(stats.total, 10),
      sent: parseInt(stats.sent, 10),
      opened: parseInt(stats.opened, 10),
      clicked: parseInt(stats.clicked, 10),
      interested: parseInt(stats.interested, 10),
      converted: parseInt(stats.converted, 10),
      not_interested: parseInt(stats.not_interested, 10),
      conversionRate: parseFloat(conversionRate)
    });
  } catch (err) {
    console.error('Referrals stats error:', err);
    res.status(500).json({ error: 'Failed to load referrals stats' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid referral ID' });
    }

    const { status, notes } = req.body || {};

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        error: `status must be one of: ${[...ALLOWED_STATUSES].join(', ')}`
      });
    }

    const { rows } = await pool.query(
      `UPDATE voter_referrals
       SET status = $1, notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes || null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json({ referral: rows[0] });
  } catch (err) {
    console.error('Referral update error:', err);
    res.status(500).json({ error: 'Failed to update referral' });
  }
});

module.exports = router;
