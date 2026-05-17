const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const logger = require('./logger');

const client = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-2' });
const NAMESPACE = 'HeidiCampaign';

async function putMetric(metricName, value, unit = 'Count', dimensions = []) {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    await client.send(new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: dimensions,
      }],
    }));
  } catch (err) {
    console.warn('CloudWatch metric failed:', metricName, err.message);
  }
}

module.exports = { putMetric };
