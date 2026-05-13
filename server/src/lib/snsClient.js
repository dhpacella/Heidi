const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const client = new SNSClient({ region: process.env.AWS_SNS_REGION || 'us-east-1' });

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX)
 * Accepts 10-digit or 11-digit (starting with 1) US numbers
 * @param {string} raw - Raw phone string (e.g., "(708) 243-0195" or "7082430195")
 * @returns {string|null} - E.164 format or null if invalid
 */
function normalizePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  return null;
}

/**
 * Send an SMS via AWS SNS
 * @param {string} phoneNumber - E.164 format phone number (e.g., "+17082430195")
 * @param {string} message - SMS message body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSms(phoneNumber, message) {
  try {
    const result = await client.send(new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    }));

    console.log(`✅ SMS sent to ${phoneNumber} | MessageId: ${result.MessageId}`);

    return {
      success: true,
      messageId: result.MessageId,
      phone: phoneNumber
    };
  } catch (err) {
    console.error(`❌ SMS failed for ${phoneNumber}: ${err.message}`);

    return {
      success: false,
      error: err.message,
      phone: phoneNumber
    };
  }
}

module.exports = { normalizePhone, sendSms };
