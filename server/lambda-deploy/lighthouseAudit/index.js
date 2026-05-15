const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const { uploadFile } = require('../src/lib/s3Client');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const cloudwatchClient = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-2' });

const BASE_URL = process.env.BASE_URL || 'https://heidi-campaign.com';
const TARGET_URL = `${BASE_URL}/email-campaigns`;

async function runLighthouse() {
  console.log(`🔦 Running Lighthouse audit on ${TARGET_URL}...`);

  let chrome;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });

    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      emulatedFormFactor: 'desktop',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
    };

    const runnerResult = await lighthouse(TARGET_URL, options);
    const report = runnerResult.lhr;

    // Extract scores
    const scores = {
      performance: report.categories.performance.score * 100,
      accessibility: report.categories.accessibility.score * 100,
      bestPractices: report.categories['best-practices'].score * 100,
      seo: report.categories.seo.score * 100
    };

    // Extract Core Web Vitals
    const metrics = {
      LCP: report.audits['largest-contentful-paint']?.numericValue || 0,
      FID: report.audits['max-potential-fid']?.numericValue || 0,
      CLS: report.audits['cumulative-layout-shift']?.numericValue || 0,
      TTFB: report.audits['server-response-time']?.numericValue || 0
    };

    console.log(`📊 Scores:`, scores);
    console.log(`📈 Core Web Vitals:`, metrics);

    // Upload JSON report to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportKey = `lighthouse-reports/lighthouse-${timestamp}.json`;
    await uploadFile(reportKey, JSON.stringify(report, null, 2), 'application/json');
    console.log(`✅ Report uploaded to S3: ${reportKey}`);

    // Publish metrics to CloudWatch
    const metricData = [
      { MetricName: 'LighthousePerformanceScore', Value: scores.performance },
      { MetricName: 'LighthouseAccessibilityScore', Value: scores.accessibility },
      { MetricName: 'LighthouseBestPracticesScore', Value: scores.bestPractices },
      { MetricName: 'LighthouseSEOScore', Value: scores.seo },
      { MetricName: 'LargestContentfulPaint', Value: metrics.LCP, Unit: 'Milliseconds' },
      { MetricName: 'FirstInputDelay', Value: metrics.FID, Unit: 'Milliseconds' },
      { MetricName: 'CumulativeLayoutShift', Value: metrics.CLS },
      { MetricName: 'TimeToFirstByte', Value: metrics.TTFB, Unit: 'Milliseconds' }
    ];

    for (let i = 0; i < metricData.length; i += 20) {
      const batch = metricData.slice(i, i + 20).map(m => ({
        ...m,
        Unit: m.Unit || 'Percent',
        Timestamp: new Date()
      }));

      await cloudwatchClient.send(new PutMetricDataCommand({
        Namespace: 'HEIDIVoterDashboard/Performance',
        MetricData: batch
      }));
    }

    console.log('✅ Metrics published to CloudWatch');
    return scores;
  } catch (err) {
    console.error('❌ Lighthouse audit failed:', err.message);
    throw err;
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

async function handler(event) {
  console.log('🔍 Lighthouse Audit Lambda triggered');

  try {
    const scores = await runLighthouse();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Lighthouse audit complete', scores })
    };
  } catch (err) {
    console.error('❌ Handler error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}

module.exports = { handler };
