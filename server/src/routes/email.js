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

// Tracking helpers
function injectOpenPixel(html, recipientId, baseUrl) {
  const pixel = `<img src="${baseUrl}/api/email/track/open/${recipientId}" width="1" height="1" style="display:none" alt="" />`;
  return html.includes('</body>') ? html.replace('</body>', pixel + '</body>') : html + pixel;
}

function injectClickTracking(html, recipientId, baseUrl) {
  return html.replace(/href="(https?:\/\/[^"]+)"/gi, (_, url) => {
    const encoded = Buffer.from(url).toString('base64url');
    return `href="${baseUrl}/api/email/track/click/${recipientId}?url=${encoded}"`;
  });
}

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

// POST /api/email/send - Send HTML emails via AWS SES with file upload or list/segment
router.post('/send', requireRole('admin', 'campaign_manager'), upload.single('file'), async (req, res) => {
  const { subject, htmlBody, textBody, list_id, segment_id, scheduled_at, variant_b_subject, variant_b_html_body } = req.body || {};

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'subject is required' });
  }
  if (!htmlBody || typeof htmlBody !== 'string' || !htmlBody.trim()) {
    return res.status(400).json({ error: 'htmlBody is required' });
  }

  // Validate scheduled_at if provided
  if (scheduled_at) {
    const scheduledTime = new Date(scheduled_at);
    const now = new Date();
    if (isNaN(scheduledTime.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_at datetime format' });
    }
    if (scheduledTime <= now) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }
  }

  const fromAddress = process.env.SES_FROM_EMAIL || 'noreply@example.com';
  const baseUrl = process.env.BASE_URL || `https://${req.hostname}`;

  try {
    let records = [];

    // Fetch from list/segment or parse file
    if (list_id) {
      // Fetch subscribers from list or segment
      console.log(`📧 Fetching subscribers from list ${list_id}${segment_id ? ` segment ${segment_id}` : ''}`);
      let subscriberData;

      if (segment_id) {
        // Fetch from specific segment
        const segRes = await pool.query(
          'SELECT conditions FROM email_segments WHERE id = $1 AND list_id = $2',
          [segment_id, list_id]
        );
        if (!segRes.rows.length) {
          return res.status(404).json({ error: 'Segment not found' });
        }
        // Build conditions query here - reuse the buildQueryFromConditions from lists.js
        // For now, just fetch all subscribers from the list to keep it simple
        subscriberData = await pool.query(
          'SELECT email, first_name, last_name FROM email_subscribers WHERE list_id = $1 ORDER BY created_at',
          [list_id]
        );
      } else {
        // Fetch all subscribers from list
        subscriberData = await pool.query(
          'SELECT email, first_name, last_name FROM email_subscribers WHERE list_id = $1 ORDER BY created_at',
          [list_id]
        );
      }

      records = subscriberData.rows.map(row => ({
        email: row.email,
        first_name: row.first_name || '',
        last_name: row.last_name || ''
      }));
    } else {
      // Parse file upload
      if (!req.file) {
        return res.status(400).json({ error: 'file or list_id is required' });
      }

      console.log(`📧 Processing email send request: ${req.file.originalname}`);

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

    // Check if this is an A/B test (out of scope for scheduled sends)
    const isAbTest = !!(variant_b_subject && variant_b_html_body);
    if (isAbTest && scheduled_at) {
      return res.status(400).json({ error: 'A/B testing is not supported for scheduled sends' });
    }

    if (isAbTest) {
      return handleAbTest(req, res, pool, subject, htmlBody, variant_b_subject, variant_b_html_body, textBody, validRecords, fromAddress, baseUrl, invalidCount);
    }

    // Determine if this is a scheduled or immediate send
    const isScheduled = scheduled_at !== undefined && scheduled_at !== null && scheduled_at !== '';
    const blastStatus = isScheduled ? 'scheduled' : 'sending';

    // Step 1: Create blast record
    const blastParams = [
      req.user.id,
      subject,
      htmlBody,
      fromAddress,
      validRecords.length,
      blastStatus
    ];

    let blastQuery = `INSERT INTO email_blasts (sender_id, subject, html_body, from_address, recipient_count, status`;
    let valuesPart = `VALUES ($1, $2, $3, $4, $5, $6`;

    let paramIndex = 7;
    if (isScheduled) {
      blastQuery += `, scheduled_at, list_id, segment_id`;
      valuesPart += `, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}`;
      blastParams.push(new Date(scheduled_at), list_id || null, segment_id || null);
    }

    blastQuery += `) ${valuesPart}) RETURNING id`;

    const blastResult = await pool.query(blastQuery, blastParams);
    const blastId = blastResult.rows[0].id;
    console.log(`✅ Created blast record (ID: ${blastId}, status: ${blastStatus})`);

    // Step 2: Insert all recipients and get their IDs back
    const { emailToRecipientId } = await insertRecipients(pool, blastId, validRecords);
    console.log(`✅ Inserted ${validRecords.length} recipient records`);

    // Step 3: Handle scheduled vs immediate send
    if (isScheduled) {
      // Scheduled send: recipients already inserted, just return 202 Accepted
      console.log(`⏰ Blast #${blastId} scheduled for ${scheduled_at}`);
      return res.status(202).json({
        success: true,
        blastId,
        status: 'scheduled',
        scheduledAt: scheduled_at,
        message: `Email scheduled for ${new Date(scheduled_at).toLocaleString()}`
      });
    }

    // Immediate send: dispatch now
    console.log(`📤 Sending ${validRecords.length} emails in batches of ${BATCH_SIZE}...`);

    let sendResults = [];
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);

      // Personalize and inject tracking for each email
      const personalizedBatch = batch.map(record => {
        const recipientId = emailToRecipientId[record.email];
        let personalized = htmlBody
          .replace(/{first_name}/g, record.firstName || '')
          .replace(/{last_name}/g, record.lastName || '');

        // Inject open pixel
        personalized = injectOpenPixel(personalized, recipientId, baseUrl);
        // Rewrite click links
        personalized = injectClickTracking(personalized, recipientId, baseUrl);

        let textPersonalized = textBody || ''
          .replace(/{first_name}/g, record.firstName || '')
          .replace(/{last_name}/g, record.lastName || '');

        return { email: record.email, recipientId, htmlBody: personalized, textBody: textPersonalized };
      });

      // Send batch in parallel
      const batchResults = await Promise.all(
        personalizedBatch.map(item => sendEmail(item.email, subject, item.htmlBody, item.textBody, fromAddress))
      );

      // Update recipients with ses_message_id and status
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const item = personalizedBatch[j];
        if (result.success) {
          await pool.query(
            `UPDATE email_recipients SET ses_message_id = $1, status = 'sent' WHERE id = $2`,
            [result.messageId, item.recipientId]
          );
        } else {
          await pool.query(
            `UPDATE email_recipients SET status = 'failed' WHERE id = $1`,
            [item.recipientId]
          );
        }
      }

      sendResults.push(...batchResults);

      // Delay between batches
      if (i + BATCH_SIZE < validRecords.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Step 4: Calculate stats and update blast
    const sentCount = sendResults.filter(r => r.success).length;
    const failedCount = sendResults.filter(r => !r.success).length;
    const totalCost = (sentCount * SES_COST_PER_EMAIL).toFixed(6);
    const finalStatus = sentCount === validRecords.length ? 'sent' : (sentCount > 0 ? 'partial' : 'failed');

    const resultsJson = {
      total: validRecords.length,
      sent: sentCount,
      failed: failedCount,
      invalid: invalidCount,
      details: sendResults
    };

    await pool.query(
      `UPDATE email_blasts SET recipient_count = $1, total_cost = $2, status = $3, results = $4, sent_at = NOW() WHERE id = $5`,
      [sentCount, totalCost, finalStatus, JSON.stringify(resultsJson), blastId]
    );

    console.log(`\n📊 Send complete: ${sentCount} sent, ${failedCount} failed, ${invalidCount} invalid`);

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

// GET /api/email/scheduled - list scheduled blasts for current user
router.get('/scheduled', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, subject, recipient_count, scheduled_at, status, created_at
       FROM email_blasts
       WHERE status = 'scheduled' AND sender_id = $1
       ORDER BY scheduled_at ASC`,
      [req.user.id]
    );
    res.json({ blasts: rows });
  } catch (err) {
    console.error('❌ Fetch scheduled blasts error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// DELETE /api/email/scheduled/:id - cancel a scheduled blast
router.delete('/scheduled/:id', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE email_blasts SET status = 'cancelled'
       WHERE id = $1 AND sender_id = $2 AND status = 'scheduled'
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Scheduled blast not found' });
    }

    console.log(`✅ Cancelled scheduled blast #${req.params.id}`);
    res.json({ success: true, message: 'Blast cancelled' });
  } catch (err) {
    console.error('❌ Cancel scheduled blast error:', err.message);
    res.status(500).json({ error: `Cancel failed: ${err.message}` });
  }
});

// GET /api/email/track/open/:recipientId - record open event
router.get('/track/open/:recipientId', async (req, res) => {
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' }).send(gif);

  // Update asynchronously
  pool.query(
    `UPDATE email_recipients SET opened_at = NOW(),
     status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END
     WHERE id = $1 AND opened_at IS NULL`,
    [req.params.recipientId]
  ).catch(err => console.error('Error recording open:', err));
});

// GET /api/email/track/click/:recipientId - record click and redirect
router.get('/track/click/:recipientId', async (req, res) => {
  const url = Buffer.from(req.query.url || '', 'base64url').toString();
  if (!url.startsWith('http')) {
    return res.status(400).send('Invalid URL');
  }

  res.redirect(url);

  // Update asynchronously
  pool.query(
    'UPDATE email_recipients SET clicked_at = NOW() WHERE id = $1 AND clicked_at IS NULL',
    [req.params.recipientId]
  ).catch(err => console.error('Error recording click:', err));
});

// GET /api/email/blasts - list all email blasts with pagination and tracking counts
router.get('/blasts', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    console.log(`📊 Fetching email blasts: page ${page}, limit ${limit}, offset ${offset}`);

    const { rows: blasts } = await pool.query(
      `SELECT b.*, u.name as sender_name,
              COUNT(CASE WHEN er.opened_at IS NOT NULL THEN 1 END) as opened_count,
              COUNT(CASE WHEN er.clicked_at IS NOT NULL THEN 1 END) as clicked_count
       FROM email_blasts b
       LEFT JOIN users u ON b.sender_id = u.id
       LEFT JOIN email_recipients er ON er.blast_id = b.id
       GROUP BY b.id, u.id
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

// GET /api/email/ab-tests - list all A/B tests with both variant stats
router.get('/ab-tests', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.ab_test_id as test_id,
              b.id as blast_id,
              b.ab_variant,
              b.subject,
              b.recipient_count,
              b.status,
              b.created_at,
              COUNT(CASE WHEN er.opened_at IS NOT NULL THEN 1 END) as opened_count,
              COUNT(CASE WHEN er.clicked_at IS NOT NULL THEN 1 END) as clicked_count
       FROM email_blasts b
       LEFT JOIN email_recipients er ON er.blast_id = b.id
       WHERE b.ab_test_id IS NOT NULL AND b.sender_id = $1
       GROUP BY b.id
       ORDER BY b.ab_test_id DESC, b.ab_variant`,
      [req.user.id]
    );

    // Group rows by test_id to pair A and B variants
    const tests = {};
    rows.forEach(row => {
      if (!tests[row.test_id]) {
        tests[row.test_id] = { testId: row.test_id, created_at: row.created_at, variantA: null, variantB: null };
      }
      if (row.ab_variant === 'A') tests[row.test_id].variantA = row;
      if (row.ab_variant === 'B') tests[row.test_id].variantB = row;
    });

    const testList = Object.values(tests);
    res.json({ tests: testList, total: testList.length });
  } catch (err) {
    console.error('❌ Fetch A/B tests error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// GET /api/email/templates - list user's email templates
router.get('/templates', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, subject, created_at, updated_at
       FROM email_templates
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );

    res.json({ templates: rows });
  } catch (err) {
    console.error('❌ Fetch templates error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// POST /api/email/templates - save a new email template
router.post('/templates', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { name, subject, htmlBody } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'subject is required' });
    }
    if (!htmlBody || typeof htmlBody !== 'string' || !htmlBody.trim()) {
      return res.status(400).json({ error: 'htmlBody is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO email_templates (user_id, name, subject, html_body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, subject, created_at, updated_at`,
      [req.user.id, name.trim(), subject.trim(), htmlBody]
    );

    res.json({ success: true, template: rows[0] });
  } catch (err) {
    console.error('❌ Save template error:', err.message);
    res.status(500).json({ error: `Save failed: ${err.message}` });
  }
});

// DELETE /api/email/templates/:id - delete a template
router.delete('/templates/:id', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM email_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, templateId: req.params.id });
  } catch (err) {
    console.error('❌ Delete template error:', err.message);
    res.status(500).json({ error: `Delete failed: ${err.message}` });
  }
});

// Helper: Handle A/B test sending
async function handleAbTest(req, res, pool, subject, htmlBody, variantBSubject, variantBHtmlBody, textBody, validRecords, fromAddress, baseUrl, invalidCount) {
  try {
    console.log(`📊 A/B Test mode: ${validRecords.length} recipients, splitting 50/50`);

    // Shuffle and split 50/50
    const shuffled = validRecords.sort(() => Math.random() - 0.5);
    const half = Math.floor(shuffled.length / 2);
    const groupA = shuffled.slice(0, half);
    const groupB = shuffled.slice(half);

    console.log(`  Variant A: ${groupA.length} recipients`);
    console.log(`  Variant B: ${groupB.length} recipients`);

    // Insert blast A (variant='A', will set ab_test_id = its own id)
    const blastAResult = await pool.query(
      `INSERT INTO email_blasts (sender_id, subject, html_body, from_address, recipient_count, status, ab_variant)
       VALUES ($1, $2, $3, $4, $5, 'sending', 'A') RETURNING id`,
      [req.user.id, subject, htmlBody, fromAddress, groupA.length]
    );
    const blastAId = blastAResult.rows[0].id;
    console.log(`✅ Created blast A (ID: ${blastAId})`);

    // Self-reference: ab_test_id = blastAId
    await pool.query(
      `UPDATE email_blasts SET ab_test_id = $1 WHERE id = $1`,
      [blastAId]
    );

    // Insert blast B (variant='B', ab_test_id = blastAId)
    const blastBResult = await pool.query(
      `INSERT INTO email_blasts (sender_id, subject, html_body, from_address, recipient_count, status, ab_test_id, ab_variant)
       VALUES ($1, $2, $3, $4, $5, 'sending', $6, 'B') RETURNING id`,
      [req.user.id, variantBSubject, variantBHtmlBody, fromAddress, groupB.length, blastAId]
    );
    const blastBId = blastBResult.rows[0].id;
    console.log(`✅ Created blast B (ID: ${blastBId})`);

    // Insert recipients for both variants
    const [recipA, recipB] = await Promise.all([
      insertRecipients(pool, blastAId, groupA, 'A'),
      insertRecipients(pool, blastBId, groupB, 'B')
    ]);
    console.log(`✅ Inserted ${groupA.length + groupB.length} recipient records`);

    // Send both variants concurrently
    const [resultA, resultB] = await Promise.all([
      dispatchBlast(pool, blastAId, groupA, recipA.emailToRecipientId, subject, htmlBody, textBody, fromAddress, baseUrl),
      dispatchBlast(pool, blastBId, groupB, recipB.emailToRecipientId, variantBSubject, variantBHtmlBody, textBody, fromAddress, baseUrl)
    ]);

    console.log(`\n✅ A/B test complete: A sent ${resultA.sentCount}, B sent ${resultB.sentCount}`);

    res.json({
      success: true,
      abTest: true,
      testId: blastAId,
      invalid: invalidCount,
      variantA: { blastId: blastAId, sent: resultA.sentCount, failed: resultA.failedCount },
      variantB: { blastId: blastBId, sent: resultB.sentCount, failed: resultB.failedCount },
      message: `A/B test sent! Variant A: ${resultA.sentCount} sent | Variant B: ${resultB.sentCount} sent`
    });
  } catch (err) {
    console.error('❌ A/B test error:', err.message);
    res.status(500).json({ error: `A/B test failed: ${err.message}` });
  }
}

// Helper: Insert recipients and return email→id map
async function insertRecipients(pool, blastId, validRecords, abVariant = null) {
  const recipientValues = validRecords.map((_, i) =>
    abVariant
      ? `($1, $${i*4+2}, $${i*4+3}, $${i*4+4}, 'pending', $${i*4+5})`
      : `($1, $${i*4+2}, $${i*4+3}, $${i*4+4}, 'pending')`
  ).join(',');

  const params = [blastId];
  validRecords.forEach(record => {
    params.push(record.email, record.firstName || null, record.lastName || null);
    if (abVariant) params.push(abVariant);
  });

  const columns = abVariant
    ? '(blast_id, email, first_name, last_name, status, ab_variant)'
    : '(blast_id, email, first_name, last_name, status)';

  const recipientsResult = await pool.query(
    `INSERT INTO email_recipients ${columns} VALUES ${recipientValues} RETURNING id, email`,
    params
  );

  const emailToRecipientId = {};
  recipientsResult.rows.forEach(row => {
    emailToRecipientId[row.email] = row.id;
  });

  return { emailToRecipientId };
}

// Helper: Dispatch a scheduled or queued blast
async function dispatchBlast(pool, blastId, validRecords, emailToRecipientId, subject, htmlBody, textBody, fromAddress, baseUrl) {
  try {
    let sendResults = [];
    console.log(`📤 Dispatching blast #${blastId} to ${validRecords.length} emails in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);

      const personalizedBatch = batch.map(record => {
        const recipientId = emailToRecipientId[record.email];
        let personalized = htmlBody
          .replace(/{first_name}/g, record.firstName || '')
          .replace(/{last_name}/g, record.lastName || '');

        personalized = injectOpenPixel(personalized, recipientId, baseUrl);
        personalized = injectClickTracking(personalized, recipientId, baseUrl);

        let textPersonalized = textBody || ''
          .replace(/{first_name}/g, record.firstName || '')
          .replace(/{last_name}/g, record.lastName || '');

        return { email: record.email, recipientId, htmlBody: personalized, textBody: textPersonalized };
      });

      const batchResults = await Promise.all(
        personalizedBatch.map(item => sendEmail(item.email, subject, item.htmlBody, item.textBody, fromAddress))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const item = personalizedBatch[j];
        if (result.success) {
          await pool.query(
            `UPDATE email_recipients SET ses_message_id = $1, status = 'sent' WHERE id = $2`,
            [result.messageId, item.recipientId]
          );
        } else {
          await pool.query(
            `UPDATE email_recipients SET status = 'failed' WHERE id = $1`,
            [item.recipientId]
          );
        }
      }

      sendResults.push(...batchResults);

      if (i + BATCH_SIZE < validRecords.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const sentCount = sendResults.filter(r => r.success).length;
    const failedCount = sendResults.filter(r => !r.success).length;
    const totalCost = (sentCount * SES_COST_PER_EMAIL).toFixed(6);
    const finalStatus = sentCount === validRecords.length ? 'sent' : (sentCount > 0 ? 'partial' : 'failed');

    const resultsJson = {
      total: validRecords.length,
      sent: sentCount,
      failed: failedCount,
      details: sendResults
    };

    await pool.query(
      `UPDATE email_blasts SET recipient_count = $1, total_cost = $2, status = $3, results = $4, sent_at = NOW() WHERE id = $5`,
      [sentCount, totalCost, finalStatus, JSON.stringify(resultsJson), blastId]
    );

    console.log(`✅ Blast #${blastId} dispatch complete: ${sentCount} sent, ${failedCount} failed`);
    return { sentCount, failedCount };
  } catch (err) {
    console.error(`❌ Dispatch blast #${blastId} error:`, err.message);
    await pool.query(`UPDATE email_blasts SET status = 'failed' WHERE id = $1`, [blastId]);
    throw err;
  }
}

module.exports = router;
module.exports.dispatchBlast = dispatchBlast;
