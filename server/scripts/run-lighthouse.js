#!/usr/bin/env node

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const PAGE_URL = `${BASE_URL}/email-campaigns`;
const REPORTS_DIR = path.join(__dirname, '..', 'lighthouse-reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function runLighthouse() {
  console.log('🔍 Starting Lighthouse audit...');
  console.log(`📍 Target URL: ${PAGE_URL}`);

  let chrome;
  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

    // Run Lighthouse
    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
    };

    const runnerResult = await lighthouse(PAGE_URL, options);

    // Extract scores
    const scores = {
      timestamp: new Date().toISOString(),
      url: PAGE_URL,
      performance: runnerResult.lhr.categories.performance.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100,
      bestPractices: runnerResult.lhr.categories['best-practices'].score * 100,
      seo: runnerResult.lhr.categories.seo.score * 100,
      pwa: runnerResult.lhr.categories.pwa ? (runnerResult.lhr.categories.pwa.score * 100) : 0,
      metrics: {
        firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint']?.numericValue,
        largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint']?.numericValue,
        cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift']?.numericValue,
        timeToInteractive: runnerResult.lhr.audits['interactive']?.numericValue,
        speedIndex: runnerResult.lhr.audits['speed-index']?.numericValue,
        totalBlockingTime: runnerResult.lhr.audits['total-blocking-time']?.numericValue
      }
    };

    // Save JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReportPath = path.join(REPORTS_DIR, `lighthouse-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(scores, null, 2));

    console.log('\n✅ Lighthouse Audit Results:');
    console.log(`📊 Performance:      ${Math.round(scores.performance)}%`);
    console.log(`♿ Accessibility:    ${Math.round(scores.accessibility)}%`);
    console.log(`✔️  Best Practices:   ${Math.round(scores.bestPractices)}%`);
    console.log(`🔍 SEO:             ${Math.round(scores.seo)}%`);
    console.log(`📱 PWA:             ${Math.round(scores.pwa)}%`);

    console.log('\n⏱️  Core Web Vitals:');
    console.log(`   FCP: ${scores.metrics.firstContentfulPaint?.toFixed(2)}ms`);
    console.log(`   LCP: ${scores.metrics.largestContentfulPaint?.toFixed(2)}ms`);
    console.log(`   CLS: ${scores.metrics.cumulativeLayoutShift?.toFixed(3)}`);
    console.log(`   TBT: ${scores.metrics.totalBlockingTime?.toFixed(2)}ms`);

    console.log(`\n📁 Report saved: ${jsonReportPath}`);

    return scores;
  } catch (err) {
    console.error('❌ Lighthouse audit failed:', err.message);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runLighthouse().then(() => process.exit(0));
}

module.exports = { runLighthouse };
