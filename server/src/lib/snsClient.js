const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const client = new SNSClient({ region: process.env.AWS_SNS_REGION || 'us-east-2' });

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  if (digits.length === 11) return '+1' + digits.slice(1);
  return null;
}

async function sendSMS(phoneNumber, message) {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format',
        phone: phoneNumber,
      };
    }

    const command = new PublishCommand({
      Message: message,
      PhoneNumber: normalizedPhone,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'Heidi',
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    const response = await client.send(command);
    return {
      success: true,
      messageId: response.MessageId,
      phone: normalizedPhone,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      phone: phoneNumber,
    };
  }
}

module.exports = {
  normalizePhone,
  sendSMS,
};
