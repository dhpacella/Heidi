const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  }
});

const GPS_TABLE = process.env.DYNAMO_GPS_TABLE || 'HeidiVolunteerGPS';
const EVENTS_TABLE = process.env.DYNAMO_EVENTS_TABLE || 'HeidiEmailEvents';
const LEADERBOARD_TABLE = process.env.DYNAMO_LEADERBOARD_TABLE || 'HeidiLeaderboard';

async function putGPS(volunteerId, timestamp, latitude, longitude) {
  try {
    await docClient.send(new PutCommand({
      TableName: GPS_TABLE,
      Item: {
        volunteerId,
        timestamp,
        latitude,
        longitude,
        recordedAt: new Date().toISOString()
      }
    }));
  } catch (err) {
    console.error('❌ Failed to write GPS to DynamoDB:', err.message);
    throw err;
  }
}

async function getLatestGPS(volunteerId) {
  try {
    const res = await docClient.send(new QueryCommand({
      TableName: GPS_TABLE,
      KeyConditionExpression: 'volunteerId = :id',
      ExpressionAttributeValues: { ':id': volunteerId },
      ScanIndexForward: false,
      Limit: 1
    }));
    return res.Items?.[0] || null;
  } catch (err) {
    console.error('❌ Failed to query GPS from DynamoDB:', err.message);
    throw err;
  }
}

async function getGPSHistory(volunteerId, limit = 100) {
  try {
    const res = await docClient.send(new QueryCommand({
      TableName: GPS_TABLE,
      KeyConditionExpression: 'volunteerId = :id',
      ExpressionAttributeValues: { ':id': volunteerId },
      ScanIndexForward: false,
      Limit: limit
    }));
    return res.Items || [];
  } catch (err) {
    console.error('❌ Failed to query GPS history from DynamoDB:', err.message);
    throw err;
  }
}

async function putEmailEvent(blastId, timestampEmail, email, eventType, metadata = {}) {
  try {
    await docClient.send(new PutCommand({
      TableName: EVENTS_TABLE,
      Item: {
        blastId,
        timestampEmail,
        email,
        eventType,
        recordedAt: new Date().toISOString(),
        ...metadata
      }
    }));
  } catch (err) {
    console.error('❌ Failed to write email event to DynamoDB:', err.message);
    throw err;
  }
}

async function getEmailEvents(blastId) {
  try {
    const res = await docClient.send(new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: 'blastId = :id',
      ExpressionAttributeValues: { ':id': blastId }
    }));
    return res.Items || [];
  } catch (err) {
    console.error('❌ Failed to query email events from DynamoDB:', err.message);
    throw err;
  }
}

async function updateLeaderboard(precinctId, volunteerId, visitedCount) {
  try {
    await docClient.send(new UpdateCommand({
      TableName: LEADERBOARD_TABLE,
      Key: { precinctId, volunteerId },
      UpdateExpression: 'SET visitedCount = :count, updatedAt = :now',
      ExpressionAttributeValues: { ':count': visitedCount, ':now': new Date().toISOString() }
    }));
  } catch (err) {
    console.error('❌ Failed to update leaderboard in DynamoDB:', err.message);
    throw err;
  }
}

module.exports = {
  docClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  GPS_TABLE,
  EVENTS_TABLE,
  LEADERBOARD_TABLE,
  putGPS,
  getLatestGPS,
  getGPSHistory,
  putEmailEvent,
  getEmailEvents,
  updateLeaderboard
};
