const express = require('express');
const pool = require('../db/connection');
const { requireSession } = require('../middleware/auth');

const router = express.Router();

function requireVolunteer(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (req.session.role !== 'volunteer') return res.status(403).json({ error: 'Volunteer access only' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!['admin', 'campaign_manager'].includes(req.session.role)) return res.status(403).json({ error: 'Admin access only' });
  next();
}

// ── Volunteer: get own profile + assigned walk list ───────────────────────────
router.get('/me', requireVolunteer, async (req, res) => {
  try {
    const { rows: volRows } = await pool.query(
      `SELECT v.id, v.name, v.phone, v.status,
              p.id AS precinct_id, p.name AS precinct_name, p.precinct_code
       FROM volunteers v
       LEFT JOIN precincts p ON p.id = v.precinct_id
       WHERE v.user_id = $1`,
      [req.session.userId]
    );
    if (!volRows.length) return res.status(404).json({ error: 'Volunteer record not found' });
    const vol = volRows[0];

    const { rows: assignments } = await pool.query(
      `SELECT va.id, va.voter_id, va.status, va.outcome, va.concerns_list,
              va.visited_at, va.notes,
              vt.first_name, vt.last_name, vt.address, vt.phone AS voter_phone,
              vt.latitude, vt.longitude, vt.party_affiliation, vt.vote_frequency,
              vt.heidi_score
       FROM volunteer_assignments va
       JOIN voters vt ON vt.id = va.voter_id
       WHERE va.volunteer_id = $1
       ORDER BY vt.address NULLS LAST`,
      [vol.id]
    );

    const total = assignments.length;
    const contacted = assignments.filter(a => a.outcome && a.outcome !== 'pending').length;

    res.json({ volunteer: vol, assignments, stats: { total, contacted, remaining: total - contacted } });
  } catch (err) {
    console.error('Volunteer /me error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Volunteer: ping GPS location ──────────────────────────────────────────────
router.post('/location', requireVolunteer, async (req, res) => {
  const { lat, lon, accuracy } = req.body || {};
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  try {
    const { rows: [vol] } = await pool.query(
      'SELECT id FROM volunteers WHERE user_id = $1', [req.session.userId]
    );
    if (!vol) return res.status(404).json({ error: 'No volunteer record' });

    await pool.query(
      `INSERT INTO volunteer_gps (volunteer_id, latitude, longitude, accuracy)
       VALUES ($1, $2, $3, $4)`,
      [vol.id, lat, lon, accuracy || null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Volunteer: log contact outcome for a voter ────────────────────────────────
router.post('/contact/:assignmentId', requireVolunteer, async (req, res) => {
  const { assignmentId } = req.params;
  const { outcome, concerns, notes } = req.body || {};

  const VALID_OUTCOMES = ['supports','undecided','not_home','opposes','bad_address','come_back','skip'];
  if (!VALID_OUTCOMES.includes(outcome)) {
    return res.status(400).json({ error: 'Invalid outcome. Must be one of: ' + VALID_OUTCOMES.join(', ') });
  }

  try {
    const { rows: [vol] } = await pool.query(
      'SELECT id FROM volunteers WHERE user_id = $1', [req.session.userId]
    );
    if (!vol) return res.status(404).json({ error: 'No volunteer record' });

    const { rows, rowCount } = await pool.query(
      `UPDATE volunteer_assignments
       SET outcome = $1, concerns_list = $2, notes = $3,
           visited_at = CURRENT_TIMESTAMP, status = 'visited'
       WHERE id = $4 AND volunteer_id = $5
       RETURNING id`,
      [outcome, JSON.stringify(concerns || []), notes || null, assignmentId, vol.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Assignment not found' });

    // Also log to canvassing_activities
    const assignment = rows[0];
    await pool.query(
      `INSERT INTO canvassing_activities (voter_id, activity_type, notes, contact_result, created_by)
       SELECT voter_id, 'door_knock', $1, $2, $3 FROM volunteer_assignments WHERE id = $4`,
      [notes || null, outcome, req.session.email, assignmentId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Contact log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: get live volunteer positions ───────────────────────────────────────
router.get('/admin/live-positions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (g.volunteer_id)
        g.volunteer_id, g.latitude, g.longitude, g.accuracy, g.recorded_at,
        v.name AS volunteer_name,
        u.email,
        COUNT(va.id) FILTER (WHERE va.status = 'visited') AS doors_knocked,
        COUNT(va.id) AS doors_assigned
      FROM volunteer_gps g
      JOIN volunteers v ON v.id = g.volunteer_id
      LEFT JOIN users u ON u.id = v.user_id
      LEFT JOIN volunteer_assignments va ON va.volunteer_id = g.volunteer_id
      WHERE g.recorded_at > NOW() - INTERVAL '2 hours'
      GROUP BY g.volunteer_id, g.latitude, g.longitude, g.accuracy, g.recorded_at,
               v.name, u.email
      ORDER BY g.volunteer_id, g.recorded_at DESC
    `);
    res.json({ volunteers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: assign voters to a volunteer ───────────────────────────────────────
router.post('/admin/assign', requireAdmin, async (req, res) => {
  const { volunteer_id, precinct_id, preset, limit: limitParam } = req.body || {};
  if (!volunteer_id) return res.status(400).json({ error: 'volunteer_id required' });

  try {
    // Build voter query based on precinct and preset
    let conditions = ['va_check.volunteer_id IS NULL']; // not already assigned
    const params = [volunteer_id];

    if (precinct_id) {
      params.push(precinct_id);
      conditions.push(`vt.precinct_id = $${params.length}`);
    }

    // Preset filters
    if (preset === 'priority1') {
      conditions.push('vt.heidi_score >= 8');
    } else if (preset === 'persuadable') {
      conditions.push('vt.heidi_score BETWEEN 5 AND 7');
    } else if (preset === 'sleeper_rs') {
      conditions.push(`vt.party_affiliation ILIKE '%Lean R%' OR vt.party_affiliation ILIKE '%Strong R%'`);
      conditions.push(`(vt.vote_history IS NULL OR vt.vote_history->>'VH23M' IS NULL OR vt.vote_history->>'VH23M' = '')`);
    } else if (preset === 'muni_swing') {
      conditions.push(`vt.party_affiliation ILIKE '%Swing%'`);
      conditions.push(`vt.vote_history->>'VH23M' IS NOT NULL AND vt.vote_history->>'VH23M' != ''`);
    } else if (preset === 'has_phone') {
      conditions.push('vt.phone IS NOT NULL AND vt.phone != \'\'');
    }

    // Exclude opposition (score 1-3) unless explicitly included
    if (!['all'].includes(preset)) {
      conditions.push('(vt.heidi_score IS NULL OR vt.heidi_score >= 4)');
    }

    const maxRows = Math.min(parseInt(limitParam) || 150, 500);
    params.push(maxRows);

    const query = `
      INSERT INTO volunteer_assignments (volunteer_id, voter_id, status, preset_filter, assigned_by)
      SELECT $1, vt.id, 'pending', $${params.length - 1 > 1 ? (preset ? params.indexOf(preset) + 1 : 'NULL') : 'NULL'}, $1
      FROM voters vt
      LEFT JOIN volunteer_assignments va_check
        ON va_check.voter_id = vt.id AND va_check.volunteer_id = $1
      WHERE ${conditions.join(' AND ')}
        AND vt.address IS NOT NULL
      ORDER BY vt.heidi_score DESC NULLS LAST, vt.address
      LIMIT $${params.length}
      ON CONFLICT (volunteer_id, voter_id) DO NOTHING
      RETURNING voter_id
    `;

    // Fix the preset param reference
    const fixedParams = [volunteer_id];
    if (precinct_id) fixedParams.push(precinct_id);
    fixedParams.push(preset || null);
    fixedParams.push(req.session.userId);
    fixedParams.push(maxRows);

    const fixedQuery = `
      INSERT INTO volunteer_assignments (volunteer_id, voter_id, status, preset_filter, assigned_by, assigned_at)
      SELECT $1, vt.id, 'pending', $${precinct_id ? 3 : 2}, $${precinct_id ? 4 : 3}, CURRENT_TIMESTAMP
      FROM voters vt
      LEFT JOIN volunteer_assignments va_check
        ON va_check.voter_id = vt.id AND va_check.volunteer_id = $1
      WHERE ${conditions.join(' AND ')}
        AND vt.address IS NOT NULL
      ORDER BY vt.heidi_score DESC NULLS LAST, vt.address
      LIMIT $${fixedParams.length}
      ON CONFLICT (volunteer_id, voter_id) DO NOTHING
      RETURNING voter_id
    `;

    const { rowCount } = await pool.query(fixedQuery, fixedParams);
    res.json({ assigned: rowCount });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: clear pending assignments for a volunteer ─────────────────────────
router.delete('/admin/assign', requireAdmin, async (req, res) => {
  const { volunteer_id } = req.body || {};
  if (!volunteer_id) return res.status(400).json({ error: 'volunteer_id required' });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM volunteer_assignments WHERE volunteer_id = $1 AND status = 'pending'`,
      [volunteer_id]
    );
    res.json({ removed: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: canvassing results summary ─────────────────────────────────────────
router.get('/admin/results', requireAdmin, async (req, res) => {
  try {
    const { rows: byOutcome } = await pool.query(`
      SELECT outcome, COUNT(*) AS count
      FROM volunteer_assignments
      WHERE outcome IS NOT NULL
      GROUP BY outcome ORDER BY count DESC
    `);

    const { rows: byVolunteer } = await pool.query(`
      SELECT v.name,
             COUNT(*) FILTER (WHERE va.outcome IS NOT NULL) AS contacted,
             COUNT(*) AS assigned,
             COUNT(*) FILTER (WHERE va.outcome = 'supports') AS supports,
             COUNT(*) FILTER (WHERE va.outcome = 'undecided') AS undecided,
             COUNT(*) FILTER (WHERE va.outcome = 'not_home') AS not_home
      FROM volunteers v
      JOIN volunteer_assignments va ON va.volunteer_id = v.id
      GROUP BY v.id, v.name
      ORDER BY contacted DESC
    `);

    const { rows: concerns } = await pool.query(`
      SELECT elem AS concern, COUNT(*) AS count
      FROM volunteer_assignments, jsonb_array_elements_text(concerns_list) AS elem
      GROUP BY concern ORDER BY count DESC LIMIT 10
    `);

    res.json({ byOutcome, byVolunteer, topConcerns: concerns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
