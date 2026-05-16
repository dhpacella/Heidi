const { docClient, putGPS, GPS_TABLE } = require('../src/lib/dynamoClient');
const { BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const cloudwatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-2' });

async function handler(event) {
  console.log('📍 Processing GPS events from Kinesis...');

  try {
    const writeRequests = [];
    const volunteerIds = new Set();

    // Parse and validate GPS events
    for (const record of event.Records) {
      const payload = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString());

      if (payload.volunteerId && payload.latitude !== undefined && payload.longitude !== undefined) {
        writeRequests.push({
          PutRequest: {
            Item: {
              volunteerId: payload.volunteerId,
              timestamp: payload.timestamp,
              latitude: payload.latitude,
              longitude: payload.longitude,
              recordedAt: new Date().toISOString()
            }
          }
        });
        volunteerIds.add(payload.volunteerId);
      }
    }

    // Batch write to DynamoDB
    for (let i = 0; i < writeRequests.length; i += 25) {
      const batch = writeRequests.slice(i, i + 25);
      await docClient.send(new BatchWriteCommand({
        RequestItems: { [GPS_TABLE]: batch }
      }));
    }

    // Emit CloudWatch metric for active volunteers
    if (volunteerIds.size > 0) {
      await cloudwatchClient.send(new PutMetricDataCommand({
        Namespace: 'HEIDIVoterDashboard/Volunteers',
        MetricData: [{
          MetricName: 'ActiveVolunteers',
          Value: volunteerIds.size,
          Unit: 'Count',
          Timestamp: new Date()
        }]
      }));
    }

    console.log(`✅ Processed ${writeRequests.length} GPS pings from ${volunteerIds.size} volunteers`);
    return { statusCode: 200, body: 'GPS events processed' };
  } catch (err) {
    console.error('❌ Error processing GPS events:', err.message);
    throw err;
  }
}

module.exports = { handler };
