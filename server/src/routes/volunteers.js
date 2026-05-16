const express = require('express');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../lib/sesClient');
const { putGPS, getGPSHistory } = require('../lib/dynamoClient');
const { publishGPSEvent } = require('../lib/kinesisClient');

const router = express.Router();

// Preset concerns volunteers can quick-select
const PRESET_CONCERNS = [
  'Refuses to speak',
  'Not interested',
  'Prefers phone/email',
  'Already voting for us',
  'Do not contact'
];

// GET /api/volunteers - list all volunteers with optional precinct filter
router.get('/', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { precinct_id } = req.query;
    let query = `
      SELECT v.id, v.name, v.phone, v.precinct_id, p.name as precinct_name, v.status,
             COUNT(va.id) as assigned_count,
             SUM(CASE WHEN va.status = 'visited' THEN 1 ELSE 0 END) as visited_count
      FROM volunteers v
      LEFT JOIN precincts p ON v.precinct_id = p.id
      LEFT JOIN volunteer_assignments va ON v.id = va.volunteer_id
    `;
    let params = [];

    if (precinct_id) {
      query += ` WHERE v.precinct_id = $1`;
      params.push(precinct_id);
    }

    query += ` GROUP BY v.id, p.id ORDER BY v.name`;

    const { rows } = await pool.query(query, params);
    res.json({ volunteers: rows });
  } catch (err) {
    console.error('❌ Get volunteers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/volunteers - create volunteer + auto-create user account
router.post('/', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { name, phone, precinct_id, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' });
    }

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user account
      const userRes = await client.query(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES ($1, $2, $3, 'volunteer')
         ON CONFLICT (email) DO UPDATE SET role = 'volunteer'
         RETURNING id`,
        [email, name, hashedPassword]
      );
      const userId = userRes.rows[0].id;

      // Create volunteer
      const volRes = await client.query(
        `INSERT INTO volunteers (user_id, name, phone, precinct_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, phone, precinct_id, status, created_at`,
        [userId, name, phone, precinct_id || null]
      );

      await client.query('COMMIT');

      // Send welcome email with temp password
      const emailHtml = `
        <h2>Welcome to Heidi's Campaign!</h2>
        <p>You've been added as a volunteer. Here are your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p><a href="http://localhost:5000/volunteer-portal">Click here to access the volunteer portal</a></p>
        <p>Please change your password after first login.</p>
      `;

      sendEmail(email, 'Volunteer Account Created', emailHtml, '', 'noreply@heidi-campaign.com')
        .catch(err => console.error('❌ Email send error:', err.message));

      res.status(201).json({
        success: true,
        volunteer: volRes.rows[0],
        account: { email, tempPassword }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Create volunteer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volunteers/:id - get volunteer detail + assignments
router.get('/:id', requireRole('admin', 'campaign_manager', 'volunteer'), async (req, res) => {
  try {
    const volunteerId = req.params.id;

    // Check if volunteer is viewing their own data
    if (req.user.role === 'volunteer') {
      const volRes = await pool.query(
        'SELECT id FROM volunteers WHERE user_id = $1',
        [req.user.id]
      );
      if (!volRes.rows.length || volRes.rows[0].id != volunteerId) {
        return res.status(403).json({ error: 'Cannot view other volunteers' });
      }
    }

    const volRes = await pool.query(
      `SELECT v.id, v.user_id, v.name, v.phone, v.precinct_id, p.name as precinct_name,
              v.status, v.notes, v.created_at
       FROM volunteers v
       LEFT JOIN precincts p ON v.precinct_id = p.id
       WHERE v.id = $1`,
      [volunteerId]
    );

    if (!volRes.rows.length) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    const volunteer = volRes.rows[0];

    // Get assignments
    const assignRes = await pool.query(
      `SELECT va.id, va.voter_id, va.status, va.visited_at, va.notes,
              va.already_canvassed, va.canvassed_at, va.concerns,
              v.first_name, v.last_name, v.email, v.phone, v.address, v.party_affiliation
       FROM volunteer_assignments va
       JOIN voters v ON va.voter_id = v.id
       WHERE va.volunteer_id = $1
       ORDER BY v.last_name, v.first_name`,
      [volunteerId]
    );

    res.json({ volunteer, assignments: assignRes.rows, presetConcerns: PRESET_CONCERNS });
  } catch (err) {
    console.error('❌ Get volunteer detail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/volunteers/:id - delete volunteer
router.delete('/:id', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM volunteers WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json({ success: true, message: 'Volunteer deleted' });
  } catch (err) {
    console.error('❌ Delete volunteer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/volunteers/:id/assign - assign filtered voters to volunteer
router.post('/:id/assign', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const volunteerId = req.params.id;
    const { precinct, party, votedInYears, name } = req.body;

    // Build filter where clause
    let whereClause = '1=1';
    let params = [];

    if (precinct) {
      whereClause += ` AND v.precinct_id = $${params.length + 1}`;
      params.push(precinct);
    }
    if (party) {
      whereClause += ` AND v.party_affiliation = $${params.length + 1}`;
      params.push(party);
    }
    if (votedInYears) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM voting_history vh
        WHERE vh.voter_id = v.id AND vh.voted = true
        AND vh.election_year >= EXTRACT(YEAR FROM CURRENT_DATE) - $${params.length + 1}
      )`;
      params.push(votedInYears);
    }
    if (name) {
      whereClause += ` AND (v.first_name ILIKE $${params.length + 1} OR v.last_name ILIKE $${params.length + 1})`;
      params.push(`%${name}%`);
      params.push(`%${name}%`);
    }

    // Get voter IDs matching filters
    const voterRes = await pool.query(
      `SELECT id FROM voters WHERE ${whereClause}`,
      params
    );

    const voterIds = voterRes.rows.map(r => r.id);

    if (voterIds.length === 0) {
      return res.status(400).json({ error: 'No voters match the specified filters' });
    }

    // Insert assignments (ignore duplicates)
    const assignParams = [];
    let valuesPart = '';
    voterIds.forEach((voterId, idx) => {
      if (idx > 0) valuesPart += ',';
      valuesPart += `($1, $${idx + 2})`;
      assignParams.push(voterId);
    });

    assignParams.unshift(volunteerId);

    const assignRes = await pool.query(
      `INSERT INTO volunteer_assignments (volunteer_id, voter_id)
       VALUES ${valuesPart}
       ON CONFLICT DO NOTHING
       RETURNING voter_id`,
      assignParams
    );

    res.json({
      success: true,
      assigned: assignRes.rows.length,
      total: voterIds.length,
      message: `Assigned ${assignRes.rows.length} voters to volunteer`
    });
  } catch (err) {
    console.error('❌ Assign voters error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/volunteers/:id/assignments/:assignmentId - update visit status & concerns
router.patch('/:id/assignments/:assignmentId', requireRole('admin', 'campaign_manager', 'volunteer'), async (req, res) => {
  try {
    const { status, notes, concerns, alreadyCanvassed } = req.body;
    const volunteerId = req.params.id;
    const assignmentId = req.params.assignmentId;

    // Verify ownership if volunteer
    if (req.user.role === 'volunteer') {
      const volRes = await pool.query(
        'SELECT volunteer_id FROM volunteers WHERE user_id = $1',
        [req.user.id]
      );
      if (!volRes.rows.length || volRes.rows[0].volunteer_id != volunteerId) {
        return res.status(403).json({ error: 'Cannot update other volunteers\' assignments' });
      }
    }

    let updateQuery = 'UPDATE volunteer_assignments SET ';
    let params = [];
    let setClauses = [];

    if (status) {
      setClauses.push(`status = $${params.length + 1}`);
      params.push(status);

      if (status === 'visited') {
        setClauses.push(`visited_at = NOW()`);
      }
    }

    if (notes !== undefined) {
      setClauses.push(`notes = $${params.length + 1}`);
      params.push(notes);
    }

    if (concerns !== undefined) {
      setClauses.push(`concerns = $${params.length + 1}`);
      params.push(JSON.stringify(Array.isArray(concerns) ? concerns : [concerns]));
    }

    if (alreadyCanvassed !== undefined) {
      setClauses.push(`already_canvassed = $${params.length + 1}`);
      params.push(alreadyCanvassed);

      if (alreadyCanvassed) {
        setClauses.push(`canvassed_at = NOW()`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateQuery += setClauses.join(', ');
    updateQuery += ` WHERE id = $${params.length + 1} AND volunteer_id = $${params.length + 2}
                    RETURNING id, status, visited_at, concerns, already_canvassed, canvassed_at`;

    params.push(assignmentId, volunteerId);

    const { rows } = await pool.query(updateQuery, params);

    if (!rows.length) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ success: true, assignment: rows[0] });
  } catch (err) {
    console.error('❌ Update assignment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/volunteers/:id/gps - log GPS position (volunteer)
router.post('/:id/gps', requireRole('volunteer'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    // Verify volunteer is logging their own GPS
    const volRes = await pool.query(
      'SELECT id FROM volunteers WHERE user_id = $1 AND id = $2',
      [req.user.id, req.params.id]
    );

    if (!volRes.rows.length) {
      return res.status(403).json({ error: 'Cannot log GPS for other volunteers' });
    }

    const volunteerId = req.params.id;
    const timestamp = new Date().toISOString();

    // Write to PostgreSQL (source of truth)
    await pool.query(
      'INSERT INTO volunteer_gps (volunteer_id, latitude, longitude) VALUES ($1, $2, $3)',
      [volunteerId, latitude, longitude]
    );

    // Write to DynamoDB (real-time queries)
    try {
      await putGPS(volunteerId, timestamp, latitude, longitude);
    } catch (err) {
      console.warn('⚠️ Failed to write GPS to DynamoDB:', err.message);
    }

    // Publish to Kinesis (real-time streaming)
    try {
      await publishGPSEvent(volunteerId, latitude, longitude);
    } catch (err) {
      console.warn('⚠️ Failed to publish GPS to Kinesis:', err.message);
    }

    res.json({ success: true, message: 'GPS position recorded' });
  } catch (err) {
    console.error('❌ Log GPS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volunteers/:id/gps - get GPS history
router.get('/:id/gps', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    // Try DynamoDB first (faster for real-time queries)
    let rows = [];
    try {
      const items = await getGPSHistory(req.params.id, limit);
      rows = items.map(item => ({
        latitude: item.latitude,
        longitude: item.longitude,
        recorded_at: item.recordedAt
      }));
    } catch (err) {
      // Fall back to PostgreSQL
      console.warn('⚠️ DynamoDB query failed, falling back to PostgreSQL:', err.message);
      const pgRes = await pool.query(
        `SELECT latitude, longitude, recorded_at
         FROM volunteer_gps
         WHERE volunteer_id = $1
         ORDER BY recorded_at DESC
         LIMIT $2`,
        [req.params.id, limit]
      );
      rows = pgRes.rows;
    }

    res.json({ gps: rows });
  } catch (err) {
    console.error('❌ Get GPS history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/volunteers/gps/live - latest GPS for all active volunteers
router.get('/gps/live', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (vg.volunteer_id)
              v.id, v.name, v.precinct_id, p.name as precinct_name,
              vg.latitude, vg.longitude, vg.recorded_at
       FROM volunteer_gps vg
       JOIN volunteers v ON vg.volunteer_id = v.id
       LEFT JOIN precincts p ON v.precinct_id = p.id
       ORDER BY vg.volunteer_id, vg.recorded_at DESC`
    );

    res.json({ volunteers: rows });
  } catch (err) {
    console.error('❌ Get live GPS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
