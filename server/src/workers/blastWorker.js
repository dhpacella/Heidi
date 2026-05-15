const pool = require('../db/connection');
const { sendEmail } = require('../lib/sesClient');
const { sendSMS } = require('../lib/snsClient');
const { dequeue, deleteMessage } = require('../lib/sqsClient');
const { publishBlastComplete } = require('../lib/eventBridgeClient');

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

async function processEmailBlast(blastId) {
  try {
    console.log(`📧 Processing email blast ${blastId}...`);

    // Fetch blast and recipients from database
    const blastRes = await pool.query(
      'SELECT id, subject, html_body, from_address FROM email_blasts WHERE id = $1',
      [blastId]
    );

    if (!blastRes.rows.length) {
      console.error(`❌ Blast ${blastId} not found`);
      return;
    }

    const blast = blastRes.rows[0];

    // Fetch email recipients
    const recipientRes = await pool.query(
      'SELECT email FROM email_recipients WHERE blast_id = $1',
      [blastId]
    );

    const emails = recipientRes.rows.map(r => r.email);
    console.log(`📧 Sending ${emails.length} emails from blast ${blastId}...`);

    // Send in batches
    const results = [];
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

    // Update blast status
    const successCount = results.filter(r => r.success).length;
    const failureCount = emails.length - successCount;
    await pool.query(
      'UPDATE email_blasts SET status = $1, results = $2 WHERE id = $3',
      ['sent', JSON.stringify(results), blastId]
    );

    console.log(`✅ Blast ${blastId} sent: ${successCount}/${emails.length} succeeded`);

    // Publish blast.complete event (async, non-blocking)
    try {
      await publishBlastComplete(blastId, 'email', successCount, failureCount);
    } catch (err) {
      console.warn('⚠️ Failed to publish blast.complete event:', err.message);
    }
  } catch (err) {
    console.error(`❌ Failed to process email blast ${blastId}:`, err.message);
    await pool.query(
      'UPDATE email_blasts SET status = $1 WHERE id = $2',
      ['failed', blastId]
    );
  }
}

async function processSmsBlast(blastId) {
  try {
    console.log(`📱 Processing SMS blast ${blastId}...`);

    // Fetch blast and recipients
    const blastRes = await pool.query(
      'SELECT id, message FROM sms_blasts WHERE id = $1',
      [blastId]
    );

    if (!blastRes.rows.length) {
      console.error(`❌ SMS blast ${blastId} not found`);
      return;
    }

    const blast = blastRes.rows[0];

    // Fetch phone recipients
    const recipientRes = await pool.query(
      'SELECT phone FROM sms_recipients WHERE blast_id = $1',
      [blastId]
    );

    const phones = recipientRes.rows.map(r => r.phone);
    console.log(`📱 Sending ${phones.length} SMS from blast ${blastId}...`);

    // Send in batches
    const results = [];
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

    // Update blast status
    const successCount = results.filter(r => r.success).length;
    const failureCount = phones.length - successCount;
    await pool.query(
      'UPDATE sms_blasts SET status = $1, results = $2 WHERE id = $3',
      ['sent', JSON.stringify(results), blastId]
    );

    console.log(`✅ SMS blast ${blastId} sent: ${successCount}/${phones.length} succeeded`);

    // Publish blast.complete event (async, non-blocking)
    try {
      await publishBlastComplete(blastId, 'sms', successCount, failureCount);
    } catch (err) {
      console.warn('⚠️ Failed to publish blast.complete event:', err.message);
    }
  } catch (err) {
    console.error(`❌ Failed to process SMS blast ${blastId}:`, err.message);
    await pool.query(
      'UPDATE sms_blasts SET status = $1 WHERE id = $2',
      ['failed', blastId]
    );
  }
}

async function startBlastWorker() {
  console.log('🔄 Starting blast worker...');

  const pollInterval = setInterval(async () => {
    try {
      const messages = await dequeue(1);
      if (!messages.length) return;

      const message = messages[0];
      const payload = JSON.parse(message.Body);

      try {
        if (payload.type === 'email_blast') {
          await processEmailBlast(payload.blastId);
        } else if (payload.type === 'sms_blast') {
          await processSmsBlast(payload.blastId);
        }
      } finally {
        // Always delete the message even if processing failed
        await deleteMessage(message.ReceiptHandle);
      }
    } catch (err) {
      if (err.message.includes('SQS_QUEUE_URL not configured')) {
        // Blast worker not configured, silently exit
        clearInterval(pollInterval);
        console.log('ℹ️ Blast worker disabled (SQS not configured)');
        return;
      }
      console.error('❌ Blast worker error:', err.message);
    }
  }, 5000);

  console.log('✅ Blast worker started (polling every 5s)');
}

module.exports = { startBlastWorker, processEmailBlast, processSmsBlast };
