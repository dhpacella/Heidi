const express = require('express');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizePhone, sendSms } = require('../lib/snsClient');

const router = express.Router();
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

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
        suggestion: 'POST to /api/sms/migrate-db to create it'
      });
    }

    res.json({ ok: true, message: 'Database and sms_blasts table OK' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Migrate database (admin only) — creates sms_blasts table if it doesn't exist
router.post('/migrate-db', requireRole('admin'), async (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    console.log('🔄 Running database migration...');
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration complete');

      res.json({
        success: true,
        message: 'Database migrated successfully. sms_blasts table is ready.'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    res.status(500).json({
      error: 'Migration failed',
      details: err.message
    });
  }
});

// POST /api/sms/send
// Send SMS via AWS SNS with batched delivery
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

  console.log(`📱 Processing SMS send request: ${phones.length} recipients`);

  // Normalize all phones, collect invalid ones
  let normalizedPhones = [];
  let invalidPhones = [];

  phones.forEach(phone => {
    const normalized = normalizePhone(phone);
    if (normalized) {
      normalizedPhones.push({ raw: phone, normalized });
    } else {
      invalidPhones.push(phone);
    }
  });

  const invalidCount = invalidPhones.length;
  console.log(`  ✅ Valid: ${normalizedPhones.length} | ❌ Invalid: ${invalidCount}`);

  if (normalizedPhones.length === 0) {
    return res.status(400).json({
      error: 'All phone numbers are invalid (must be 10 or 11-digit US numbers)'
    });
  }

  // Build personalization lookup if targets provided
  let personalizationMap = {};
  if (targets && targets.length > 0) {
    targets.forEach(t => {
      if (t.phone) {
        const parts = (t.name || '').split(',');
        const last = (parts[0] || '').trim();
        const first = (parts[1] || '').trim();
        personalizationMap[t.phone] = { first, last };
      }
    });
  }

  // Send via SNS in batches
  let results = [];
  console.log(`📤 Sending ${normalizedPhones.length} messages in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < normalizedPhones.length; i += BATCH_SIZE) {
    const batch = normalizedPhones.slice(i, i + BATCH_SIZE);

    // Personalize each message in batch
    const personalizedBatch = batch.map(item => {
      let msg = message;
      const person = personalizationMap[item.raw];
      if (person) {
        msg = msg.replace(/{first_name}/g, person.first || '')
               .replace(/{last_name}/g, person.last || '');
      }
      return { phone: item.normalized, message: msg };
    });

    // Send batch in parallel
    const batchResults = await Promise.all(
      personalizedBatch.map(item => sendSms(item.phone, item.message))
    );
    results.push(...batchResults);

    // Delay between batches (except for the last one)
    if (i + BATCH_SIZE < normalizedPhones.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Calculate send stats
  const sentCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`\n📊 Send complete: ${sentCount} sent, ${failedCount} failed, ${invalidCount} invalid`);

  // Calculate SMS parts and cost (based on actual message sent, not normalized)
  const parts = message.length <= 160 ? 1 : Math.ceil(message.length / 153);
  const totalCost = (sentCount * parts * 0.007).toFixed(4);

  // Determine blast status
  let status = 'sent';
  if (sentCount > 0 && failedCount > 0) status = 'partial';
  if (sentCount === 0) status = 'failed';

  // Store detailed results in JSONB
  const resultsJson = {
    total: normalizedPhones.length,
    sent: sentCount,
    failed: failedCount,
    invalid: invalidCount,
    optedOut: 0,
    details: results
  };

  // Log blast to database
  try {
    await pool.query(
      `INSERT INTO sms_blasts (sender_id, message, recipient_count, parts_per_message, total_cost, status, results)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        message,
        sentCount,
        parts,
        totalCost,
        status,
        JSON.stringify(resultsJson)
      ]
    );
    console.log(`✅ Blast logged to database`);
  } catch (err) {
    console.error('❌ SMS blast logging error:', err.message);
    // Don't fail the response if logging fails — send was successful
  }

  res.json({
    success: true,
    sent: sentCount,
    failed: failedCount,
    invalid: invalidCount,
    optedOut: 0,
    message: `SMS sent to ${sentCount} recipients (${failedCount} failed, ${invalidCount} invalid)`
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
