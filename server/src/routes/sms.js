const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizePhone, sendSMS } = require('../lib/snsClient');
const { enqueue } = require('../lib/sqsClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/send', requireRole('admin', 'campaign_manager'), upload.single('phoneFile'), async (req, res) => {
  try {
    const { message, recipientPhones } = req.body;
    const user_id = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let phones = [];

    // Parse phones from JSON array
    if (recipientPhones) {
      try {
        const parsed = typeof recipientPhones === 'string' ? JSON.parse(recipientPhones) : recipientPhones;
        phones = Array.isArray(parsed) ? parsed : [];
      } catch (_) {}
    }

    // Parse phones from file upload
    if (req.file) {
      let rows;
      if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
        rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
      } else {
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      }
      const keys = rows.length ? Object.keys(rows[0]) : [];
      const phoneKey = keys.find(k => k.toLowerCase() === 'phone') || keys.find(k => k.toLowerCase().includes('phone'));
      if (phoneKey) {
        phones = phones.concat(rows.map(r => String(r[phoneKey] || '').trim()).filter(Boolean));
      }
    }

    // Normalize and deduplicate
    phones = [...new Set(phones.map(p => normalizePhone(p)).filter(Boolean))];

    if (phones.length === 0) {
      return res.status(400).json({ error: 'No valid phone numbers found' });
    }

    // Calculate cost: $0.0075 per SMS (standard US rate)
    const totalCost = phones.length * 0.0075;
    const parts = Math.ceil(message.length / 160); // SMS part count

    // Create blast record
    const blastResult = await pool.query(
      'INSERT INTO sms_blasts (sender_id, message, recipient_count, parts_per_message, total_cost, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [user_id, message, phones.length, parts, totalCost, 'queued']
    );
    const blastId = blastResult.rows[0].id;

    // Enqueue blast for async processing
    try {
      await enqueue({ type: 'sms_blast', blastId });
      console.log(`✅ Queued SMS blast ${blastId} (${phones.length} recipients)`);
      res.json({
        success: true,
        blastId,
        status: 'queued',
        message: `SMS blast queued for delivery to ${phones.length} recipients`,
        totalCost
      });
    } catch (err) {
      // If SQS enqueue fails, fall back to synchronous sending
      console.warn(`⚠️ SQS enqueue failed, falling back to synchronous send: ${err.message}`);
      const results = [];
      const BATCH_SIZE = 10;
      const BATCH_DELAY_MS = 100;

      for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const batch = phones.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(phone => sendSMS(phone, message))
        );
        results.push(...batchResults);

        if (i + BATCH_SIZE < phones.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      const successCount = results.filter(r => r.success).length;
      await pool.query(
        'UPDATE sms_blasts SET results = $1, status = $2 WHERE id = $3',
        [JSON.stringify(results), 'sent', blastId]
      );

      res.json({
        success: true,
        blastId,
        totalPhones: phones.length,
        successCount,
        failureCount: phones.length - successCount,
        totalCost,
        results,
        fallback: true
      });
    }
  } catch (err) {
    console.error('SMS send error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      'SELECT id, message, recipient_count, total_cost, status, created_at FROM sms_blasts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/overview', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sms_blasts ORDER BY created_at DESC LIMIT 100');
    const blasts = result.rows;
    const totalCampaigns = blasts.length;
    const totalSent = blasts.reduce((s, b) => s + (parseInt(b.recipient_count) || 0), 0);
    const totalCost = blasts.reduce((s, b) => s + parseFloat(b.total_cost || 0), 0);
    const sentCount = blasts.filter(b => b.status === 'sent').length;
    const queuedCount = blasts.filter(b => b.status === 'queued').length;
    res.json({ totalCampaigns, totalSent, totalCost: totalCost.toFixed(2), sentCount, queuedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
