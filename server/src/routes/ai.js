const express = require('express');
const { askClaude } = require('../lib/aiClient');
const { requireApiAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Health check endpoint (no auth required, no token usage)
router.get('/health', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isConfigured = !!apiKey && apiKey.length > 0;

    res.json({
      status: isConfigured ? 'ok' : 'unconfigured',
      configured: isConfigured,
      hasApiKey: isConfigured,
      message: isConfigured ? 'Claude API ready' : 'API key not configured',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// All endpoints below require a valid session or JWT, then an admin/campaign_manager role
router.use(requireApiAuth, requireRole('admin', 'campaign_manager'));

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

router.post('/website-chat', async (req, res) => {
  try {
    const { instruction, currentContent } = req.body;
    if (!instruction) return res.status(400).json({ error: 'Instruction required' });

    const systemPrompt = `You are a website content editor for Heidi Pacella's 2027 Homer Glen mayoral campaign.

The website has these editable fields (use exact dot-notation keys):
- hero.headline — main hero heading
- hero.subtext — hero paragraph below the heading
- about.para1, about.para2, about.para3 — the three About Heidi paragraphs
- platform[0].title, platform[0].text — first platform pillar
- platform[1].title, platform[1].text — second platform pillar
- platform[2].title, platform[2].text — third platform pillar
- cta.headline — call-to-action section heading
- cta.text — call-to-action paragraph

Campaign tone rules:
- Positive, community-focused messaging only — never attack or mention opponents
- Emphasize historic preservation, open land, natural character of Homer Glen
- Homer Glen motto: "Community and Nature in Harmony"
- Professional but warm and approachable tone
- Keep text concise — headlines under 10 words, paragraphs under 60 words

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"changes": [{"key": "hero.headline", "value": "new text"}], "message": "Brief plain-English explanation of what you changed and why"}
Only include fields that actually need to change.`;

    const userMessage = `Current content:\n${JSON.stringify(currentContent, null, 2)}\n\nInstruction: ${instruction}`;

    let response = await askClaude(systemPrompt, userMessage);
    response = response.trim();
    if (response.startsWith('```')) {
      response = response.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(response);
    res.json(parsed);
  } catch (err) {
    console.error('Website chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
