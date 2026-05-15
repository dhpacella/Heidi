const { KinesisClient, PutRecordCommand } = require('@aws-sdk/client-kinesis');

const client = new KinesisClient({ region: process.env.AWS_REGION || 'us-east-2' });
const EVENTS_STREAM = process.env.KINESIS_STREAM_NAME || 'heidi-events';
const GPS_STREAM = process.env.KINESIS_GPS_STREAM || 'heidi-gps';

if (!EVENTS_STREAM) {
  console.warn('⚠️ KINESIS_STREAM_NAME not set - Kinesis event publishing will be unavailable');
}

if (!GPS_STREAM) {
  console.warn('⚠️ KINESIS_GPS_STREAM not set - Kinesis GPS publishing will be unavailable');
}

async function publishEvent(streamName, partitionKey, data) {
  if (!streamName) {
    console.warn('⚠️ Stream name not provided, skipping Kinesis publish');
    return;
  }

  try {
    await client.send(new PutRecordCommand({
      StreamName: streamName,
      PartitionKey: partitionKey,
      Data: Buffer.from(JSON.stringify(data))
    }));
  } catch (err) {
    console.error(`❌ Failed to publish to Kinesis stream ${streamName}:`, err.message);
    throw err;
  }
}

async function publishEmailEvent(eventType, blastId, email, metadata = {}) {
  try {
    await publishEvent(EVENTS_STREAM, blastId, {
      type: eventType,
      blastId,
      email,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  } catch (err) {
    console.error('❌ Failed to publish email event to Kinesis:', err.message);
    throw err;
  }
}

async function publishGPSEvent(volunteerId, latitude, longitude) {
  try {
    await publishEvent(GPS_STREAM, volunteerId, {
      volunteerId,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Failed to publish GPS event to Kinesis:', err.message);
    throw err;
  }
}

module.exports = {
  publishEvent,
  publishEmailEvent,
  publishGPSEvent,
  EVENTS_STREAM,
  GPS_STREAM
};
