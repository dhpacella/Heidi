const { SESClient, SendEmailCommand, GetAccountSendingEnabledAttribute, GetSendStatistics } = require('@aws-sdk/client-ses');

const client = new SESClient({ region: process.env.AWS_SES_REGION || 'us-east-2' });

function normalizeEmail(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

async function sendEmail(toAddress, subject, htmlBody, textBody, fromAddress, fromName) {
  try {
    const source = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
    const command = new SendEmailCommand({
      Source: source,
      Destination: {
        ToAddresses: [toAddress],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody || '',
            Charset: 'UTF-8',
          },
        },
      },
    });

    const response = await client.send(command);
    return {
      success: true,
      messageId: response.MessageId,
      email: toAddress,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      email: toAddress,
    };
  }
}

// Get AWS SES account reputation metrics and sending quota
async function getSESReputationMetrics() {
  try {
    const statsCommand = new GetSendStatistics();
    const response = await client.send(statsCommand);

    // Parse last 14 days of statistics
    const dataPoints = response.SendDataPoints || [];

    let totals = {
      sends: 0,
      bounces: 0,
      complaints: 0,
      deliveries: 0,
      rejects: 0
    };

    dataPoints.forEach(point => {
      totals.sends += point.Sends || 0;
      totals.bounces += point.Bounces || 0;
      totals.complaints += point.Complaints || 0;
      totals.deliveries += point.Deliveries || 0;
      totals.rejects += point.Rejects || 0;
    });

    // Calculate rates
    const totalSent = totals.sends || 1;
    const bounceRate = Math.round((totals.bounces / totalSent) * 100);
    const complaintRate = Math.round((totals.complaints / totalSent) * 100);
    const deliveryRate = Math.round((totals.deliveries / totalSent) * 100);
    const rejectRate = Math.round((totals.rejects / totalSent) * 100);

    // Check if sending is enabled
    const enabledCommand = new GetAccountSendingEnabledAttribute();
    const enabledResponse = await client.send(enabledCommand);

    return {
      success: true,
      aws_metrics: {
        total_sends: totals.sends,
        total_bounces: totals.bounces,
        total_complaints: totals.complaints,
        total_deliveries: totals.deliveries,
        total_rejects: totals.rejects,
        bounce_rate: bounceRate,
        complaint_rate: complaintRate,
        delivery_rate: deliveryRate,
        reject_rate: rejectRate,
        sending_enabled: enabledResponse.Enabled,
        reputation_status: getReputationStatus(bounceRate, complaintRate)
      },
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching AWS SES metrics:', error.message);
    return {
      success: false,
      error: error.message,
      aws_metrics: null
    };
  }
}

// Determine reputation status based on rates
function getReputationStatus(bounceRate, complaintRate) {
  if (bounceRate > 5 || complaintRate > 0.1) {
    return 'warning';
  }
  if (bounceRate > 3 || complaintRate > 0.05) {
    return 'caution';
  }
  return 'healthy';
}

module.exports = {
  normalizeEmail,
  sendEmail,
  getSESReputationMetrics,
};
