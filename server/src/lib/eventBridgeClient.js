const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const client = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-2' });
const EVENT_BUS = process.env.EVENTBRIDGE_BUS || 'heidi-campaign-events';

if (!EVENT_BUS) {
  console.warn('⚠️ EVENTBRIDGE_BUS not set - EventBridge event publishing will be unavailable');
}

async function publishEvent(source, detailType, detail) {
  if (!EVENT_BUS) {
    console.warn('⚠️ EventBridge bus not configured, skipping event publish');
    return;
  }

  try {
    await client.send(new PutEventsCommand({
      Entries: [
        {
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
          EventBusName: EVENT_BUS
        }
      ]
    }));
  } catch (err) {
    console.error(`❌ Failed to publish EventBridge event (${source}/${detailType}):`, err.message);
    throw err;
  }
}

async function publishVoterRegistered(voterId, email, firstName, lastName, precinct) {
  try {
    await publishEvent('heidi.voters', 'voter.registered', {
      voterId,
      email,
      firstName,
      lastName,
      precinct,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Failed to publish voter.registered event:', err.message);
    throw err;
  }
}

async function publishBlastQueued(blastId, blastType, recipientCount) {
  try {
    await publishEvent('heidi.blasts', 'blast.queued', {
      blastId,
      blastType,
      recipientCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Failed to publish blast.queued event:', err.message);
    throw err;
  }
}

async function publishBlastComplete(blastId, blastType, successCount, failureCount) {
  try {
    await publishEvent('heidi.blasts', 'blast.complete', {
      blastId,
      blastType,
      successCount,
      failureCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Failed to publish blast.complete event:', err.message);
    throw err;
  }
}

module.exports = {
  publishEvent,
  publishVoterRegistered,
  publishBlastQueued,
  publishBlastComplete,
  EVENT_BUS
};
