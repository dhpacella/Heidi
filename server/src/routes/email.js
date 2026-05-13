const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizeEmail, sendEmail } = require('../lib/sesClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;
const SES_COST_PER_EMAIL = 0.0001;

// Health check — test database connection and email_blasts table
router.get('/health', async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 as ok");
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'email_blasts'
      )`
    );
    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      return res.status(503).json({
        ok: false,
        error: 'email_blasts table does not exist in database',
        suggestion: 'POST to /api/email/migrate-db to create it'
      });
    }

    res.json({ ok: true, message: 'Database and email_blasts table OK' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Migrate database (admin only) — creates email_blasts table if it doesn't exist
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
        message: 'Database migrated successfully. email_blasts table is ready.'
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

// Helper: Find email column in headers
function findEmailColumn(headers) {
  const lower = headers.map(h => h.toLowerCase());

  for (let h of headers) {
    const lc = h.toLowerCase();
    if (lc === 'email') return h;
  }
  for (let h of headers) {
    const lc = h.toLowerCase();
    if (lc === 'e-mail' || lc === 'email_address' || lc === 'emailaddress') return h;
  }

  return null;
}

// Helper: Find personalization columns
function findPersonalizationColumns(headers) {
  const result = { firstName: null, lastName: null };
  const lower = headers.map(h => h.toLowerCase());

  for (let h of headers) {
    const lc = h.toLowerCase();
    if (!result.firstName && (lc === 'first_name' || lc === 'firstname' || lc === 'first')) {
      result.firstName = h;
    }
    if (!result.lastName && (lc === 'last_name' || lc === 'lastname' || lc === 'last')) {
      result.lastName = h;
    }
  }

  return result;
}

// POST /api/email/send
// Send HTML emails via AWS SES with file upload
router.post('/send', requireRole('admin', 'campaign_manager'), upload.single('file'), async (req, res) => {
  const { subject, htmlBody, textBody } = req.body || {};

  if (!req.file) {
    return res.status(400).json({ error: 'file is required' });
  }
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'subject is required' });
  }
  if (!htmlBody || typeof htmlBody !== 'string' || !htmlBody.trim()) {
    return res.status(400).json({ error: 'htmlBody is required' });
  }

  const fromAddress = process.env.SES_FROM_EMAIL || 'noreply@example.com';

  console.log(`📧 Processing email send request: ${req.file.originalname}`);

  try {
    // Parse file (CSV or Excel)
    let records = [];
    const mimeType = req.file.mimetype;
    const filename = req.file.originalname.toLowerCase();

    if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
      records = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true });
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || filename.endsWith('.xlsx')) {
      const workbook = XLSX.read(req.file.buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ error: 'File must be CSV or Excel (.xlsx)' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'File contains no records' });
    }

    console.log(`📄 Parsed ${records.length} records from file`);

    // Find email column
    const headers = Object.keys(records[0]);
    const emailColumn = findEmailColumn(headers);
    if (!emailColumn) {
      return res.status(400).json({
        error: 'No email column found — please name a column "email", "Email", or "e-mail"'
      });
    }

    // Find personalization columns
    const personalization = findPersonalizationColumns(headers);

    // Extract and normalize emails
    let validRecords = [];
    let invalidCount = 0;

    records.forEach((record, idx) => {
      const email = record[emailColumn];
      const normalized = normalizeEmail(email);
      if (normalized) {
        validRecords.push({
          email: normalized,
          firstName: personalization.firstName ? (record[personalization.firstName] || '') : '',
          lastName: personalization.lastName ? (record[personalization.lastName] || '') : ''
        });
      } else {
        invalidCount++;
      }
    });

    console.log(`  ✅ Valid: ${validRecords.length} | ❌ Invalid: ${invalidCount}`);

    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid email addresses in file' });
    }

    if (validRecords.length > 500) {
      return res.status(400).json({ error: 'Cannot send to more than 500 recipients per batch' });
    }

    // Send via SES in batches
    let results = [];
    console.log(`📤 Sending ${validRecords.length} emails in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);

      // Personalize each email in batch
      const personalizedBatch = batch.map(record => {
        let personalized = htmlBody
          .replace(/{first_name}/g, record.firstName || '')
          .replace(/{last_name}/g, record.lastName || '');

        let textPersonalized = textBody || ''
          .replace(/{first_name}/g, record.firstName || '')
          .replace(/{last_name}/g, record.lastName || '');

        return { email: record.email, htmlBody: personalized, textBody: textPersonalized };
      });

      // Send batch in parallel
      const batchResults = await Promise.all(
        personalizedBatch.map(item => sendEmail(item.email, subject, item.htmlBody, item.textBody, fromAddress))
      );
      results.push(...batchResults);

      // Delay between batches (except for the last one)
      if (i + BATCH_SIZE < validRecords.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Calculate send stats
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const totalCost = (sentCount * SES_COST_PER_EMAIL).toFixed(6);

    console.log(`\n📊 Send complete: ${sentCount} sent, ${failedCount} failed, ${invalidCount} invalid`);

    // Determine blast status
    let status = 'sent';
    if (sentCount > 0 && failedCount > 0) status = 'partial';
    if (sentCount === 0) status = 'failed';

    // Store detailed results in JSONB
    const resultsJson = {
      total: validRecords.length,
      sent: sentCount,
      failed: failedCount,
      invalid: invalidCount,
      details: results
    };

    // Log blast to database
    try {
      const insertResult = await pool.query(
        `INSERT INTO email_blasts (sender_id, subject, html_body, from_address, recipient_count, total_cost, status, results)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          req.user.id,
          subject,
          htmlBody,
          fromAddress,
          sentCount,
          totalCost,
          status,
          JSON.stringify(resultsJson)
        ]
      );
      const blastId = insertResult.rows[0].id;
      console.log(`✅ Blast logged to database (ID: ${blastId})`);

      // Save individual recipients
      if (validRecords.length > 0) {
        const recipientValues = validRecords.map((_, i) =>
          `($1, $${i*4+2}, $${i*4+3}, $${i*4+4}, $${i*4+5})`
        ).join(',');

        const params = [blastId];
        validRecords.forEach((record, idx) => {
          params.push(record.email, record.firstName || null, record.lastName || null, results[idx]?.success ? 'sent' : 'failed');
        });

        await pool.query(
          `INSERT INTO email_recipients (blast_id, email, first_name, last_name, status) VALUES ${recipientValues}`,
          params
        );
        console.log(`✅ Saved ${validRecords.length} recipients`);
      }
    } catch (err) {
      console.error('❌ Email blast logging error:', err.message);
      // Don't fail the response if logging fails — send was successful
    }

    res.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      invalid: invalidCount,
      message: `Email sent to ${sentCount} recipients (${failedCount} failed, ${invalidCount} invalid)`
    });
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    res.status(500).json({ error: `Email send failed: ${err.message}` });
  }
});

// GET /api/email/blasts - list all email blasts with pagination
router.get('/blasts', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    console.log(`📊 Fetching email blasts: page ${page}, limit ${limit}, offset ${offset}`);

    const { rows: blasts } = await pool.query(
      `SELECT b.*, u.name as sender_name
       FROM email_blasts b
       LEFT JOIN users u ON b.sender_id = u.id
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    console.log(`✅ Retrieved ${blasts.length} blasts`);

    const { rows: countResult } = await pool.query('SELECT COUNT(*) as total FROM email_blasts');
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
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// GET /api/email/blasts/:id - get details of a specific blast
router.get('/blasts/:id', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, u.name as sender_name
       FROM email_blasts b
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

// GET /api/email/blasts/:id/recipients - get recipients for a blast
router.get('/blasts/:id/recipients', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT email, first_name, last_name, status, created_at
       FROM email_recipients
       WHERE blast_id = $1
       ORDER BY id
       LIMIT 100`,
      [req.params.id]
    );

    res.json({ recipients: rows, total: rows.length });
  } catch (err) {
    console.error('Fetch recipients error:', err);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

module.exports = router;
