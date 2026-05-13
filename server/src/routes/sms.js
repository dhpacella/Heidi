const express = require('express');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Health check — test database connection and sms_blasts table
router.get('/health', async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 as ok");
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sms_blasts'
      )`
    );
    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      return res.status(503).json({
        ok: false,
        error: 'sms_blasts table does not exist in database',
        suggestion: 'Run database migration'
      });
    }

    res.json({ ok: true, message: 'Database and sms_blasts table OK' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// POST /api/sms/send
// Stub — AWS SNS integration to be added later
// Body: { message: string, phones: string[], targets?: [{name, phone}] }
router.post('/send', requireRole('admin', 'campaign_manager'), async (req, res) => {
  const { message, phones, targets } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: 'phones must be a non-empty array' });
  }
  if (phones.length > 500) {
    return res.status(400).json({ error: 'Cannot send more than 500 messages per batch' });
  }

  // Opted-out filtering removed (sms_optouts table not yet in schema)
  const filteredPhones = phones;
  const optedOutCount = 0;

  if (filteredPhones.length === 0) {
    return res.status(400).json({ error: 'All recipients have opted out' });
  }

  // Personalization: if targets provided, replace tags per recipient
  const messages = [];
  if (targets && targets.length > 0) {
    // Build lookup: phone → {name, first, last}
    const lookup = {};
    targets.forEach(t => {
      if (t.phone) {
        const parts = (t.name || '').split(',');
        const last = (parts[0] || '').trim();
        const first = (parts[1] || '').trim();
        lookup[t.phone] = { first, last };
      }
    });

    filteredPhones.forEach(phone => {
      let msg = message;
      const person = lookup[phone];
      if (person) {
        msg = msg.replace(/{first_name}/g, person.first || '').replace(/{last_name}/g, person.last || '');
      }
      messages.push({ phone, msg });
    });
  } else {
    messages = filteredPhones.map(phone => ({ phone, msg: message }));
  }

  // Stub response — logs first 3 personalized messages
  const samples = messages.slice(0, 3).map(m => `${m.phone}: "${m.msg.substring(0, 50)}..."`).join(' | ');
  console.log(`[SMS STUB] Would send to ${filteredPhones.length} numbers (${optedOutCount} opted out). Samples: ${samples}`);

  // Log blast to database
  const parts = message.length <= 160 ? 1 : Math.ceil(message.length / 153);
  const totalCost = (filteredPhones.length * parts * 0.007).toFixed(4);

  try {
    await pool.query(
      `INSERT INTO sms_blasts (sender_id, message, recipient_count, parts_per_message, total_cost, status, results)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        message,
        filteredPhones.length,
        parts,
        totalCost,
        'sent',
        JSON.stringify({ total: filteredPhones.length, sent: filteredPhones.length, failed: 0, invalid: 0, optedOut: optedOutCount })
      ]
    );
  } catch (err) {
    console.error('SMS blast logging error:', err);
    // Don't fail the response if logging fails
  }

  res.json({
    success: true,
    stub: true,
    sent: filteredPhones.length,
    optedOut: optedOutCount,
    failed: 0,
    invalid: 0,
    message: `SMS stub — AWS SNS not yet connected. Blast logged to database (${optedOutCount} opted out).`
  });
});

// GET /api/sms/blasts - list all SMS blasts with pagination
router.get('/blasts', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    console.log(`📊 Fetching SMS blasts: page ${page}, limit ${limit}, offset ${offset}`);

    const { rows: blasts } = await pool.query(
      `SELECT b.*, u.name as sender_name
       FROM sms_blasts b
       LEFT JOIN users u ON b.sender_id = u.id
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    console.log(`✅ Retrieved ${blasts.length} blasts`);

    const { rows: countResult } = await pool.query('SELECT COUNT(*) as total FROM sms_blasts');
    const total = parseInt(countResult[0].total);

    console.log(`📈 Total blasts in database: ${total}`);

    res.json({
      blasts,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('❌ Fetch blasts error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// GET /api/sms/blasts/:id - get details of a specific blast
router.get('/blasts/:id', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, u.name as sender_name
       FROM sms_blasts b
       LEFT JOIN users u ON b.sender_id = u.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Blast not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Fetch blast error:', err);
    res.status(500).json({ error: 'Failed to fetch blast details' });
  }
});

module.exports = router;
