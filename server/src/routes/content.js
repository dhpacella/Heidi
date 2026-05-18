const express = require('express');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { askClaude } = require('../lib/aiClient');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const router = express.Router();

// Local dev: no auth required for content routes (not deployed to production)

// GET /api/content/pages - list all voter website pages
router.get('/pages', async (req, res) => {
  try {
    // Path: from server/src/routes/content.js -> voter-website/src/pages
    const pagesDir = path.join(__dirname, '../../../voter-website/src/pages');

    // Read all .js files in pages directory
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js') && !f.endsWith('.archived'));

    // Convert filenames to page objects
    const pages = files.map(file => {
      const name = file.replace('.js', '');
      const slug = name.toLowerCase();
      return {
        name,
        slug,
        route: `/${slug === 'home' ? '' : slug}`, // Home page has no prefix
        visible: true
      };
    });

    // Sort pages: Home first, then alphabetically
    pages.sort((a, b) => {
      if (a.slug === 'home') return -1;
      if (b.slug === 'home') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ pages });
  } catch (err) {
    console.error('❌ Get pages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/posts - list all posts (admin)
router.get('/posts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, slug, content, published, published_at, created_by, created_at
       FROM heidi_posts
       ORDER BY created_at DESC`
    );
    res.json({ posts: rows });
  } catch (err) {
    console.error('❌ Get posts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/posts - create post
router.post('/posts', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { rows } = await pool.query(
      `INSERT INTO heidi_posts (title, slug, content, published, created_by)
       VALUES ($1, $2, $3, false, $4)
       RETURNING id, title, slug, content, published, created_at`,
      [title, slug, content, req.user.id]
    );

    res.status(201).json({ post: rows[0] });
  } catch (err) {
    console.error('❌ Create post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/content/posts/:id - edit post
router.put('/posts/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const postId = req.params.id;

    if (!title && !content) {
      return res.status(400).json({ error: 'Provide title or content to update' });
    }

    let updateClauses = [];
    let params = [];

    if (title) {
      updateClauses.push(`title = $${params.length + 1}`);
      params.push(title);
    }

    if (content) {
      updateClauses.push(`content = $${params.length + 1}`);
      params.push(content);
    }

    updateClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(postId);

    const { rows } = await pool.query(
      `UPDATE heidi_posts SET ${updateClauses.join(', ')} WHERE id = $${params.length}
       RETURNING id, title, slug, content, published, created_at`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post: rows[0] });
  } catch (err) {
    console.error('❌ Update post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/posts/:id/publish - toggle publish
router.post('/posts/:id/publish', async (req, res) => {
  try {
    const postId = req.params.id;
    const { published } = req.body;

    if (typeof published !== 'boolean') {
      return res.status(400).json({ error: 'Published must be true or false' });
    }

    const { rows } = await pool.query(
      `UPDATE heidi_posts
       SET published = $1, published_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $2
       RETURNING id, title, published, published_at`,
      [published, postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post: rows[0] });
  } catch (err) {
    console.error('❌ Publish post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/content/posts/:id
router.delete('/posts/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM heidi_posts WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Delete post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/polls - list all polls (admin)
router.get('/polls', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, question, options, active, closes_at, created_at
       FROM heidi_polls
       ORDER BY created_at DESC`
    );
    res.json({ polls: rows });
  } catch (err) {
    console.error('❌ Get polls error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/polls - create poll
router.post('/polls', async (req, res) => {
  try {
    const { question, options } = req.body;

    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO heidi_polls (question, options, active, created_by)
       VALUES ($1, $2, true, $3)
       RETURNING id, question, options, active, created_at`,
      [question, JSON.stringify(options), req.user.id]
    );

    res.status(201).json({ poll: rows[0] });
  } catch (err) {
    console.error('❌ Create poll error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/content/polls/:id
router.delete('/polls/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM heidi_polls WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Poll not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Delete poll error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/content/polls/:id - toggle active
router.patch('/polls/:id', async (req, res) => {
  try {
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be true or false' });
    const { rows } = await pool.query(
      'UPDATE heidi_polls SET active = $1 WHERE id = $2 RETURNING id, question, active',
      [active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Poll not found' });
    res.json({ poll: rows[0] });
  } catch (err) {
    console.error('❌ Toggle poll error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/generate-post - use Claude to draft a post
router.post('/generate-post', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // Get campaign context
    const { rows: voterRows } = await pool.query('SELECT COUNT(*) as count FROM voters');
    const { rows: volunteerRows } = await pool.query('SELECT COUNT(*) as count FROM volunteers');
    const { rows: emailRows } = await pool.query(
      `SELECT COUNT(*) as count FROM email_blasts WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    const systemPrompt = `You are a campaign communications expert for Heidi Pacella's
Homer Glen campaign. Write professional, engaging posts about community issues,
open space preservation, and voter engagement. Keep tone optimistic and action-oriented.`;

    const userMessage = `
Campaign Context:
- Total voters: ${voterRows[0].count}
- Active volunteers: ${volunteerRows[0].count}
- Recent email campaigns (7 days): ${emailRows[0].count}

Generate a campaign post about: ${prompt}
`;

    const generatedPost = await askClaude(systemPrompt, userMessage);

    res.json({
      generatedPost,
      title: prompt.substring(0, 100)
    });
  } catch (err) {
    console.error('❌ Generate post error:', err.message);
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

// POST /api/content/generate-component - generate React component with Claude
router.post('/generate-component', async (req, res) => {
  try {
    const { prompt, template, targetPage } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const systemPrompt = `You are a React developer building components for Heidi Pacella's voter website.

HEIDI'S BRAND & CAMPAIGN:
- Candidate: Heidi Pacella for Homer Glen Village Trustee (2027 election)
- Core Message: Community-focused, grassroots environmental preservation
- Platform Issues:
  * Open Space & Environmental Protection — Preserve natural biomes, trees, farmland
  * Stop 143rd Street Widening — Oppose unnecessary infrastructure expansion
  * Support Small Business — Champion local family-run establishments
  * Historic/Farmland Preservation — Keep Homer Glen's agricultural character
  * Government Accountability — Transparent, professional, performance-focused leadership
- Tone: Optimistic, action-oriented, inclusive, community-centered (NOT corporate/salesy)

DESIGN RULES:
- Color Palette (REQUIRED):
  * navy: #0B1929 (backgrounds), gold: #F5A623 (CTAs/headings), green: #1DB87A (success/nature)
  * text: #EEF2F7 (body), muted: #8BA3BE (labels), border: #243D56 (dividers)
- Font: Barlow (regular for body, condensed for headings if needed)
- Use ONLY inline styles (React style objects), NO CSS files or Tailwind
- Responsive: Use clamp() for typography — fontSize: 'clamp(16px, 4vw, 24px)'
- React hooks OK (useState, useEffect) but keep components simple

RETURN:
- ONLY the complete, working React component code
- export default or named export
- No explanations, comments, or markdown
- Must render without external dependencies (except React)`;

    // Allow custom theme to override defaults
    const customTheme = req.body.theme ? JSON.stringify(req.body.theme) : 'null';
    const themeInjection = customTheme !== 'null' ? `
CUSTOM THEME (OVERRIDE):
${customTheme}` : '';

    const userMessage = `Generate a React component for: ${prompt}
Template type: ${template || 'custom'}
Target page: ${targetPage || 'custom'}${themeInjection}`;

    const component = await askClaude(systemPrompt, userMessage);

    res.json({ component });
  } catch (err) {
    console.error('❌ Generate component error:', err.message);
    res.status(500).json({ error: 'Failed to generate component' });
  }
});

// POST /api/content/seo-audit - audit page for SEO issues
router.post('/seo-audit', async (req, res) => {
  try {
    const { pageContent, pageTitle, targetKeywords } = req.body;

    if (!pageContent) {
      return res.status(400).json({ error: 'Page content required' });
    }

    const systemPrompt = `You are an SEO expert. Analyze the provided page content and return
a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "issues": [
    { "severity": "critical|warning|info", "title": "...", "description": "...", "fix": "..." }
  ],
  "metaSuggestions": {
    "title": "...",
    "description": "...",
    "keywords": ["..."]
  }
}
Return ONLY valid JSON, no other text.`;

    const userMessage = `Page Title: ${pageTitle || 'Untitled'}
Target Keywords: ${targetKeywords || 'none specified'}

Content:
${pageContent}`;

    const response = await askClaude(systemPrompt, userMessage);
    const audit = JSON.parse(response);

    res.json(audit);
  } catch (err) {
    console.error('❌ SEO audit error:', err.message);
    res.status(500).json({ error: 'Failed to audit page' });
  }
});

// POST /api/content/seo-suggestions - get SEO fix suggestions
router.post('/seo-suggestions', async (req, res) => {
  try {
    const { pageContent, targetKeywords } = req.body;

    if (!pageContent) {
      return res.status(400).json({ error: 'Page content required' });
    }

    const systemPrompt = `You are an SEO expert. Generate ready-to-use HTML meta tags and
structured data JSON-LD for the provided content. Return your response in this format:

<!-- Meta Tags -->
<meta name="description" content="..."/>
<meta name="keywords" content="..."/>
<meta name="og:title" content="..."/>
<meta name="og:description" content="..."/>

<!-- Structured Data -->
<script type="application/ld+json">
{ your JSON-LD here }
</script>`;

    const userMessage = `Target Keywords: ${targetKeywords || 'unspecified'}

Content to optimize:
${pageContent}`;

    const suggestions = await askClaude(systemPrompt, userMessage);

    res.json({ suggestions });
  } catch (err) {
    console.error('❌ SEO suggestions error:', err.message);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// GET /api/content/site-content - all site content for admin editor
router.get('/site-content', async (req, res) => {
  const DEFAULTS = {
    hero_headline: 'Heidi For Homer',
    hero_tagline: 'Preserving Open Space • Protecting Our Community',
    hero_subtext: "Fighting to save Homer Glen's trees, farmland, and character",
    about_para1: 'Heidi Pacella is an advocate for preserving open space and maintaining the assets of Homer Glen. With a degree in Psychology and minor in Creative Writing from DePaul University, she brings thoughtful leadership to community issues.',
    about_para2: "Growing up in a family business, Heidi understands the dedication required to build thriving operations and vibrant communities. She's committed to championing small, local establishments that give Homer Glen its unique character.",
    about_para3: "Heidi believes Homer Glen's greatest strengths lie in its environment and natural biomes. She opposes unnecessary infrastructure projects and fights to preserve our trees, farmland, and community character for future generations.",
    platform_0_title: '✓ Environmental Protection',
    platform_0_text: "Preserve Homer Glen's open spaces, natural habitats, and tree canopy. Oppose destructive infrastructure projects like the 143rd Street widening.",
    platform_1_title: '✓ Support Small Business',
    platform_1_text: 'Champion local, family-run businesses. Sustain the economic vitality that keeps Homer Glen vibrant and unique.',
    platform_2_title: '✓ Historic Preservation',
    platform_2_text: 'Protect farmland and community character. Keep Homer Glen a place where people move to preserve, not escape.',
    platform_3_title: '✓ Government Accountability',
    platform_3_text: 'Professional, performance-focused leadership. Transparent decision-making that serves the whole community, not special interests.',
    issue_0_icon: '🌳', issue_0_title: 'Open Space Protection', issue_0_desc: 'Preserve natural biomes & trees',
    issue_1_icon: '🛑', issue_1_title: 'Stop 143rd St Widening', issue_1_desc: 'Oppose unnecessary expansion',
    issue_2_icon: '🚜', issue_2_title: 'Preserve Farmland', issue_2_desc: 'Sustain agricultural heritage',
    issue_3_icon: '🏪', issue_3_title: 'Support Local Business', issue_3_desc: 'Champion small family businesses',
    cta_headline: 'Help Save Homer Glen',
    cta_text: 'Join us in fighting to preserve open space, protect our trees and farmland, and keep Homer Glen a place where the environment matters. Every voice counts.',
  };
  try {
    const { rows } = await pool.query('SELECT key, value FROM site_content');
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const c = { ...DEFAULTS, ...map };
    res.json({
      content: {
        hero: { headline: c.hero_headline, tagline: c.hero_tagline, subtext: c.hero_subtext },
        about: { para1: c.about_para1, para2: c.about_para2, para3: c.about_para3 },
        platform: [0,1,2,3].map(i => ({ title: c[`platform_${i}_title`], text: c[`platform_${i}_text`] })),
        issues: [0,1,2,3].map(i => ({ icon: c[`issue_${i}_icon`], title: c[`issue_${i}_title`], desc: c[`issue_${i}_desc`] })),
        cta: { headline: c.cta_headline, text: c.cta_text },
      }
    });
  } catch (err) {
    console.error('❌ Get site content error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/content/site-content - save site content edits
router.put('/site-content', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const pairs = [];
    const { hero, about, platform, issues, cta } = content;

    if (hero) {
      ['headline','tagline','subtext'].forEach(k => {
        if (hero[k] !== undefined) pairs.push([`hero_${k}`, hero[k]]);
      });
    }
    if (about) {
      ['para1','para2','para3'].forEach(k => {
        if (about[k] !== undefined) pairs.push([`about_${k}`, about[k]]);
      });
    }
    if (Array.isArray(platform)) {
      platform.forEach((p, i) => {
        if (p.title !== undefined) pairs.push([`platform_${i}_title`, p.title]);
        if (p.text !== undefined) pairs.push([`platform_${i}_text`, p.text]);
      });
    }
    if (Array.isArray(issues)) {
      issues.forEach((iss, i) => {
        if (iss.icon !== undefined) pairs.push([`issue_${i}_icon`, iss.icon]);
        if (iss.title !== undefined) pairs.push([`issue_${i}_title`, iss.title]);
        if (iss.desc !== undefined) pairs.push([`issue_${i}_desc`, iss.desc]);
      });
    }
    if (cta) {
      ['headline','text'].forEach(k => {
        if (cta[k] !== undefined) pairs.push([`cta_${k}`, cta[k]]);
      });
    }

    for (const [key, value] of pairs) {
      await pool.query(
        `INSERT INTO site_content (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }

    res.json({ success: true, updated: pairs.length });
  } catch (err) {
    console.error('❌ Update site content error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/subscribers - list all email subscribers
router.get('/subscribers', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, status, custom_fields, created_at
       FROM email_subscribers
       ORDER BY created_at DESC`
    );
    res.json({ subscribers: rows });
  } catch (err) {
    console.error('❌ Get subscribers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/content/subscribers/:id - remove subscriber
router.delete('/subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM email_subscribers WHERE id = $1', [id]);
    res.json({ success: true, message: 'Subscriber removed' });
  } catch (err) {
    console.error('❌ Delete subscriber error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/content/subscribers/:id - update subscriber status
router.patch('/subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'pending', 'unsubscribed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query('UPDATE email_subscribers SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: 'Subscriber updated' });
  } catch (err) {
    console.error('❌ Update subscriber error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Configure multer for image uploads
const uploadsDir = path.join(__dirname, '../../public/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const name = file.originalname.split('.')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, `${name}-${timestamp}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// POST /api/content/upload-image - upload an image
router.post('/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imageUrl = `/images/${req.file.filename}`;
    res.json({
      success: true,
      filename: req.file.filename,
      url: imageUrl,
      size: req.file.size
    });
  } catch (err) {
    console.error('❌ Image upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET /api/content/images - list all uploaded images
router.get('/images', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const images = files.map(filename => ({
      filename,
      url: `/images/${filename}`,
      size: fs.statSync(path.join(uploadsDir, filename)).size
    }));

    res.json({ images });
  } catch (err) {
    console.error('❌ List images error:', err.message);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// DELETE /api/content/images/:filename - delete an image
router.delete('/images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(uploadsDir, filename);

    // Prevent directory traversal
    if (!filepath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (err) {
    console.error('❌ Delete image error:', err.message);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// GET /api/content/export-site - export voter website as ZIP
router.get('/export-site', async (req, res) => {
  try {
    const voterWebsitePath = path.join(__dirname, '../../../voter-website/src');

    if (!fs.existsSync(voterWebsitePath)) {
      return res.status(404).json({ error: 'Voter website not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="heidi-voter-website.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err.message);
      res.status(500).json({ error: 'Failed to create archive' });
    });

    archive.pipe(res);
    archive.directory(voterWebsitePath, 'src');
    await archive.finalize();

    console.log('✅ Site exported as ZIP');
  } catch (err) {
    console.error('❌ Export site error:', err.message);
    res.status(500).json({ error: 'Failed to export site' });
  }
});

// DELETE /api/content/pages/:name - delete a page file
router.delete('/pages/:name', async (req, res) => {
  try {
    const pageName = req.params.name;
    const pageFile = path.join(__dirname, `../../../voter-website/src/pages/${pageName}.js`);

    // Safety check: ensure file is in pages directory
    const pagesDir = path.join(__dirname, '../../../voter-website/src/pages');
    if (!pageFile.startsWith(pagesDir)) {
      return res.status(403).json({ error: 'Invalid page name' });
    }

    if (!fs.existsSync(pageFile)) {
      return res.status(404).json({ error: 'Page not found' });
    }

    fs.unlinkSync(pageFile);
    console.log(`✅ Page deleted: ${pageName}`);
    res.json({ success: true, message: `${pageName} page deleted` });
  } catch (err) {
    console.error('❌ Delete page error:', err.message);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

module.exports = router;
