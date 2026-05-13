const express = require('express');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/sms/send
// Stub — AWS SNS integration to be added later
// Body: { message: string, phones: string[] }
router.post('/send', requireRole('admin', 'campaign_manager'), async (req, res) => {
  const { message, phones } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: 'phones must be a non-empty array' });
  }
  if (phones.length > 500) {
    return res.status(400).json({ error: 'Cannot send more than 500 messages per batch' });
  }

  // Stub response — simulates SNS send
  console.log(`[SMS STUB] Would send to ${phones.length} numbers: "${message.substring(0, 60)}..."`);

  res.json({
    success: true,
    stub: true,
    sent: phones.length,
    failed: 0,
    invalid: 0,
    message: 'SMS stub — AWS SNS not yet connected. Message logged to server.'
  });
});

module.exports = router;
