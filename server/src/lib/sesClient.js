const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const client = new SESClient({ region: process.env.AWS_SES_REGION || 'us-east-2' });

function normalizeEmail(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

async function sendWithRetry(command, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await client.send(command);
    } catch (err) {
      const isThrottle = err.name === 'ThrottlingException' ||
                         err.$metadata?.httpStatusCode === 429;
      if (isThrottle && attempt < retries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ SES throttled, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, backoffMs));
      } else {
        throw err;
      }
    }
  }
}

async function sendEmail(toAddress, subject, htmlBody, textBody, fromAddress, unsubscribeLink) {
  try {
    let finalHtmlBody = htmlBody;
    if (unsubscribeLink) {
      finalHtmlBody = `${htmlBody}\n<footer style="margin-top:40px;padding-top:20px;border-top:1px solid #ccc;font-size:12px;color:#999;"><p><a href="${unsubscribeLink}" style="color:#999;">Unsubscribe from future emails</a></p></footer>`;
    }

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
            Data: finalHtmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody || '',
            Charset: 'UTF-8',
          },
        },
      },
    });

    const response = await sendWithRetry(command);
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
