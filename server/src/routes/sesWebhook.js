const pool = require('../db/connection');

module.exports = async (req, res) => {
  res.sendStatus(200); // ACK immediately to prevent SNS retries

  const body = req.body;

  if (body.Type === 'SubscriptionConfirmation') {
    // Auto-confirm SNS subscription
    try {
      await fetch(body.SubscribeURL);
    } catch (err) {
      console.error('Error confirming SNS subscription:', err);
    }
    return;
  }

  if (body.Type === 'Notification') {
    try {
      const msg = JSON.parse(body.Message);

      if (msg.notificationType === 'Bounce') {
        const isHard = msg.bounce.bounceType === 'Permanent';
        for (const recipient of msg.bounce.bouncedRecipients) {
          const email = recipient.emailAddress;
          const status = isHard ? 'bounced' : 'soft_bounce';
          const bounceType = isHard ? 'hard' : 'soft';
          const messageId = msg.mail.messageId;

          // Update email_recipients
          await pool.query(
            `UPDATE email_recipients
             SET status = $1, bounced_at = NOW(), bounce_type = $2
             WHERE ses_message_id = $3`,
            [status, bounceType, messageId]
          );

          // For hard bounces, also mark the subscriber as bounced
          if (isHard) {
            await pool.query(
              "UPDATE email_subscribers SET status = 'bounced' WHERE email = $1",
              [email]
            );
          }
        }
      }

      if (msg.notificationType === 'Complaint') {
        for (const recipient of msg.complaint.complainedRecipients) {
          const email = recipient.emailAddress;
          const messageId = msg.mail.messageId;

          // Update email_recipients
          await pool.query(
            `UPDATE email_recipients
             SET status = 'complained', complained_at = NOW()
             WHERE ses_message_id = $1`,
            [messageId]
          );

          // Update email_subscribers
          await pool.query(
            "UPDATE email_subscribers SET status = 'complained' WHERE email = $1",
            [email]
          );
        }
      }
    } catch (err) {
      console.error('Error processing SES webhook:', err);
    }
  }
};
