// In-memory mock database for local development (when RDS is unreachable)

const mockData = {
  users: [
    {
      id: 1,
      email: 'admin@test.com',
      name: 'Admin User',
      password_hash: '$2a$12$itGdR66PruLCz0EGeVQWK.ZH3s2.m5el.GiafivNZA0JsinA1R9vq',
      role: 'admin',
      created_at: new Date().toISOString()
    }
  ],
  voters: [],
  email_blasts: [],
  sms_blasts: [],
  email_lists: [],
  email_subscribers: [],
  email_templates: [],
  email_recipients: []
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
      const blast = { id: Math.random().toString(36).substr(2, 9) };
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

module.exports = pool;
