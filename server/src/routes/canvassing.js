const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

const ALLOWED_TYPES = new Set(['door_knock', 'phone_call', 'text_message', 'email', 'mail', 'other']);

router.post('/log', async (req, res) => {
  try {
    const { voterId, type, notes, contactResult } = req.body || {};
    if (!voterId || !type) {
      return res.status(400).json({ error: 'voterId and type are required' });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({
        error: `type must be one of: ${[...ALLOWED_TYPES].join(', ')}`
      });
    }

    const voterCheck = await pool.query('SELECT id FROM voters WHERE id = $1', [voterId]);
    if (voterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Voter not found' });
    }

    const createdBy = req.user?.email || 'unknown';
    const { rows } = await pool.query(
      `INSERT INTO canvassing_activities (voter_id, activity_type, notes, contact_result, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, voter_id, activity_type, notes, contact_result, created_at, created_by`,
      [voterId, type, notes || null, contactResult || null, createdBy]
    );

    res.status(201).json({ activity: rows[0] });
  } catch (err) {
    console.error('Canvassing log error:', err);
    res.status(500).json({ error: 'Failed to log canvassing activity' });
  }
});

router.get('/history/:voterId', async (req, res) => {
  try {
    const voterId = parseInt(req.params.voterId, 10);
    if (Number.isNaN(voterId)) return res.status(400).json({ error: 'Invalid voterId' });

    const { rows } = await pool.query(
      `SELECT id, voter_id, activity_type, notes, contact_result, created_at, created_by
       FROM canvassing_activities
       WHERE voter_id = $1
       ORDER BY created_at DESC`,
      [voterId]
    );
    res.json({ activities: rows });
  } catch (err) {
    console.error('Canvassing history error:', err);
    res.status(500).json({ error: 'Failed to load canvassing history' });
  }
});

module.exports = router;
