const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-2', useQueueUrlAsEndpoint: false });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

if (!QUEUE_URL) {
  console.warn('⚠️ SQS_QUEUE_URL not set - SQS features will be unavailable');
}

async function enqueue(payload) {
  if (!QUEUE_URL) {
    throw new Error('SQS_QUEUE_URL not configured');
  }
  try {
    await client.send(new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(payload)
    }));
  } catch (err) {
    console.error('❌ Failed to enqueue message:', err.message);
    throw err;
  }
}

async function dequeue(maxMessages = 1) {
  if (!QUEUE_URL) {
    throw new Error('SQS_QUEUE_URL not configured');
  }
  try {
    const res = await client.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20
    }));
    return res.Messages || [];
  } catch (err) {
    console.error('❌ Failed to dequeue message:', err.message);
    throw err;
  }
}

async function deleteMessage(receiptHandle) {
  if (!QUEUE_URL) {
    throw new Error('SQS_QUEUE_URL not configured');
  }
  try {
    await client.send(new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle
    }));
  } catch (err) {
    console.error('❌ Failed to delete message:', err.message);
    throw err;
  }
}

module.exports = { enqueue, dequeue, deleteMessage, QUEUE_URL };
