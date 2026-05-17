const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db/connection');
const { sendEmail } = require('../lib/sesClient');

const router = express.Router();

// Rate limit votes to 1 per IP per minute
const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  keyGenerator: (req) => req.ip
});

// GET /api/public/posts - list published posts
router.get('/posts', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const { rows } = await pool.query(
      `SELECT id, title, slug, content, published_at, created_at
       FROM heidi_posts
       WHERE published = true
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as count FROM heidi_posts WHERE published = true`
    );

    res.json({
      posts: rows,
      total: parseInt(countRows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('❌ Get posts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/posts/:slug - single post
router.get('/posts/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, slug, content, published_at, created_at
       FROM heidi_posts
       WHERE slug = $1 AND published = true`,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post: rows[0] });
  } catch (err) {
    console.error('❌ Get post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/polls - active polls with vote counts
router.get('/polls', async (req, res) => {
  try {
    const { rows: pollRows } = await pool.query(
      `SELECT id, question, options, active, closes_at, created_at
       FROM heidi_polls
       WHERE active = true
       ORDER BY created_at DESC`
    );

    // For each poll, count votes per option
    const pollsWithCounts = await Promise.all(
      pollRows.map(async (poll) => {
        const options = Array.isArray(poll.options) ? poll.options : poll.options ? JSON.parse(poll.options) : [];

        const voteCounts = await Promise.all(
          options.map((opt, idx) => {
            return pool.query(
              `SELECT COUNT(*) as count FROM poll_votes
               WHERE poll_id = $1 AND option_index = $2`,
              [poll.id, idx]
            ).then(res => parseInt(res.rows[0].count));
          })
        );

        return {
          ...poll,
          options: options.map((opt, idx) => ({
            text: opt,
            votes: voteCounts[idx] || 0
          }))
        };
      })
    );

    res.json({ polls: pollsWithCounts });
  } catch (err) {
    console.error('❌ Get polls error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/polls/:id/vote - cast a vote
router.post('/polls/:id/vote', voteLimiter, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const pollId = req.params.id;
    const voterIp = req.ip;

    if (optionIndex === undefined || optionIndex < 0) {
      return res.status(400).json({ error: 'Invalid option' });
    }

    // Check if this IP already voted
    const { rows: existingVote } = await pool.query(
      `SELECT id FROM poll_votes WHERE poll_id = $1 AND voter_ip = $2`,
      [pollId, voterIp]
    );

    if (existingVote.length > 0) {
      return res.status(400).json({ error: 'Already voted on this poll' });
    }

    // Record the vote
    const { rows } = await pool.query(
      `INSERT INTO poll_votes (poll_id, option_index, voter_ip)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [pollId, optionIndex, voterIp]
    );

    res.json({ success: true, voteId: rows[0].id });
  } catch (err) {
    console.error('❌ Vote error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/contact - contact/signup form
router.post('/contact', async (req, res) => {
  try {
    const { name, email, message, subscribeNewsletter } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // If they have a message, require name too
    if (message && !name) {
      return res.status(400).json({ error: 'Name required when submitting a message' });
    }

    // Store in email_subscribers with subscription status
    const customFields = { subscribed_at: new Date().toISOString() };
    if (name) customFields.name = name;
    if (message) customFields.message = message;

    const status = subscribeNewsletter ? 'active' : 'pending';

    await pool.query(
      `INSERT INTO email_subscribers (email, custom_fields, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET status = $3, custom_fields = $2`,
      [email, JSON.stringify(customFields), status]
    );

    // Send confirmation email
    const emailHtml = `
      <h2>Thank you for connecting with us!</h2>
      <p>Hi ${name || 'Supporter'},</p>
      ${message ? `<p><strong>Your message:</strong> ${message}</p>` : ''}
      ${subscribeNewsletter ? '<p>You\'ve been added to our newsletter. We\'ll keep you updated on campaign news!</p>' : ''}
      <hr/>
      <p>— Heidi Pacella Campaign</p>
    `;

    sendEmail(email, 'Thank you for supporting Heidi', emailHtml, '', 'heidi@hadleytrees.com')
      .catch(err => console.warn('⚠️ Failed to send confirmation:', err.message));

    res.json({ success: true, message: 'Thank you! You\'ve been added to our email list.' });
  } catch (err) {
    console.error('❌ Contact form error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/search - search published posts by title/content
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const { rows } = await pool.query(
      `SELECT id, title, slug, content, published_at, created_at
       FROM heidi_posts
       WHERE published = true AND (title ILIKE $1 OR content ILIKE $1)
       ORDER BY published_at DESC`,
      [`%${q}%`]
    );

    res.json({ results: rows, query: q, count: rows.length });
  } catch (err) {
    console.error('❌ Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
