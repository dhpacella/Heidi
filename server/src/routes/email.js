const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizeEmail, sendEmail } = require('../lib/sesClient');
const { uploadFile, getPresignedUrl } = require('../lib/s3Client');
const { enqueue } = require('../lib/sqsClient');
const { publishBlastQueued } = require('../lib/eventBridgeClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/send', requireRole('admin', 'campaign_manager'), upload.single('file'), async (req, res) => {
  try {
    const { subject, htmlBody, fromAddress, recipientEmails } = req.body;
    const user_id = req.user.id;

    if (!subject || !htmlBody || !fromAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let emails = [];
    if (req.file) {
      // Parse CSV or Excel
      const fileExt = req.file.originalname.split('.').pop().toLowerCase();
      if (fileExt === 'csv') {
        const text = req.file.buffer.toString('utf-8');
        const records = parse(text, { columns: true });
        emails = records.map(r => r.email || r.Email || r.EMAIL).filter(e => normalizeEmail(e));
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        const workbook = XLSX.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const records = XLSX.utils.sheet_to_json(sheet);
        emails = records.map(r => r.email || r.Email || r.EMAIL).filter(e => normalizeEmail(e));
      }
    } else if (recipientEmails) {
      emails = JSON.parse(recipientEmails).filter(e => normalizeEmail(e));
    }

    if (emails.length === 0) {
      return res.status(400).json({ error: 'No valid emails found' });
    }

    // Create blast record
    const blastResult = await pool.query(
      'INSERT INTO email_blasts (sender_id, subject, html_body, from_address, recipient_count, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [user_id, subject, htmlBody, fromAddress, emails.length, 'queued']
    );
    const blastId = blastResult.rows[0].id;

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

    // Enqueue blast for async processing
    try {
      await enqueue({ type: 'email_blast', blastId });
      console.log(`✅ Queued email blast ${blastId} (${emails.length} recipients)`);

      // Publish blast.queued event (async, non-blocking)
      try {
        await publishBlastQueued(blastId, 'email', emails.length);
      } catch (err) {
        console.warn('⚠️ Failed to publish blast.queued event:', err.message);
      }

      res.json({
        success: true,
        blastId,
        status: 'queued',
        message: `Email blast queued for delivery to ${emails.length} recipients`
      });
    } catch (err) {
      // If SQS enqueue fails, fall back to synchronous sending
      console.warn(`⚠️ SQS enqueue failed, falling back to synchronous send: ${err.message}`);
      const results = [];
      const BATCH_SIZE = 10;
      const BATCH_DELAY_MS = 100;

      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(email => sendEmail(email, subject, htmlBody, '', fromAddress))
        );
        results.push(...batchResults);

        if (i + BATCH_SIZE < emails.length) {
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
        totalEmails: emails.length,
        successCount,
        failureCount: emails.length - successCount,
        results,
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
        b.id, b.subject, b.from_address, b.recipient_count, b.status,
        b.created_at, b.sent_at,
        COUNT(CASE WHEN r.opened_at IS NOT NULL THEN 1 END)      AS opened_count,
        COUNT(CASE WHEN r.clicked_at IS NOT NULL THEN 1 END)     AS clicked_count,
        COUNT(CASE WHEN r.bounced_at IS NOT NULL THEN 1 END)     AS bounced_count,
        COUNT(CASE WHEN r.complained_at IS NOT NULL THEN 1 END)  AS complained_count,
        COUNT(CASE WHEN r.unsubscribed_at IS NOT NULL THEN 1 END) AS unsubscribed_count,
        COUNT(CASE WHEN r.delivered_at IS NOT NULL THEN 1 END)   AS delivered_count
      FROM email_blasts b
      LEFT JOIN email_recipients r ON r.blast_id = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);
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
      GROUP BY b.id, b.recipient_count
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

module.exports = router;
