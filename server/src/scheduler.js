const { dispatchBlast } = require('./routes/email');

function scheduleDispatcher(pool) {
  const BASE_URL = process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production'
    ? 'https://heidi-prod.eba-dkbkgcjs.us-east-1.elasticbeanstalk.com'
    : 'http://localhost:5000');

  console.log(`⏱️ Starting email scheduler (checking every 60s, base URL: ${BASE_URL})`);

  setInterval(async () => {
    try {
      // Atomic claim: UPDATE ... WHERE status='scheduled' ... SET status='sending' RETURNING
      // Prevents double-dispatch if server restarts during dispatch window
      const { rows: dueBlasts } = await pool.query(
        `UPDATE email_blasts
         SET status = 'sending'
         WHERE status = 'scheduled' AND scheduled_at <= NOW()
         RETURNING id, subject, html_body, from_address, list_id, segment_id`
      );

      if (dueBlasts.length === 0) {
        return; // No blasts due yet
      }

      console.log(`📤 Dispatcher found ${dueBlasts.length} due blast(s)`);

      for (const blast of dueBlasts) {
        try {
          // Fetch all recipients for this blast
          const { rows: recipients } = await pool.query(
            `SELECT id, email, first_name, last_name FROM email_recipients
             WHERE blast_id = $1 AND status = 'pending'`,
            [blast.id]
          );

          if (recipients.length === 0) {
            console.warn(`⚠️ Blast #${blast.id} has no pending recipients`);
            continue;
          }

          // Build emailToRecipientId map
          const emailToRecipientId = {};
          recipients.forEach(r => {
            emailToRecipientId[r.email] = r.id;
          });

          // Convert recipients to records format expected by dispatchBlast
          const validRecords = recipients.map(r => ({
            email: r.email,
            firstName: r.first_name,
            lastName: r.last_name
          }));

          // Fetch the full blast details to get sender_id for logging
          const { rows: blastRows } = await pool.query(
            `SELECT sender_id FROM email_blasts WHERE id = $1`,
            [blast.id]
          );

          console.log(`⏳ Dispatching blast #${blast.id} to ${validRecords.length} recipients...`);

          // Call dispatchBlast with all required parameters
          await dispatchBlast(
            pool,
            blast.id,
            validRecords,
            emailToRecipientId,
            blast.subject,
            blast.html_body,
            '', // textBody (not stored in db, but needed for dispatchBlast)
            blast.from_address,
            BASE_URL
          );

          console.log(`✅ Blast #${blast.id} dispatched successfully`);
        } catch (blastErr) {
          console.error(`❌ Error dispatching blast #${blast.id}:`, blastErr.message);
          // Mark blast as failed
          try {
            await pool.query(
              `UPDATE email_blasts SET status = 'failed' WHERE id = $1`,
              [blast.id]
            );
          } catch (updateErr) {
            console.error(`  ❌ Failed to mark blast as failed:`, updateErr.message);
          }
        }
      }
    } catch (err) {
      console.error('❌ Scheduler error:', err.message);
    }
  }, 60 * 1000); // Run every 60 seconds
}

module.exports = { scheduleDispatcher };
