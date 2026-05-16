const express = require('express');
const path = require('path');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizeEmail, sendEmail } = require('../lib/sesClient');
const { uploadFile, getPresignedUrl } = require('../lib/s3Client');
const { enqueue } = require('../lib/sqsClient');
const { publishBlastQueued } = require('../lib/eventBridgeClient');
const campaignEvents = require('../lib/campaignEvents');
const { putMetric } = require('../lib/cloudwatchClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function parseRecipientsFromBuffer(buffer, mimetype, originalname) {
  let rows;
  if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
    rows = parse(buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });
  } else {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  }
  return rows.map(row => {
    const keys = Object.keys(row);
    const find = (...names) => {
      const k = keys.find(k => names.includes(k.toLowerCase()));
      return k ? String(row[k] || '').trim() : '';
    };
    return {
      email:      find('email', 'e-mail', 'email_address'),
      first_name: find('first_name', 'firstname', 'first name', 'first'),
      last_name:  find('last_name', 'lastname', 'last name', 'last'),
    };
  }).filter(r => r.email.includes('@'));
}

// Email template CRUD routes
router.get('/templates', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, subject, html_body, created_at FROM email_templates WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ templates: rows });
  } catch (err) {
    console.error('GET /templates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req, res) => {
  const { name, subject, html_body } = req.body;
  if (!name || !subject || !html_body) {
    return res.status(400).json({ error: 'name, subject, and html_body are required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO email_templates (user_id, name, subject, html_body, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, name, subject, html_body, created_at',
      [req.user.id, name, subject, html_body]
    );
    res.status(201).json({ template: rows[0] });
  } catch (err) {
    console.error('POST /templates error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM email_templates WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /templates/:id error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

router.post('/send', requireRole('admin', 'campaign_manager'), upload.single('file'), async (req, res) => {
  try {
    const { subject, htmlBody, fromAddress, recipientEmails, scheduledAt, fromName, replyTo, plainTextBody, queryString, webLanguage } = req.body;
    const user_id = req.user.id;

    // Validate: need subject, from address, and at least one body (HTML or plain text)
    if (!subject || !fromAddress || (!htmlBody && !plainTextBody)) {
      return res.status(400).json({ error: 'Missing required fields: subject, from address, and message body' });
    }

    if (!req.file && !recipientEmails) {
      return res.status(400).json({ error: 'Upload a CSV file or provide email addresses' });
    }

    // Parse scheduled send time
    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduled = parsedScheduledAt && parsedScheduledAt > new Date();

    let recipients = [];
    if (req.file) {
      recipients = parseRecipientsFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (recipientEmails) {
      try {
        recipients = JSON.parse(recipientEmails).map(e => ({
          email: String(e).trim(),
          first_name: '',
          last_name: ''
        })).filter(r => r.email.includes('@'));
      } catch (err) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No valid emails found' });
    }

    // Create blast record
    // Use htmlBody if provided, otherwise use plainTextBody for html_body column
    const finalHtmlBody = htmlBody || plainTextBody;
    const now = new Date().toISOString();
    const blastResult = await pool.query(
      'INSERT INTO email_blasts (sender_id, subject, html_body, from_address, from_name, reply_to, plain_text_body, query_string, web_language, recipient_count, status, scheduled_at, created_at, sent_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id',
      [user_id, subject, finalHtmlBody, fromAddress, fromName || null, replyTo || null, plainTextBody || null, queryString || null, webLanguage || 'en', recipients.length, isScheduled ? 'scheduled' : 'queued', isScheduled ? parsedScheduledAt : null, now, null]
    );
    const blastId = blastResult.rows[0].id;

    // Insert recipients in 1000-row chunks to avoid hitting Postgres parameter limit (65535)
    const INSERT_CHUNK = 1000;
    for (let i = 0; i < recipients.length; i += INSERT_CHUNK) {
      const chunk = recipients.slice(i, i + INSERT_CHUNK);
      await pool.query(
        `INSERT INTO email_recipients (blast_id, email, first_name, last_name, status)
         SELECT $1, UNNEST($2::text[]), UNNEST($3::text[]), UNNEST($4::text[]), 'pending'`,
        [blastId, chunk.map(r => r.email), chunk.map(r => r.first_name), chunk.map(r => r.last_name)]
      );
    }

    // Archive uploaded file to S3 (if file was provided)
    if (req.file) {
      try {
        const fileKey = `email-uploads/${Date.now()}-${req.file.originalname}`;
        await uploadFile(fileKey, req.file.buffer, req.file.mimetype);
        console.log(`✅ Archived email CSV to S3: ${fileKey}`);
      } catch (err) {
        console.warn(`⚠️ Failed to archive file to S3: ${err.message}`);
      }
    }

    // If scheduled, skip enqueue and respond with scheduled status
    if (isScheduled) {
      res.json({
        success: true,
        blastId,
        scheduled: true,
        scheduledAt: parsedScheduledAt.toISOString(),
        recipientCount: recipients.length
      });
      return;
    }

    // Enqueue blast in 500-recipient chunks for parallel processing
    try {
      const SQS_CHUNK = 500;
      const chunkCount = Math.ceil(recipients.length / SQS_CHUNK);
      for (let offset = 0; offset < recipients.length; offset += SQS_CHUNK) {
        await enqueue({ type: 'email_blast_chunk', blastId, offset, limit: SQS_CHUNK });
      }
      console.log(`✅ Queued email blast ${blastId} (${recipients.length} recipients, ${chunkCount} chunks)`);

      // Publish blast.queued event (async, non-blocking)
      try {
        await publishBlastQueued(blastId, 'email', recipients.length);
      } catch (err) {
        console.warn('⚠️ Failed to publish blast.queued event:', err.message);
      }

      await putMetric('BlastSent', 1);

      res.json({
        success: true,
        blastId,
        scheduled: false,
        recipientCount: recipients.length
      });
    } catch (err) {
      // If SQS enqueue fails, fall back to synchronous sending
      console.warn(`⚠️ SQS enqueue failed, falling back to synchronous send: ${err.message}`);
      const results = [];
      const BATCH_SIZE = 10;
      const BATCH_DELAY_MS = 100;
      const baseUrl = process.env.APP_BASE_URL || 'https://heidi.cushingtrans.com';

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(r => {
            const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(r.email)}&blastId=${blastId}`;
            return sendEmail(r.email, subject, finalHtmlBody, plainTextBody || '', fromAddress, unsubscribeUrl);
          })
        );
        results.push(...batchResults);

        if (i + BATCH_SIZE < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      const successCount = results.filter(r => r.success).length;
      await pool.query(
        'UPDATE email_blasts SET results = $1, status = $2 WHERE id = $3',
        [JSON.stringify(results), 'sent', blastId]
      );

      res.json({
        success: true,
        blastId,
        scheduled: false,
        recipientCount: recipients.length,
        fallback: true
      });
    }
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      'SELECT id, subject, recipient_count, status, created_at FROM email_blasts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/blasts', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.id, b.subject, b.from_address, b.from_name, b.recipient_count, b.status,
        b.created_at, b.sent_at,
        COUNT(CASE WHEN r.opened_at IS NOT NULL THEN 1 END)      AS opened_count,
        COUNT(CASE WHEN r.clicked_at IS NOT NULL THEN 1 END)     AS clicked_count,
        COUNT(CASE WHEN r.bounced_at IS NOT NULL THEN 1 END)     AS bounced_count,
        COUNT(CASE WHEN r.complained_at IS NOT NULL THEN 1 END)  AS complained_count,
        COUNT(CASE WHEN r.unsubscribed_at IS NOT NULL THEN 1 END) AS unsubscribed_count,
        COUNT(CASE WHEN r.delivered_at IS NOT NULL THEN 1 END)   AS delivered_count
      FROM email_blasts b
      LEFT JOIN email_recipients r ON r.blast_id = b.id
      GROUP BY b.id, b.subject, b.from_address, b.from_name, b.recipient_count, b.status, b.created_at, b.sent_at
      ORDER BY b.created_at DESC
      LIMIT 100
    `);
    console.log('📧 First blast data:', rows[0]);
    res.json({ blasts: rows });
  } catch (err) {
    console.error('Error fetching blasts:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/blasts/:id/bounces', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT email, bounce_type, bounce_subtype, bounce_diagnostic_code, bounced_at
      FROM email_recipients
      WHERE blast_id = $1 AND bounced_at IS NOT NULL
      ORDER BY bounced_at DESC
    `, [req.params.id]);
    res.json({ bounces: rows });
  } catch (err) {
    console.error('Error fetching bounce details:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/overview', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    console.log('📊 /stats/overview endpoint called');
    // Get all blasts with their metrics
    const { rows: blasts } = await pool.query(`
      SELECT
        b.id, b.recipient_count,
        COUNT(CASE WHEN r.delivered_at IS NOT NULL THEN 1 END) AS delivered_count,
        COUNT(CASE WHEN r.opened_at IS NOT NULL THEN 1 END) AS opened_count,
        COUNT(CASE WHEN r.clicked_at IS NOT NULL THEN 1 END) AS clicked_count,
        COUNT(CASE WHEN r.bounced_at IS NOT NULL THEN 1 END) AS bounced_count,
        COUNT(CASE WHEN r.complained_at IS NOT NULL THEN 1 END) AS complained_count,
        COUNT(CASE WHEN r.unsubscribed_at IS NOT NULL THEN 1 END) AS unsubscribed_count
      FROM email_blasts b
      LEFT JOIN email_recipients r ON r.blast_id = b.id
      GROUP BY b.id
    `);

    let totalCampaigns = blasts ? blasts.length : 0;
    let totalRecipients = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;
    let totalComplained = 0;
    let totalUnsubscribed = 0;

    if (blasts && Array.isArray(blasts)) {
      blasts.forEach(b => {
        const recCount = parseInt(b.recipient_count) || 0;
        totalRecipients += recCount;
        totalDelivered += parseInt(b.delivered_count) || 0;
        totalOpened += parseInt(b.opened_count) || 0;
        totalClicked += parseInt(b.clicked_count) || 0;
        totalBounced += parseInt(b.bounced_count) || 0;
        totalComplained += parseInt(b.complained_count) || 0;
        totalUnsubscribed += parseInt(b.unsubscribed_count) || 0;
      });
    }

    const totalSent = totalRecipients;
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0';
    const complaintRate = totalSent > 0 ? ((totalComplained / totalSent) * 100).toFixed(1) : '0';
    const unsubscribeRate = totalSent > 0 ? ((totalUnsubscribed / totalSent) * 100).toFixed(1) : '0';

    res.json({
      totalCampaigns,
      totalRecipients,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalComplained,
      totalUnsubscribed,
      deliveryRate,
      openRate,
      clickRate,
      bounceRate,
      complaintRate,
      unsubscribeRate
    });
  } catch (err) {
    console.error('Error fetching stats overview:', err);
    res.status(500).json({ error: 'Failed to load stats: ' + err.message });
  }
});

router.get('/stream', requireRole('admin', 'campaign_manager'), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const eventHandler = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const handlers = {
    'blast.progress': eventHandler,
    'blast.complete': eventHandler,
    'blast.error': eventHandler,
    'blast.started': eventHandler
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    campaignEvents.on(event, handler);
  });

  res.on('close', () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      campaignEvents.removeListener(event, handler);
    });
    res.end();
  });

  res.write(`:heartbeat\n\n`);
});

// Public unsubscribe endpoint (no auth required, handles GET + POST)
router.get('/unsubscribe', async (req, res) => {
  try {
    const { email, blastId } = req.query;
    if (!email) {
      return res.sendFile(path.join(__dirname, '../public/unsubscribe-error.html'));
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.sendFile(path.join(__dirname, '../public/unsubscribe-error.html'));
    }

    // Mark recipient as unsubscribed (if specific blast)
    if (blastId) {
      await pool.query(
        'UPDATE email_recipients SET status = $1, unsubscribed_at = NOW() WHERE email = $2 AND blast_id = $3',
        ['unsubscribed', normalizedEmail, blastId]
      );
    } else {
      // Mark all occurrences of this email as unsubscribed
      await pool.query(
        'UPDATE email_recipients SET status = $1, unsubscribed_at = NOW() WHERE email = $2',
        ['unsubscribed', normalizedEmail]
      );
    }

    // Also mark in email_subscribers
    await pool.query(
      'UPDATE email_subscribers SET status = $1 WHERE email = $2',
      ['unsubscribed', normalizedEmail]
    );

    res.sendFile(path.join(__dirname, '../public/unsubscribe-success.html'));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.sendFile(path.join(__dirname, '../public/unsubscribe-error.html'));
  }
});

router.post('/unsubscribe', async (req, res) => {
  try {
    const { email, blastId, listId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (blastId) {
      await pool.query(
        'UPDATE email_recipients SET status = $1, unsubscribed_at = NOW() WHERE email = $2 AND blast_id = $3',
        ['unsubscribed', normalizedEmail, blastId]
      );
    } else {
      await pool.query(
        'UPDATE email_recipients SET status = $1, unsubscribed_at = NOW() WHERE email = $2',
        ['unsubscribed', normalizedEmail]
      );
    }

    if (listId) {
      await pool.query(
        'UPDATE email_subscribers SET status = $1 WHERE email = $2 AND list_id = $3',
        ['unsubscribed', normalizedEmail, listId]
      );
    } else {
      await pool.query(
        'UPDATE email_subscribers SET status = $1 WHERE email = $2',
        ['unsubscribed', normalizedEmail]
      );
    }

    res.json({ success: true, message: 'You have been unsubscribed from future emails.' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to process unsubscribe request' });
  }
});

module.exports = router;
