const pool = require('../db/connection');
const { sendEmail } = require('../lib/sesClient');
const { sendSMS } = require('../lib/snsClient');
const { dequeue, deleteMessage } = require('../lib/sqsClient');
const { publishBlastComplete } = require('../lib/eventBridgeClient');
const campaignEvents = require('../lib/campaignEvents');

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100;

function personalizeBody(htmlBody, recipient) {
  return htmlBody
    .replace(/\{first_name\}/gi, recipient.first_name || '')
    .replace(/\{last_name\}/gi,  recipient.last_name  || '')
    .replace(/\{email\}/gi,      recipient.email       || '');
}

async function processEmailBlast(blastId, offset = 0, limit = null) {
  try {
    // Log chunk info if paginated
    const chunkInfo = limit ? ` (chunk: offset=${offset}, limit=${limit})` : '';
    console.log(`📧 Processing email blast ${blastId}${chunkInfo}...`);

    // Fetch blast and recipients from database
    const blastRes = await pool.query(
      'SELECT id, subject, html_body, plain_text_body, from_address FROM email_blasts WHERE id = $1',
      [blastId]
    );

    if (!blastRes.rows.length) {
      console.error(`❌ Blast ${blastId} not found`);
      return;
    }

    const blast = blastRes.rows[0];

    // Fetch email recipients with personalization data
    // If limit is provided, use paginated query; otherwise fetch all pending recipients
    let recipientRes;
    if (limit !== null) {
      recipientRes = await pool.query(
        'SELECT id, email, first_name, last_name FROM email_recipients WHERE blast_id = $1 AND status = $2 LIMIT $3 OFFSET $4',
        [blastId, 'pending', limit, offset]
      );
    } else {
      recipientRes = await pool.query(
        'SELECT id, email, first_name, last_name FROM email_recipients WHERE blast_id = $1 AND status = $2',
        [blastId, 'pending']
      );
    }

    const recipients = recipientRes.rows;
    console.log(`📧 Sending ${recipients.length} emails from blast ${blastId}${chunkInfo}...`);

    // Emit blast started event (only for non-chunked blasts)
    if (!limit) {
      campaignEvents.startBlast(blastId, blast.subject, recipients.length);
    }

    // Send in batches
    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const personalizedHtmlBody = personalizeBody(blast.html_body, recipient);
          const personalizedTextBody = blast.plain_text_body ? personalizeBody(blast.plain_text_body, recipient) : '';
          const sendResult = await sendEmail(recipient.email, blast.subject, personalizedHtmlBody, personalizedTextBody, blast.from_address);

          // Persist ses_message_id if send was successful
          if (sendResult.success && sendResult.messageId) {
            try {
              await pool.query(
                'UPDATE email_recipients SET ses_message_id = $1, status = $2 WHERE id = $3',
                [sendResult.messageId, 'sent', recipient.id]
              );
            } catch (err) {
              console.warn(`⚠️ Failed to persist message ID for recipient ${recipient.id}:`, err.message);
            }
          }

          return sendResult;
        })
      );
      results.push(...batchResults);

      // Count successes and failures
      sentCount += batchResults.filter(r => r.success).length;
      failedCount += batchResults.filter(r => !r.success).length;

      // Emit progress event after each batch (only for non-chunked blasts)
      if (!limit) {
        campaignEvents.updateProgress(blastId, sentCount, failedCount);
      }

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Update blast status only if not chunked (final update happens after all chunks complete)
    if (!limit) {
      const successCount = results.filter(r => r.success).length;
      const failureCount = recipients.length - successCount;
      await pool.query(
        'UPDATE email_blasts SET status = $1, results = $2 WHERE id = $3',
        ['sent', JSON.stringify(results), blastId]
      );

      console.log(`✅ Blast ${blastId} sent: ${successCount}/${recipients.length} succeeded`);

      // Emit blast complete event
      campaignEvents.completeBlast(blastId, { successCount, failureCount });

      // Publish blast.complete event to EventBridge (async, non-blocking)
      try {
        await publishBlastComplete(blastId, 'email', successCount, failureCount);
      } catch (err) {
        console.warn('⚠️ Failed to publish blast.complete event:', err.message);
      }
    } else {
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Chunk sent from blast ${blastId}: ${successCount}/${recipients.length} succeeded`);
    }
  } catch (err) {
    console.error(`❌ Failed to process email blast ${blastId}:`, err.message);
    if (!limit) {
      campaignEvents.failBlast(blastId, err);
      await pool.query(
        'UPDATE email_blasts SET status = $1 WHERE id = $2',
        ['failed', blastId]
      );
    }
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

    // Emit blast started event
    campaignEvents.startBlast(blastId, `SMS: ${blast.message.substring(0, 50)}...`, phones.length);

    // Send in batches
    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const batch = phones.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(phone => sendSMS(phone, blast.message))
      );
      results.push(...batchResults);

      // Count successes and failures
      sentCount += batchResults.filter(r => r.success).length;
      failedCount += batchResults.filter(r => !r.success).length;

      // Emit progress event after each batch
      campaignEvents.updateProgress(blastId, sentCount, failedCount);

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

    // Emit blast complete event
    campaignEvents.completeBlast(blastId, { successCount, failureCount });

    // Publish blast.complete event to EventBridge (async, non-blocking)
    try {
      await publishBlastComplete(blastId, 'sms', successCount, failureCount);
    } catch (err) {
      console.warn('⚠️ Failed to publish blast.complete event:', err.message);
    }
  } catch (err) {
    console.error(`❌ Failed to process SMS blast ${blastId}:`, err.message);
    campaignEvents.failBlast(blastId, err);
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
          // Legacy message format (entire blast in one message)
          await processEmailBlast(payload.blastId);
        } else if (payload.type === 'email_blast_chunk') {
          // New chunked format (500 recipients per message)
          const { blastId, offset = 0, limit = 500 } = payload;
          await processEmailBlast(blastId, offset, limit);
        } else if (payload.type === 'sms_blast') {
          await processSmsBlast(payload.blastId);
        }
        // Only delete message if processing succeeded (no throw)
        await deleteMessage(message.ReceiptHandle);
      } catch (err) {
        // On error, leave message in queue for retry (SQS visibility timeout handles this)
        console.error(`⚠️ Failed to process message, will retry:`, err.message);
        // Don't delete the message, let it become visible again
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
