// Unauthenticated email tracking endpoints (open pixel, click redirect, unsubscribe)
// Mounted BEFORE requireApiAuth in app.js so email clients can access without a session

const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { putEmailEvent } = require('../lib/dynamoClient');
const { publishEmailEvent } = require('../lib/kinesisClient');

// GET /api/email/track/open/:recipientId - record open event
router.get('/open/:recipientId', async (req, res) => {
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' }).send(gif);

  // Update asynchronously
  pool.query(
    `UPDATE email_recipients SET opened_at = NOW(),
     status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END
     WHERE id = $1 AND opened_at IS NULL`,
    [req.params.recipientId]
  ).then(() => {
    // Also fetch recipient info for DynamoDB/Kinesis
    pool.query(
      'SELECT blast_id, email FROM email_recipients WHERE id = $1',
      [req.params.recipientId]
    ).then(res => {
      if (res.rows.length) {
        const { blast_id, email } = res.rows[0];
        const timestamp = new Date().toISOString();

        // Write to DynamoDB
        putEmailEvent(blast_id, `${timestamp}#${email}`, email, 'open')
          .catch(err => console.warn('⚠️ Failed to write open event to DynamoDB:', err.message));

        // Publish to Kinesis
        publishEmailEvent('open', blast_id, email)
          .catch(err => console.warn('⚠️ Failed to publish open event to Kinesis:', err.message));
      }
    }).catch(err => console.error('Error fetching recipient info:', err));
  }).catch(err => console.error('Error recording open:', err));
});

// GET /api/email/track/click/:recipientId - record click and redirect
router.get('/click/:recipientId', async (req, res) => {
  const url = Buffer.from(req.query.url || '', 'base64url').toString();
  if (!url.startsWith('http')) {
    return res.status(400).send('Invalid URL');
  }

  res.redirect(url);

  // Update asynchronously
  pool.query(
    'UPDATE email_recipients SET clicked_at = NOW() WHERE id = $1 AND clicked_at IS NULL',
    [req.params.recipientId]
  ).then(() => {
    // Also fetch recipient info for DynamoDB/Kinesis
    pool.query(
      'SELECT blast_id, email FROM email_recipients WHERE id = $1',
      [req.params.recipientId]
    ).then(res => {
      if (res.rows.length) {
        const { blast_id, email } = res.rows[0];
        const timestamp = new Date().toISOString();

        // Write to DynamoDB
        putEmailEvent(blast_id, `${timestamp}#${email}`, email, 'click', { url })
          .catch(err => console.warn('⚠️ Failed to write click event to DynamoDB:', err.message));

        // Publish to Kinesis
        publishEmailEvent('click', blast_id, email, { url })
          .catch(err => console.warn('⚠️ Failed to publish click event to Kinesis:', err.message));
      }
    }).catch(err => console.error('Error fetching recipient info:', err));
  }).catch(err => console.error('Error recording click:', err));
});

// GET /api/email/track/unsubscribe/:recipientId - unsubscribe and confirm
router.get('/unsubscribe/:recipientId', async (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 60px 20px; }
    h2 { color: #333; margin: 0 0 12px; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <h2>You've been unsubscribed</h2>
  <p>You won't receive further emails from this campaign.</p>
</body>
</html>`);

  // Mark as unsubscribed asynchronously
  pool.query(
    `UPDATE email_recipients SET unsubscribed_at = NOW(), status = 'unsubscribed'
     WHERE id = $1 AND unsubscribed_at IS NULL`,
    [req.params.recipientId]
  ).then(() => {
    // Fetch recipient info for DynamoDB/Kinesis
    pool.query(
      'SELECT blast_id, email FROM email_recipients WHERE id = $1',
      [req.params.recipientId]
    ).then(res => {
      if (res.rows.length) {
        const { blast_id, email } = res.rows[0];
        const timestamp = new Date().toISOString();

        // Write to DynamoDB
        putEmailEvent(blast_id, `${timestamp}#${email}`, email, 'unsubscribe')
          .catch(err => console.warn('⚠️ Failed to write unsubscribe event to DynamoDB:', err.message));

        // Publish to Kinesis
        publishEmailEvent('unsubscribe', blast_id, email)
          .catch(err => console.warn('⚠️ Failed to publish unsubscribe event to Kinesis:', err.message));
      }
    }).catch(err => console.error('Error fetching recipient info:', err));

    // Also mark subscriber as unsubscribed if in a list
    pool.query(
      `UPDATE email_subscribers es
       SET status = 'unsubscribed'
       FROM email_recipients er
       WHERE er.id = $1 AND er.email = es.email`,
      [req.params.recipientId]
    ).catch(err => console.error('Error updating subscriber status:', err));
  }).catch(err => console.error('Error recording unsubscribe:', err));
});

module.exports = router;
