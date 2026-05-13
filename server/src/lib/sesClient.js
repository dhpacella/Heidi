const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const client = new SESClient({ region: process.env.AWS_SES_REGION || 'us-east-2' });

function normalizeEmail(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

async function sendEmail(toAddress, subject, htmlBody, textBody, fromAddress) {
  try {
    const command = new SendEmailCommand({
      Source: fromAddress,
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

module.exports = {
  normalizeEmail,
  sendEmail,
};
