const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizeEmail, sendEmail } = require('../lib/sesClient');

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
      [user_id, subject, htmlBody, fromAddress, emails.length, 'sent']
    );
    const blastId = blastResult.rows[0].id;

    // Send emails in batches
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

    // Save results to database
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
    });
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

module.exports = router;
