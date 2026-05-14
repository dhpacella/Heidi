# Lighthouse Performance Auditing & Monitoring Guide

This system provides comprehensive performance auditing, CloudWatch integration, automated monitoring, and optimization recommendations for the email deliverability dashboard.

## Overview

The Lighthouse integration provides 4-step performance monitoring:

1. **Performance Audits** — Run Lighthouse on `/email-campaigns` page
2. **CloudWatch Metrics** — Send scores to AWS CloudWatch dashboards
3. **Automated Monitoring** — Scheduled daily audits + 6-hourly checks
4. **Performance Optimization** — AI-generated recommendations based on audit results

---

## Step 1: Manual Performance Audits

### Running an Audit

```bash
cd server
npm install
node scripts/run-lighthouse.js
```

### What Gets Measured

- **Performance** (0-100): Page load speed, paint timing
- **Accessibility** (0-100): WCAG compliance, screen reader support
- **Best Practices** (0-100): Security, code quality, browser APIs
- **SEO** (0-100): Mobile-friendliness, structured data
- **PWA** (0-100): Progressive Web App features

### Core Web Vitals

- **FCP** (First Contentful Paint): Time to first visible content
- **LCP** (Largest Contentful Paint): Time to largest visible element
- **CLS** (Cumulative Layout Shift): Visual stability score
- **TBT** (Total Blocking Time): JavaScript execution time

### Output

Reports are saved to: `server/lighthouse-reports/lighthouse-{timestamp}.json`

Example output:
```
✅ Lighthouse Audit Results:
📊 Performance:      87%
♿ Accessibility:    95%
✔️  Best Practices:   92%
🔍 SEO:             100%
📱 PWA:              85%

⏱️  Core Web Vitals:
   FCP: 1234.56ms
   LCP: 2100.34ms
   CLS: 0.045
   TBT: 234.12ms
```

---

## Step 2: CloudWatch Metrics

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Ensure AWS credentials are configured:**
   ```bash
   export AWS_ACCESS_KEY_ID="your-key"
   export AWS_SECRET_ACCESS_KEY="your-secret"
   export AWS_SES_REGION="us-east-2"
   ```

3. **Send metrics to CloudWatch:**
   ```bash
   node scripts/send-to-cloudwatch.js
   ```

### CloudWatch Dashboard

Metrics are sent to namespace: `HEIDIVoterDashboard/Performance`

Available metrics:
- `LighthousePerformanceScore` (%)
- `LighthouseAccessibilityScore` (%)
- `LighthouseBestPracticesScore` (%)
- `LighthouseSEOScore` (%)
- `LighthousePWAScore` (%)
- `FirstContentfulPaint` (ms)
- `LargestContentfulPaint` (ms)
- `CumulativeLayoutShift` (unitless)
- `TotalBlockingTime` (ms)

### Create CloudWatch Dashboard

In AWS Console:
1. Go to CloudWatch > Dashboards
2. Create new dashboard: "Email Dashboard Performance"
3. Add metrics from `HEIDIVoterDashboard/Performance` namespace
4. Set alarms for regressions:
   - Performance < 80% → WARNING
   - Accessibility < 90% → ALERT
   - LCP > 2500ms → WARNING

---

## Step 3: Automated Monitoring

### Automatic Schedules

The system runs audits automatically:

1. **Daily Full Audit**
   - Time: 02:00 UTC (configurable)
   - Runs: Full Lighthouse audit
   - Sends: Metrics to CloudWatch
   - Checks: For performance regressions

2. **Frequent Health Check**
   - Interval: Every 6 hours
   - Runs: Quick Lighthouse check
   - Sends: Core Web Vitals to CloudWatch
   - Alerts: If metrics degrade >10%

### Regression Detection

When a metric drops >10% from the previous audit, an alert is created:

```json
{
  "type": "PERFORMANCE_REGRESSION",
  "metric": "Performance Score",
  "previous": "92",
  "current": "78",
  "timestamp": "2026-05-14T22:53:00.000Z"
}
```

### History & Alerts

Alerts are stored in: `server/lighthouse-reports/history.json`

View all alerts:
```bash
cat server/lighthouse-reports/history.json | jq '.alerts'
```

### Configuration

Edit `server/scheduler/lighthouse-scheduler.js`:

```javascript
// Change daily audit time (cron format):
const dailyTask = cron.schedule('0 2 * * *', ...); // 02:00 UTC

// Change frequent check interval:
const frequentTask = cron.schedule('0 */6 * * *', ...); // Every 6 hours

// Change regression threshold:
const threshold = 0.1; // 10% change = alert
```

---

## Step 4: Performance Optimization

### API Endpoints

#### Get Latest Audit
```
GET /api/lighthouse/latest
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { /* latest audit results */ },
  "auditCount": 42,
  "lastAudit": "lighthouse-2026-05-14T22-53-00-000Z.json"
}
```

#### Get Audit History & Trends
```
GET /api/lighthouse/history
Authorization: Bearer {token}

Response:
{
  "success": true,
  "audits": [ /* array of 90 days of audits */ ],
  "alerts": [ /* array of detected regressions */ ],
  "trends": {
    "performance": 5,  // +5% from previous
    "accessibility": 0,
    "bestPractices": -2
  },
  "totalAudits": 42
}
```

#### Get Optimization Recommendations
```
GET /api/lighthouse/recommendations
Authorization: Bearer {token}

Response:
{
  "success": true,
  "recommendations": [
    {
      "priority": "HIGH",
      "category": "Performance",
      "issue": "Performance score is 78%",
      "suggestions": [
        "Optimize image sizes and formats (use WebP)",
        "Minify CSS and JavaScript files",
        "Enable gzip compression on server",
        ...
      ]
    }
  ]
}
```

### Common Performance Issues & Fixes

#### Issue: Largest Contentful Paint > 2500ms

**Root causes:**
- Slow server response (TTFB > 600ms)
- Large unoptimized images
- Render-blocking JavaScript
- No resource preloading

**Fixes:**
1. **Optimize images:**
   ```html
   <!-- Use WebP with fallback -->
   <picture>
     <source srcset="image.webp" type="image/webp">
     <img src="image.jpg" alt="">
   </picture>
   ```

2. **Preload critical resources:**
   ```html
   <link rel="preload" as="style" href="critical.css">
   <link rel="preload" as="script" href="critical.js">
   ```

3. **Defer non-critical JavaScript:**
   ```html
   <script defer src="analytics.js"></script>
   <script async src="tracking.js"></script>
   ```

4. **Enable gzip compression** in nginx/EB:
   ```nginx
   gzip on;
   gzip_types text/css text/javascript application/javascript;
   gzip_min_length 1000;
   ```

#### Issue: Cumulative Layout Shift > 0.1

**Root causes:**
- Images/videos without dimensions
- Dynamically inserted content
- Web fonts causing reflow
- Animations that shift layout

**Fixes:**
1. **Set explicit dimensions:**
   ```html
   <img width="800" height="600" src="chart.png">
   <img style="aspect-ratio: 16/9;" src="image.jpg">
   ```

2. **Reserve space for dynamic content:**
   ```css
   .chart-container {
     min-height: 300px; /* Reserve space */
   }
   ```

3. **Use CSS transforms for animations:**
   ```css
   /* Good: uses GPU, no reflow */
   animation: slide {
     transform: translateX(10px);
   }

   /* Bad: causes reflow */
   animation: bad-slide {
     margin-left: 10px;
   }
   ```

#### Issue: Performance Score < 80%

**Optimize email-campaigns.html:**

1. **Lazy load Chart.js:**
   ```javascript
   // Load chart library on demand
   async function renderCharts() {
     const script = await import('https://cdn.jsdelivr.net/npm/chart.js');
     // ... render charts
   }
   ```

2. **Minify inline styles:**
   - Move repetitive styles to classes
   - Remove duplicate CSS rules

3. **Code splitting:**
   - Load API routes separately
   - Lazy load monitoring features

### Performance Budget

Recommended targets:

| Metric | Target | Alert |
|--------|--------|-------|
| Performance | ≥90% | <80% |
| Accessibility | ≥95% | <90% |
| Best Practices | ≥90% | <85% |
| SEO | ≥95% | <90% |
| LCP | <2500ms | >3000ms |
| CLS | <0.1 | >0.15 |
| TBT | <300ms | >500ms |
| FCP | <1800ms | >2500ms |

---

## Integration with CI/CD

### Pre-deployment Audit

Add to your deployment pipeline:

```bash
#!/bin/bash
echo "Running Lighthouse audit before deployment..."
node server/scripts/run-lighthouse.js || exit 1
node server/scripts/send-to-cloudwatch.js

echo "Checking for regressions..."
node -e "
const history = require('./server/lighthouse-reports/history.json');
const latest = history.audits[history.audits.length - 1];
if (latest.performance < 90) {
  console.error('❌ Performance regression detected!');
  process.exit(1);
}
"
```

### Automated Alerts

Configure CloudWatch alarms to notify via SNS:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Lighthouse-Performance-Regression" \
  --alarm-description "Alert if performance score drops below 80%" \
  --metric-name LighthousePerformanceScore \
  --namespace HEIDIVoterDashboard/Performance \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-2:YOUR_ACCOUNT:performance-alerts
```

---

## Troubleshooting

### Chrome Not Found

If you get "Chrome not found" error:

```bash
# Install Chrome/Chromium
# Ubuntu/Debian:
apt-get install chromium-browser

# macOS:
brew install chromium

# Or use Chrome from PATH:
export CHROME_PATH="/usr/bin/chromium"
```

### CloudWatch Auth Errors

Ensure AWS credentials are set:
```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-2"
```

### Reports Not Generating

Check permissions:
```bash
mkdir -p server/lighthouse-reports
chmod 755 server/lighthouse-reports
```

---

## Next Steps

1. **Run first audit:** `node server/scripts/run-lighthouse.js`
2. **Send to CloudWatch:** `node server/scripts/send-to-cloudwatch.js`
3. **Create CloudWatch dashboard** with metrics
4. **Review recommendations:** `GET /api/lighthouse/recommendations`
5. **Implement fixes** based on priority
6. **Set up CI/CD integration** for automated testing

The system will automatically monitor your performance and alert you to regressions!
