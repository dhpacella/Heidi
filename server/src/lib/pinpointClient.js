const { PinpointClient } = require('@aws-sdk/client-pinpoint');

const client = new PinpointClient({ region: process.env.AWS_REGION || 'us-east-2' });
const APP_ID = process.env.PINPOINT_APP_ID;

if (!APP_ID) {
  console.warn('⚠️ PINPOINT_APP_ID not set - Pinpoint features will be unavailable');
}

module.exports = { pinpoint: client, APP_ID };
