const express = require('express');
const { askClaude } = require('../lib/aiClient');
const { requireApiAuth } = require('../middleware/auth');
const pool = require('../db/connection');

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
      message: isConfigured ? 'Claude Assistant ready' : 'API key not configured',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get campaign context for Claude
async function getCampaignContext(userId) {
  try {
    const stats = await Promise.all([
      // Get email stats
      pool.query(`
        SELECT COUNT(*) as total_sent,
               COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
               COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as total_clicked
        FROM email_recipients
      `),
      // Get volunteer stats
      pool.query(`
        SELECT COUNT(*) as total_volunteers,
               SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_volunteers
        FROM volunteers
      `),
      // Get voter count
      pool.query(`SELECT COUNT(*) as total_voters FROM voters`),
      // Get recent campaign
      pool.query(`
        SELECT subject, recipient_count, status
        FROM email_blasts
        ORDER BY created_at DESC
        LIMIT 1
      `)
    ]);

    return {
      email: {
        totalSent: stats[0].rows[0]?.total_sent || 0,
        totalOpened: stats[0].rows[0]?.total_opened || 0,
        totalClicked: stats[0].rows[0]?.total_clicked || 0,
        openRate: stats[0].rows[0]?.total_sent ?
          ((stats[0].rows[0]?.total_opened || 0) / (stats[0].rows[0]?.total_sent || 1) * 100).toFixed(1) : 0
      },
      volunteers: {
        total: stats[1].rows[0]?.total_volunteers || 0,
        active: stats[1].rows[0]?.active_volunteers || 0
      },
      voters: {
        total: stats[2].rows[0]?.total_voters || 0
      },
      recentCampaign: stats[3].rows[0] || null
    };
  } catch (err) {
    console.warn('Failed to get campaign context:', err.message);
    return { email: {}, volunteers: {}, voters: {}, recentCampaign: null };
  }
}

// Chat endpoint
router.post('/chat', requireApiAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Get campaign context for smarter responses
    const context = await getCampaignContext(req.user.id);

    // Build system prompt with context
    const systemPrompt = `You are Claude, an AI assistant for the Heidi Voter Dashboard - a campaign management platform for voter outreach.

CURRENT CAMPAIGN DATA:
- Total Emails Sent: ${context.email.totalSent}
- Email Open Rate: ${context.email.openRate}%
- Total Volunteers: ${context.volunteers.total} (${context.volunteers.active} active)
- Total Voters: ${context.voters.total}
${context.recentCampaign ? `- Latest Campaign: "${context.recentCampaign.subject}" (${context.recentCampaign.status})` : ''}

You help campaign managers with:
1. 📝 Campaign strategy & best practices
2. 💬 Feature explanations and how-to help
3. 🎯 Specific tips for volunteers, emails, and voter outreach
4. 📊 Analysis of their campaign data and insights

Be conversational, helpful, and action-oriented. Provide specific, practical advice. Reference their actual data when relevant.

FEATURES TO HELP WITH:
- Email Campaigns: compose, send, schedule, templates, personalization tokens {first_name}, {last_name}, {email}
- SMS Campaigns: send bulk SMS, track responses
- Voter Management: import voters, filter by party/precinct, assign to volunteers
- Volunteer Management: assign voters, track progress, view leaderboard
- Analytics: campaign stats, email opens/clicks, volunteer performance
- AI Email Tools: generate emails, suggest subjects, improve content

Keep responses concise (2-3 sentences usually). Be encouraging about their campaign efforts.`;

    const response = await askClaude(systemPrompt, message);

    res.json({
      message: response,
      context: {
        openRate: context.email.openRate,
        volunteers: context.volunteers.active,
        voters: context.voters.total
      }
    });
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'Failed to process your message' });
  }
});

module.exports = router;
