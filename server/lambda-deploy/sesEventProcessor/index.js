const { Pool } = require('pg');
const { getSecret } = require('../src/lib/secretsClient');

let pgPool;

async function initPool() {
  if (pgPool) return;
  const secret = await getSecret('heidi-voter-dashboard/db');
  const connectionString = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.database}?sslmode=require`;
  pgPool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

async function handler(event) {
  console.log('📬 Processing SES events from SNS...');

  try {
    await initPool();

    for (const record of event.Records) {
      const message = JSON.parse(record.Sns.Message);
      const eventType = message.eventType;

      if (eventType === 'Bounce') {
        await processBounce(message);
      } else if (eventType === 'Complaint') {
        await processComplaint(message);
      } else if (eventType === 'Delivery') {
        await processDelivery(message);
      } else if (eventType === 'Send') {
        await processSend(message);
      }
    }

    return { statusCode: 200, body: 'SES events processed' };
  } catch (err) {
    console.error('❌ Error processing SES events:', err.message);
    throw err;
  } finally {
    if (pgPool) await pgPool.end();
  }
}

async function processBounce(message) {
  const { bounce } = message;
  const bounceType = bounce.bounceType; // Permanent or Transient

  for (const recipient of bounce.bouncedRecipients) {
    const email = recipient.emailAddress;
    const status = bounceType === 'Permanent' ? 'bounced' : 'transient_bounce';

    await pgPool.query(
      `UPDATE email_recipients SET status = $1, bounced_at = NOW() WHERE email = $2`,
      [status, email]
    );

    if (bounceType === 'Permanent') {
      await pgPool.query(
        `UPDATE email_subscribers SET unsubscribed = true, unsubscribed_at = NOW() WHERE email = $1`,
        [email]
      );
      console.log(`🚫 Permanently bounced: ${email}`);
    }
  }
}

async function processComplaint(message) {
  const { complaint } = message;

  for (const recipient of complaint.complainedRecipients) {
    const email = recipient.emailAddress;

    await pgPool.query(
      `UPDATE email_recipients SET status = $1, complained_at = NOW() WHERE email = $2`,
      ['complained', email]
    );

    await pgPool.query(
      `UPDATE email_subscribers SET unsubscribed = true, unsubscribed_at = NOW(), unsubscribe_reason = $1 WHERE email = $2`,
      ['spam_complaint', email]
    );

    console.log(`📣 Complaint received: ${email}`);
  }
}

async function processDelivery(message) {
  const { delivery } = message;

  for (const recipient of delivery.recipients) {
    const email = recipient;

    await pgPool.query(
      `UPDATE email_recipients SET status = $1, delivered_at = NOW() WHERE email = $2`,
      ['delivered', email]
    );
  }

  console.log(`📬 Delivered to ${delivery.recipients.length} recipients`);
}

async function processSend(message) {
  const { mail } = message;
  const sender = mail.source;

  for (const recipient of mail.destination) {
    const email = recipient;

    await pgPool.query(
      `INSERT INTO email_recipients (email, status, sent_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET status = $2, sent_at = NOW()`,
      [email, 'sent']
    );
  }

  console.log(`✉️ Sent from ${sender} to ${mail.destination.length} recipients`);
}

module.exports = { handler };
