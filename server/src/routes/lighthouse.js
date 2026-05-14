const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const REPORTS_DIR = path.join(__dirname, '..', '..', 'lighthouse-reports');

// GET /api/lighthouse/latest - get latest audit results
router.get('/latest', requireRole('admin', 'campaign_manager'), (req, res) => {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      return res.json({ error: 'No audits found', success: false });
    }

    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.startsWith('lighthouse-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return res.json({ error: 'No audits found', success: false });
    }

    const latestFile = path.join(REPORTS_DIR, files[0]);
    const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

    res.json({
      success: true,
      data,
      auditCount: files.length,
      lastAudit: files[0]
    });
  } catch (err) {
    console.error('Error fetching latest audit:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lighthouse/history - get audit history and trends
router.get('/history', requireRole('admin', 'campaign_manager'), (req, res) => {
  try {
    const historyFile = path.join(REPORTS_DIR, 'history.json');

    if (!fs.existsSync(historyFile)) {
      return res.json({ audits: [], alerts: [], success: true });
    }

    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

    // Calculate trends
    const trends = {};
    if (history.audits.length >= 2) {
      const current = history.audits[history.audits.length - 1];
      const previous = history.audits[history.audits.length - 2];

      trends.performance = current.performance - previous.performance;
      trends.accessibility = current.accessibility - previous.accessibility;
      trends.bestPractices = current.bestPractices - previous.bestPractices;
      trends.seo = current.seo - previous.seo;
      trends.pwa = current.pwa - previous.pwa;
    }

    res.json({
      success: true,
      audits: history.audits,
      alerts: history.alerts,
      trends,
      totalAudits: history.audits.length
    });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lighthouse/recommendations - get optimization recommendations
router.get('/recommendations', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const historyFile = path.join(REPORTS_DIR, 'history.json');
    const history = JSON.parse(fs.existsSync(historyFile) ? fs.readFileSync(historyFile, 'utf8') : '{"audits":[]}');

    if (!history.audits || history.audits.length === 0) {
      return res.json({
        success: true,
        recommendations: [
          {
            priority: 'HIGH',
            category: 'Performance',
            issue: 'No baseline audit available',
            suggestion: 'Run your first Lighthouse audit using: node server/scripts/run-lighthouse.js'
          }
        ]
      });
    }

    const latest = history.audits[history.audits.length - 1];
    const recommendations = [];

    // Performance recommendations
    if (latest.performance < 90) {
      recommendations.push({
        priority: latest.performance < 50 ? 'CRITICAL' : 'HIGH',
        category: 'Performance',
        issue: `Performance score is ${Math.round(latest.performance)}%`,
        suggestions: [
          'Optimize image sizes and formats (use WebP)',
          'Minify CSS and JavaScript files',
          'Enable gzip compression on server',
          'Implement lazy loading for images',
          'Reduce unused CSS and JavaScript',
          'Use a CDN for static assets'
        ]
      });
    }

    // Accessibility recommendations
    if (latest.accessibility < 90) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Accessibility',
        issue: `Accessibility score is ${Math.round(latest.accessibility)}%`,
        suggestions: [
          'Add alt text to all images',
          'Ensure proper heading hierarchy (h1 → h6)',
          'Add ARIA labels to interactive elements',
          'Ensure sufficient color contrast (4.5:1)',
          'Make all interactive elements keyboard accessible',
          'Use semantic HTML elements'
        ]
      });
    }

    // Core Web Vitals recommendations
    if (latest.metrics.largestContentfulPaint > 2500) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Core Web Vitals',
        metric: 'Largest Contentful Paint',
        issue: `LCP is ${Math.round(latest.metrics.largestContentfulPaint)}ms (target: <2.5s)`,
        suggestions: [
          'Optimize server response time (TTFB)',
          'Eliminate render-blocking resources',
          'Preload critical resources',
          'Reduce JavaScript execution time'
        ]
      });
    }

    if (latest.metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Core Web Vitals',
        metric: 'Cumulative Layout Shift',
        issue: `CLS is ${latest.metrics.cumulativeLayoutShift.toFixed(3)} (target: <0.1)`,
        suggestions: [
          'Avoid inserting content above existing content',
          'Set explicit sizes for images and videos',
          'Avoid animations that cause layout shifts',
          'Use CSS transforms for animations'
        ]
      });
    }

    // Best Practices recommendations
    if (latest.bestPractices < 90) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Best Practices',
        issue: `Best Practices score is ${Math.round(latest.bestPractices)}%`,
        suggestions: [
          'Use HTTPS for all resources',
          'Avoid deprecated APIs',
          'Use modern browser features',
          'Secure sensitive data with HTTPS'
        ]
      });
    }

    // SEO recommendations
    if (latest.seo < 90) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'SEO',
        issue: `SEO score is ${Math.round(latest.seo)}%`,
        suggestions: [
          'Add meta description to page',
          'Use descriptive page title',
          'Ensure mobile-friendly design',
          'Add structured data markup'
        ]
      });
    }

    res.json({
      success: true,
      recommendations,
      lastAudit: latest.timestamp
    });
  } catch (err) {
    console.error('Error generating recommendations:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
