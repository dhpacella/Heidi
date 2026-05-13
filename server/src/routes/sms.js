const express = require('express');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

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

  // Fetch opted-out numbers
  let optedOutSet = new Set();
  try {
    const { rows: optouts } = await pool.query('SELECT phone FROM sms_optouts');
    optedOutSet = new Set(optouts.map(o => o.phone));
  } catch (err) {
    console.error('Error fetching optouts:', err);
    // Continue without optouts if query fails
  }

  // Filter out opted-out numbers
  const filteredPhones = phones.filter(phone => !optedOutSet.has(phone));
  const optedOutCount = phones.length - filteredPhones.length;

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
router.get('/blasts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { rows: blasts } = await pool.query(
      `SELECT b.*, u.name as sender_name
       FROM sms_blasts b
       LEFT JOIN users u ON b.sender_id = u.id
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: countResult } = await pool.query('SELECT COUNT(*) as total FROM sms_blasts');
    const total = parseInt(countResult[0].total);

    res.json({
      blasts,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Fetch blasts error:', err);
    res.status(500).json({ error: 'Failed to fetch SMS blasts' });
  }
});

// GET /api/sms/blasts/:id - get details of a specific blast
router.get('/blasts/:id', async (req, res) => {
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

// POST /api/sms/optout - add a phone number to optout list
router.post('/optout', async (req, res) => {
  const { phone, reason } = req.body || {};

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'phone is required' });
  }

  try {
    await pool.query(
      'INSERT INTO sms_optouts (phone, reason) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING',
      [phone.trim(), reason || null]
    );

    res.json({ success: true, message: `Phone ${phone} opted out` });
  } catch (err) {
    console.error('Optout error:', err);
    res.status(500).json({ error: 'Failed to record optout' });
  }
});

// GET /api/sms/optouts - list all opted-out numbers (admin only)
router.get('/optouts', requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT phone, opted_out_at, reason FROM sms_optouts ORDER BY opted_out_at DESC'
    );

    res.json({ optouts: rows });
  } catch (err) {
    console.error('Fetch optouts error:', err);
    res.status(500).json({ error: 'Failed to fetch optouts' });
  }
});

module.exports = router;
