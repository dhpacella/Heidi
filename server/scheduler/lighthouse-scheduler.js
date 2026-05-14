const cron = require('node-cron');
const { runLighthouse } = require('../scripts/run-lighthouse');
const { sendMetricsToCloudWatch } = require('../scripts/send-to-cloudwatch');
const fs = require('fs');
const path = require('path');

// Performance history tracking
const historyFile = path.join(__dirname, '../lighthouse-reports/history.json');

function loadHistory() {
  try {
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not load history:', err.message);
  }
  return { audits: [], alerts: [] };
}

function saveHistory(history) {
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function checkForRegressions(current, history) {
  const alerts = [];
  const lastAudit = history.audits[history.audits.length - 1];

  if (lastAudit) {
    const threshold = 0.1; // 10% degradation triggers alert

    if ((lastAudit.performance - current.performance) / lastAudit.performance > threshold) {
      alerts.push({
        type: 'PERFORMANCE_REGRESSION',
        metric: 'Performance Score',
        previous: lastAudit.performance.toFixed(0),
        current: current.performance.toFixed(0),
        timestamp: new Date().toISOString()
      });
    }

    if ((lastAudit.accessibility - current.accessibility) / lastAudit.accessibility > threshold) {
      alerts.push({
        type: 'ACCESSIBILITY_REGRESSION',
        metric: 'Accessibility Score',
        previous: lastAudit.accessibility.toFixed(0),
        current: current.accessibility.toFixed(0),
        timestamp: new Date().toISOString()
      });
    }

    // Check Core Web Vitals
    if (current.metrics.largestContentfulPaint && lastAudit.metrics.largestContentfulPaint) {
      const lcpIncrease = (current.metrics.largestContentfulPaint - lastAudit.metrics.largestContentfulPaint) / lastAudit.metrics.largestContentfulPaint;
      if (lcpIncrease > threshold) {
        alerts.push({
          type: 'LCP_REGRESSION',
          metric: 'Largest Contentful Paint',
          previous: `${lastAudit.metrics.largestContentfulPaint.toFixed(0)}ms`,
          current: `${current.metrics.largestContentfulPaint.toFixed(0)}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  return alerts;
}

async function runScheduledAudit() {
  console.log('\n📅 Running scheduled Lighthouse audit...');

  try {
    // Run Lighthouse audit
    const scores = await runLighthouse();

    // Load history
    const history = loadHistory();

    // Check for regressions
    const alerts = checkForRegressions(scores, history);

    // Add to history
    history.audits.push(scores);
    if (alerts.length > 0) {
      history.alerts = history.alerts.concat(alerts);
      console.log(`\n⚠️ ALERTS DETECTED: ${alerts.length}`);
      alerts.forEach(alert => {
        console.log(`   ${alert.type}: ${alert.metric}`);
        console.log(`      ${alert.previous} → ${alert.current}`);
      });
    }

    // Keep only last 90 days of audits
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    history.audits = history.audits.filter(audit => new Date(audit.timestamp) > ninetyDaysAgo);
    history.alerts = history.alerts.filter(alert => new Date(alert.timestamp) > ninetyDaysAgo);

    saveHistory(history);

    // Send to CloudWatch
    await sendMetricsToCloudWatch(scores);

    console.log('✅ Scheduled audit complete');
  } catch (err) {
    console.error('❌ Scheduled audit failed:', err.message);
  }
}

function scheduleLighthouseAudits() {
  console.log('🕐 Scheduling Lighthouse audits...');

  // Run daily at 2 AM UTC (adjust as needed)
  const dailyTask = cron.schedule('0 2 * * *', async () => {
    await runScheduledAudit();
  });

  // Also run every 6 hours for continuous monitoring
  const frequentTask = cron.schedule('0 */6 * * *', async () => {
    console.log('\n🔄 Running 6-hourly Lighthouse check...');
    try {
      const scores = await runLighthouse();
      await sendMetricsToCloudWatch(scores);
      console.log('✅ 6-hourly check complete');
    } catch (err) {
      console.error('❌ 6-hourly check failed:', err.message);
    }
  });

  console.log('✅ Lighthouse audit scheduler started');
  console.log('   - Daily audit: 02:00 UTC');
  console.log('   - Frequent check: Every 6 hours');

  return { dailyTask, frequentTask };
}

module.exports = { scheduleLighthouseAudits, runScheduledAudit };
