#!/usr/bin/env node

const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const fs = require('fs');
const path = require('path');

const AWS_REGION = process.env.AWS_SES_REGION || 'us-east-2';
const NAMESPACE = 'HEIDIVoterDashboard/Performance';

const cloudwatch = new CloudWatchClient({ region: AWS_REGION });

async function sendMetricsToCloudWatch(lighthouseScores) {
  console.log('📤 Sending metrics to CloudWatch...');

  try {
    const metricData = [
      {
        MetricName: 'LighthousePerformanceScore',
        Value: lighthouseScores.performance,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'LighthouseAccessibilityScore',
        Value: lighthouseScores.accessibility,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'LighthouseBestPracticesScore',
        Value: lighthouseScores.bestPractices,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'LighthouseSEOScore',
        Value: lighthouseScores.seo,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'LighthousePWAScore',
        Value: lighthouseScores.pwa,
        Unit: 'Percent',
        Timestamp: new Date()
      }
    ];

    // Add Core Web Vitals
    if (lighthouseScores.metrics.firstContentfulPaint) {
      metricData.push({
        MetricName: 'FirstContentfulPaint',
        Value: lighthouseScores.metrics.firstContentfulPaint,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      });
    }

    if (lighthouseScores.metrics.largestContentfulPaint) {
      metricData.push({
        MetricName: 'LargestContentfulPaint',
        Value: lighthouseScores.metrics.largestContentfulPaint,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      });
    }

    if (lighthouseScores.metrics.cumulativeLayoutShift) {
      metricData.push({
        MetricName: 'CumulativeLayoutShift',
        Value: lighthouseScores.metrics.cumulativeLayoutShift,
        Unit: 'None',
        Timestamp: new Date()
      });
    }

    if (lighthouseScores.metrics.totalBlockingTime) {
      metricData.push({
        MetricName: 'TotalBlockingTime',
        Value: lighthouseScores.metrics.totalBlockingTime,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      });
    }

    // Send metrics in batches (CloudWatch limit is 20 per request)
    for (let i = 0; i < metricData.length; i += 20) {
      const batch = metricData.slice(i, i + 20);

      const command = new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: batch
      });

      await cloudwatch.send(command);
      console.log(`✅ Sent ${batch.length} metrics to CloudWatch`);
    }

    console.log('✅ All metrics sent to CloudWatch successfully');
  } catch (err) {
    console.error('❌ Failed to send metrics to CloudWatch:', err.message);
    process.exit(1);
  }
}

// If called directly, read latest Lighthouse report and send to CloudWatch
if (require.main === module) {
  const reportsDir = path.join(__dirname, '..', 'lighthouse-reports');
  const files = fs.readdirSync(reportsDir).sort().reverse();

  if (files.length === 0) {
    console.error('❌ No Lighthouse reports found. Run `node run-lighthouse.js` first.');
    process.exit(1);
  }

  const latestReport = path.join(reportsDir, files[0]);
  const data = JSON.parse(fs.readFileSync(latestReport, 'utf8'));

  sendMetricsToCloudWatch(data).then(() => {
    console.log('✅ CloudWatch metrics updated');
    process.exit(0);
  });
}

module.exports = { sendMetricsToCloudWatch };
