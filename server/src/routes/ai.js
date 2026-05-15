const express = require('express');
const { askClaude } = require('../lib/aiClient');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// All endpoints require admin or campaign_manager role
router.use(requireRole('admin', 'campaign_manager'));

router.post('/generate-email', async (req, res) => {
  try {
    const { idea, campaignName } = req.body;
    if (!idea) {
      return res.status(400).json({ error: 'Campaign idea required' });
    }

    const systemPrompt = 'You are an expert email marketing writer. Generate a professional HTML email based on the campaign idea. Return ONLY valid HTML starting with <html> and ending with </html>. No markdown code blocks, no explanations.';
    const userMessage = `Campaign: ${campaignName || 'General'}. Idea: ${idea}`;

    let html = await askClaude(systemPrompt, userMessage);
    // Remove markdown code blocks if present
    html = html.trim();
    if (html.startsWith('```')) {
      html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '');
    }
    res.json({ html });
  } catch (err) {
    console.error('Generate email error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/suggest-subjects', async (req, res) => {
  try {
    const { htmlBody } = req.body;
    if (!htmlBody) {
      return res.status(400).json({ error: 'Email body required' });
    }

    const systemPrompt = 'You are an email marketing expert. Generate exactly 3 compelling email subject lines based on the email body. Return ONLY valid JSON on a single line with no markdown code blocks: {"subjects": ["subject 1", "subject 2", "subject 3"]}';
    const userMessage = `Email body: ${htmlBody}`;

    const response = await askClaude(systemPrompt, userMessage);
    let parsed;
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: extract any string and use as subjects
      parsed = { subjects: [response.substring(0, 100)] };
    }
    res.json(parsed);
  } catch (err) {
    console.error('Suggest subjects error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/improve-email', async (req, res) => {
  try {
    const { htmlBody, instructions } = req.body;
    if (!htmlBody) {
      return res.status(400).json({ error: 'Email body required' });
    }

    const systemPrompt = 'You are an email marketing expert. Review and improve this email for clarity, engagement, and conversions. Return ONLY improved HTML starting with <html> or <p> tag and ending appropriately. No markdown code blocks, no explanations.';
    const userMessage = `Email: ${htmlBody}. Instructions: ${instructions || 'Improve for engagement and clarity'}`;

    let html = await askClaude(systemPrompt, userMessage);
    // Remove markdown code blocks if present
    html = html.trim();
    if (html.startsWith('```')) {
      html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '');
    }
    res.json({ html });
  } catch (err) {
    console.error('Improve email error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze-campaign', async (req, res) => {
  try {
    const { blast } = req.body;
    if (!blast) {
      return res.status(400).json({ error: 'Blast data required' });
    }

    const systemPrompt = 'You are an email marketing analyst. Analyze email campaign metrics and provide clear, actionable insights in plain English. Be concise and focus on what the numbers tell us.';
    const userMessage = `Campaign blast metrics: ${JSON.stringify(blast)}`;

    const analysis = await askClaude(systemPrompt, userMessage);
    res.json({ analysis });
  } catch (err) {
    console.error('Analyze campaign error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
