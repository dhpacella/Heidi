// In-memory mock database for local development (when RDS is unreachable)

const mockData = {
  users: [
    {
      id: 1,
      email: 'admin@heidiformayor.com',
      name: 'Admin',
      password_hash: '$2a$12$w4jSSEkXfpjndiJHEpV0t.XEkNTxWdgt9XTXU.vzozHYX8kNiz.7e',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  precincts: [
    { id: 1, name: 'Precinct 1' },
    { id: 2, name: 'Precinct 2' },
    { id: 3, name: 'Precinct 3' },
    { id: 4, name: 'Precinct 4' },
  ],
  voters: [],
  email_blasts: [],
  sms_blasts: [],
  email_lists: [],
  email_subscribers: [],
  email_templates: [],
  email_recipients: [],
  heidi_posts: [],
  heidi_polls: [
    {
      id: 1,
      question: 'Do you think LPR\'s (License Plate Readers), aka "Flock" cameras, are necessary in Homer Glen, Illinois?',
      options: ['Yes', 'No', "I don't know"],
      active: true,
      closes_at: null,
      created_at: new Date().toISOString()
    }
  ],
  poll_votes: [],
  system_logs: []
};

const pool = {
  query: async (sql, params = []) => {
    // Mock implementation for common queries
    console.log('[MOCK DB]', sql.substring(0, 50) + '...');

    // SELECT COUNT(*) as count FROM users WHERE email = $1
    if (sql.includes('COUNT') && sql.includes('users') && sql.includes('email')) {
      return {
        rows: [{ count: mockData.users.filter(u => u.email === params[0]).length }]
      };
    }

    // SELECT * FROM users WHERE email = $1
    if (sql.includes('SELECT') && sql.includes('users') && sql.includes('email')) {
      return {
        rows: mockData.users.filter(u => u.email === params[0])
      };
    }

    // INSERT INTO users
    if (sql.includes('INSERT INTO users')) {
      const columnMatch = sql.match(/INSERT INTO users \((.*?)\)/i);
      const columns = columnMatch ? columnMatch[1].split(',').map(c => c.trim()) : [];
      const user = {
        id: mockData.users.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      columns.forEach((col, i) => {
        user[col] = params[i];
      });
      user.role = user.role || 'staff';
      mockData.users.push(user);
      const returningMatch = sql.match(/RETURNING\s+(.*?)(?:;|$)/i);
      const returning = returningMatch ? returningMatch[1].split(',').map(c => c.trim()) : [];
      const returnRow = {};
      returning.forEach(col => {
        returnRow[col] = user[col];
      });
      return { rows: returning.length > 0 ? [returnRow] : [{ id: user.id }], rowCount: 1 };
    }

    // DELETE FROM users
    if (sql.includes('DELETE FROM users')) {
      mockData.users = mockData.users.filter(u => u.email !== params[0]);
      return { rowCount: 1 };
    }

    // INSERT INTO email_blasts
    if (sql.includes('INSERT INTO email_blasts')) {
      const blast = {
        id: Math.random().toString(36).substr(2, 9),
        ...Object.fromEntries(
          sql.match(/\$\d+/g).map((m, i) => [
            sql.split('(')[1].split(')')[0].split(',')[i].trim(),
            params[i]
          ])
        )
      };
      mockData.email_blasts.push(blast);
      return { rows: [{ id: blast.id }], rowCount: 1 };
    }

    // SELECT FROM email_blasts (with recipient aggregates for /api/email/blasts)
    if (sql.includes('SELECT') && sql.includes('email_blasts')) {
      const blasts = mockData.email_blasts.slice(0, params[0] || 50);
      // If query has COUNT aggregates (JOIN with email_recipients), calculate them
      if (sql.includes('COUNT') && sql.includes('email_recipients')) {
        return {
          rows: blasts.map(blast => {
            const recipients = mockData.email_recipients.filter(r => r.blast_id === blast.id);
            return {
              ...blast,
              opened_count: recipients.filter(r => r.opened_at).length,
              clicked_count: recipients.filter(r => r.clicked_at).length,
              bounced_count: recipients.filter(r => r.bounced_at).length,
              complained_count: recipients.filter(r => r.complained_at).length,
              unsubscribed_count: recipients.filter(r => r.unsubscribed_at).length,
              delivered_count: recipients.filter(r => r.delivered_at).length
            };
          })
        };
      }
      return { rows: blasts };
    }

    // INSERT INTO sms_blasts
    if (sql.includes('INSERT INTO sms_blasts')) {
      const blast = {
        id: Math.random().toString(36).substr(2, 9),
        sender_id: params[0],
        message: params[1],
        recipient_count: params[2],
        parts_per_message: params[3],
        total_cost: params[4],
        status: params[5] || 'queued',
        created_at: new Date().toISOString()
      };
      mockData.sms_blasts.push(blast);
      return { rows: [{ id: blast.id }], rowCount: 1 };
    }

    // SELECT FROM sms_blasts
    if (sql.includes('SELECT') && sql.includes('sms_blasts')) {
      return { rows: mockData.sms_blasts.slice(0, params[0] || 50) };
    }

    // INSERT INTO email_templates
    if (sql.includes('INSERT INTO email_templates')) {
      const template = {
        id: mockData.email_templates.length + 1,
        user_id: params[0],
        name: params[1],
        subject: params[2],
        html_body: params[3],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.email_templates.push(template);
      const returningMatch = sql.match(/RETURNING\s+(.*?)(?:;|$)/i);
      const returning = returningMatch ? returningMatch[1].split(',').map(c => c.trim()) : [];
      const returnRow = {};
      returning.forEach(col => {
        returnRow[col] = template[col];
      });
      return { rows: returning.length > 0 ? [returnRow] : [{ id: template.id }], rowCount: 1 };
    }

    // SELECT FROM email_templates
    if (sql.includes('SELECT') && sql.includes('email_templates') && sql.includes('WHERE')) {
      return { rows: mockData.email_templates.filter(t => t.user_id === params[0]) };
    }

    // DELETE FROM email_templates
    if (sql.includes('DELETE FROM email_templates')) {
      const initialLength = mockData.email_templates.length;
      mockData.email_templates = mockData.email_templates.filter(t => !(t.id === parseInt(params[0]) && t.user_id === params[1]));
      return { rowCount: initialLength - mockData.email_templates.length };
    }

    // INSERT INTO email_recipients (with UNNEST for bulk insert)
    if (sql.includes('INSERT INTO email_recipients')) {
      const blastId = params[0];
      const emails = Array.isArray(params[1]) ? params[1] : [params[1]];
      const firstNames = Array.isArray(params[2]) ? params[2] : [params[2]];
      const lastNames = Array.isArray(params[3]) ? params[3] : [params[3]];

      for (let i = 0; i < emails.length; i++) {
        mockData.email_recipients.push({
          id: mockData.email_recipients.length + 1,
          blast_id: blastId,
          email: emails[i],
          first_name: firstNames[i] || '',
          last_name: lastNames[i] || '',
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }
      return { rowCount: emails.length };
    }

    // SELECT FROM email_recipients (with LIMIT/OFFSET for pagination)
    if (sql.includes('SELECT') && sql.includes('email_recipients')) {
      let results = mockData.email_recipients.filter(r => r.blast_id === params[0]);

      // Handle paginated queries: WHERE blast_id = $1 AND status = $2 LIMIT $3 OFFSET $4
      if (sql.includes('LIMIT') && sql.includes('OFFSET') && params.length >= 4) {
        const limit = params[2];
        const offset = params[3];
        results = results.slice(offset, offset + limit);
      }
      // Handle status filter: WHERE blast_id = $1 AND status = $2
      else if (sql.includes('AND status') && params.length >= 2) {
        results = results.filter(r => r.status === params[1]);
      }

      return { rows: results };
    }

    // UPDATE email_recipients SET ses_message_id = $1, status = $2 WHERE id = $3
    if (sql.includes('UPDATE email_recipients') && sql.includes('ses_message_id')) {
      const recipientId = params[2];
      const recipient = mockData.email_recipients.find(r => r.id === recipientId);
      if (recipient) {
        recipient.ses_message_id = params[0];
        recipient.status = params[1];
      }
      return { rowCount: recipient ? 1 : 0 };
    }

    // SELECT * FROM heidi_posts WHERE published = true ORDER BY published_at DESC
    if (sql.includes('SELECT') && sql.includes('heidi_posts') && sql.includes('published')) {
      return {
        rows: mockData.heidi_posts.filter(p => p.published).sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      };
    }

    // SELECT * FROM heidi_posts WHERE published = true AND (title ILIKE $1 OR content ILIKE $1)
    if (sql.includes('SELECT') && sql.includes('heidi_posts') && (sql.includes('ILIKE') || sql.includes('ilike'))) {
      const searchTerm = params[0].toLowerCase();
      return {
        rows: mockData.heidi_posts
          .filter(p => p.published && (p.title.toLowerCase().includes(searchTerm) || p.content.toLowerCase().includes(searchTerm)))
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      };
    }

    // SELECT * FROM heidi_posts WHERE slug = $1
    if (sql.includes('SELECT') && sql.includes('heidi_posts') && sql.includes('slug')) {
      return {
        rows: mockData.heidi_posts.filter(p => p.slug === params[0])
      };
    }

    // SELECT * FROM heidi_posts (all posts for admin)
    if (sql.includes('SELECT') && sql.includes('heidi_posts')) {
      return {
        rows: mockData.heidi_posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      };
    }

    // INSERT INTO heidi_posts
    if (sql.includes('INSERT INTO heidi_posts')) {
      const post = {
        id: mockData.heidi_posts.length + 1,
        title: params[0],
        slug: params[1],
        content: params[2],
        published: params[3] || false,
        published_at: params[4] || null,
        created_by: params[5] || 1,
        created_at: new Date().toISOString()
      };
      mockData.heidi_posts.push(post);
      return { rows: [{ id: post.id }], rowCount: 1 };
    }

    // UPDATE heidi_posts
    if (sql.includes('UPDATE heidi_posts')) {
      const postId = params[params.length - 1];
      const post = mockData.heidi_posts.find(p => p.id === postId);
      if (post) {
        if (sql.includes('published')) post.published = params[0];
        if (sql.includes('title')) post.title = params[0];
      }
      return { rowCount: post ? 1 : 0, rows: [post] };
    }

    // DELETE FROM heidi_posts
    if (sql.includes('DELETE FROM heidi_posts')) {
      const postId = params[0];
      const idx = mockData.heidi_posts.findIndex(p => p.id === postId);
      if (idx >= 0) mockData.heidi_posts.splice(idx, 1);
      return { rowCount: idx >= 0 ? 1 : 0 };
    }

    // COUNT voters
    if (sql.includes('COUNT') && sql.includes('voters')) {
      return { rows: [{ total: mockData.voters.length }] };
    }

    // SELECT voters (with optional JOIN precincts)
    if (sql.includes('FROM voters')) {
      const limit  = params[params.length - 2] || 50;
      const offset = params[params.length - 1] || 0;
      const rows = mockData.voters.slice(offset, offset + limit).map(v => ({
        ...v,
        precinct_name: (mockData.precincts.find(p => p.id === v.precinct_id) || {}).name || null
      }));
      return { rows };
    }

    // SELECT precincts
    if (sql.includes('FROM precincts') || (sql.includes('SELECT') && sql.includes('precincts'))) {
      return { rows: mockData.precincts };
    }

    // SELECT * FROM heidi_polls WHERE active = true
    if (sql.includes('SELECT') && sql.includes('heidi_polls') && sql.includes('active')) {
      return {
        rows: mockData.heidi_polls.filter(p => p.active)
      };
    }

    // SELECT * FROM heidi_polls
    if (sql.includes('SELECT') && sql.includes('heidi_polls')) {
      return { rows: mockData.heidi_polls };
    }

    // INSERT INTO heidi_polls
    if (sql.includes('INSERT INTO heidi_polls')) {
      const poll = {
        id: mockData.heidi_polls.length + 1,
        question: params[0],
        options: params[1],
        active: params[2] || true,
        closes_at: params[3] || null,
        created_by: params[4] || 1,
        created_at: new Date().toISOString()
      };
      mockData.heidi_polls.push(poll);
      return { rows: [{ id: poll.id }], rowCount: 1 };
    }

    // INSERT INTO poll_votes
    if (sql.includes('INSERT INTO poll_votes')) {
      const vote = {
        id: mockData.poll_votes.length + 1,
        poll_id: params[0],
        option_index: params[1],
        voter_ip: params[2],
        created_at: new Date().toISOString()
      };
      mockData.poll_votes.push(vote);
      return { rows: [{ id: vote.id }], rowCount: 1 };
    }

    // SELECT COUNT(*) FROM poll_votes WHERE poll_id = $1 AND option_index = $2
    if (sql.includes('SELECT') && sql.includes('COUNT') && sql.includes('poll_votes')) {
      const count = mockData.poll_votes.filter(v => v.poll_id === params[0] && v.option_index === params[1]).length;
      return { rows: [{ count }] };
    }

    // INSERT INTO system_logs
    if (sql.includes('INSERT INTO system_logs')) {
      const log = {
        id: mockData.system_logs.length + 1,
        check_type: params[0],
        status: params[1],
        message: params[2],
        details: params[3] ? JSON.stringify(params[3]) : null,
        created_at: new Date().toISOString()
      };
      mockData.system_logs.push(log);
      return { rows: [{ id: log.id }], rowCount: 1 };
    }

    // SELECT FROM system_logs (with LIMIT/OFFSET for pagination)
    if (sql.includes('SELECT') && sql.includes('system_logs')) {
      let logs = mockData.system_logs.slice().reverse();
      if (sql.includes('LIMIT') && sql.includes('OFFSET')) {
        const limit = params[0] || 100;
        const offset = params[1] || 0;
        logs = logs.slice(offset, offset + limit);
      } else if (sql.includes('LIMIT')) {
        const limit = params[0] || 100;
        logs = logs.slice(0, limit);
      }
      return { rows: logs };
    }

    // Generic UPDATE
    if (sql.includes('UPDATE')) {
      return { rowCount: 1 };
    }

    // Default: return empty rows
    return { rows: [], rowCount: 0 };
  },

  connect: (callback) => {
    if (callback) callback(null, { query: pool.query, release: () => {} });
    return { query: pool.query, release: () => {} };
  },

  on: () => {},
  end: () => {}
};

function getAllData() {
  return mockData;
}

module.exports = pool;
module.exports.getAllData = getAllData;
module.exports.mockData = mockData;
