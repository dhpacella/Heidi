const { Pool } = require('pg');
const { sendEmail } = require('../src/lib/sesClient');
const { sendSMS } = require('../src/lib/snsClient');
const { getSecret } = require('../src/lib/secretsClient');
const { publishBlastComplete } = require('../src/lib/eventBridgeClient');

let pgPool;

async function initPool() {
  if (pgPool) return;
  const secret = await getSecret('heidi-voter-dashboard/db');
  const connectionString = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.database}?sslmode=require`;
  pgPool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

async function processEmailBlast(blastId) {
  try {
    console.log(`📧 Processing email blast ${blastId}...`);

    const blastRes = await pgPool.query(
      'SELECT id, subject, html_body, from_address FROM email_blasts WHERE id = $1',
      [blastId]
    );

    if (!blastRes.rows.length) {
      console.error(`❌ Blast ${blastId} not found`);
      return;
    }

    const blast = blastRes.rows[0];
    const recipientRes = await pgPool.query(
      'SELECT email FROM email_recipients WHERE blast_id = $1',
      [blastId]
    );

    const emails = recipientRes.rows.map(r => r.email);
    console.log(`📧 Sending ${emails.length} emails from blast ${blastId}...`);

    const results = [];
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 100;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(email =>
          sendEmail(email, blast.subject, blast.html_body, '', blast.from_address)
        )
      );
      results.push(...batchResults);

      if (i + BATCH_SIZE < emails.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const successCount = results.filter(r => r.success).length;
    await pgPool.query(
      'UPDATE email_blasts SET status = $1, results = $2 WHERE id = $3',
      ['sent', JSON.stringify(results), blastId]
    );

    await publishBlastComplete(blastId, 'email', successCount, emails.length - successCount);
    console.log(`✅ Blast ${blastId} sent: ${successCount}/${emails.length} succeeded`);
  } catch (err) {
    console.error(`❌ Failed to process email blast ${blastId}:`, err.message);
    await pgPool.query(
      'UPDATE email_blasts SET status = $1 WHERE id = $2',
      ['failed', blastId]
    );
  }
}

async function processSmsBlast(blastId) {
  try {
    console.log(`📱 Processing SMS blast ${blastId}...`);

    const blastRes = await pgPool.query(
      'SELECT id, message FROM sms_blasts WHERE id = $1',
      [blastId]
    );

    if (!blastRes.rows.length) {
      console.error(`❌ SMS blast ${blastId} not found`);
      return;
    }

    const blast = blastRes.rows[0];
    const recipientRes = await pgPool.query(
      'SELECT phone FROM sms_recipients WHERE blast_id = $1',
      [blastId]
    );

    const phones = recipientRes.rows.map(r => r.phone);
    console.log(`📱 Sending ${phones.length} SMS from blast ${blastId}...`);

    const results = [];
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 100;

    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const batch = phones.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(phone => sendSMS(phone, blast.message))
      );
      results.push(...batchResults);

      if (i + BATCH_SIZE < phones.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const successCount = results.filter(r => r.success).length;
    await pgPool.query(
      'UPDATE sms_blasts SET status = $1, results = $2 WHERE id = $3',
      ['sent', JSON.stringify(results), blastId]
    );

    await publishBlastComplete(blastId, 'sms', successCount, phones.length - successCount);
    console.log(`✅ SMS blast ${blastId} sent: ${successCount}/${phones.length} succeeded`);
  } catch (err) {
    console.error(`❌ Failed to process SMS blast ${blastId}:`, err.message);
    await pgPool.query(
      'UPDATE sms_blasts SET status = $1 WHERE id = $2',
      ['failed', blastId]
    );
  }
}

async function handler(event) {
  console.log('🔄 Processing SQS blast messages...');

  try {
    await initPool();

    for (const record of event.Records) {
      const payload = JSON.parse(record.body);
      if (payload.type === 'email_blast') {
        await processEmailBlast(payload.blastId);
      } else if (payload.type === 'sms_blast') {
        await processSmsBlast(payload.blastId);
      }
    }

    return { statusCode: 200, body: 'Blasts processed' };
  } catch (err) {
    console.error('❌ Error processing blasts:', err.message);
    throw err;
  } finally {
    if (pgPool) await pgPool.end();
  }
}

module.exports = { handler };
