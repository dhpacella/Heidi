const { docClient, putEmailEvent, EVENTS_TABLE } = require('../src/lib/dynamoClient');
const { PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { Pool } = require('pg');

let pgPool;

async function initPool() {
  if (pgPool) return;
  const { getSecret } = require('../src/lib/secretsClient');
  const secret = await getSecret('heidi-voter-dashboard/db');
  const connectionString = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.database}?sslmode=require`;
  pgPool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

async function handler(event) {
  console.log('📧 Processing email events from Kinesis...');

  try {
    await initPool();

    // Group events by blast
    const eventsByBlast = {};
    for (const record of event.Records) {
      const payload = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString());
      if (!eventsByBlast[payload.blastId]) {
        eventsByBlast[payload.blastId] = [];
      }
      eventsByBlast[payload.blastId].push(payload);
    }

    // Write events to DynamoDB and update PostgreSQL aggregates
    for (const [blastId, events] of Object.entries(eventsByBlast)) {
      // Batch write to DynamoDB
      const writeRequests = events.map(e => ({
        PutRequest: {
          Item: {
            blastId: e.blastId,
            timestampEmail: `${e.timestamp}#${e.email}`,
            email: e.email,
            eventType: e.type,
            recordedAt: new Date().toISOString(),
            ...e.metadata
          }
        }
      }));

      for (let i = 0; i < writeRequests.length; i += 25) {
        const batch = writeRequests.slice(i, i + 25);
        await docClient.send(new BatchWriteCommand({
          RequestItems: { [EVENTS_TABLE]: batch }
        }));
      }

      // Update PostgreSQL with aggregate counts
      const counts = {};
      for (const e of events) {
        counts[e.type] = (counts[e.type] || 0) + 1;
      }

      if (counts.open || counts.click || counts.bounce) {
        const query = `
          UPDATE email_blasts SET
            opened = opened + $1,
            clicked = clicked + $2,
            bounced = bounced + $3
          WHERE id = $4
        `;
        await pgPool.query(query, [counts.open || 0, counts.click || 0, counts.bounce || 0, blastId]);
      }

      console.log(`✅ Processed ${events.length} events for blast ${blastId}`);
    }

    return { statusCode: 200, body: 'Email events processed' };
  } catch (err) {
    console.error('❌ Error processing email events:', err.message);
    throw err;
  }
}

module.exports = { handler };
