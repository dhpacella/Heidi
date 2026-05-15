// In-memory mock database for local development (when RDS is unreachable)

const mockData = {
  users: [
    {
      id: 1,
      email: 'admin@test.com',
      name: 'Admin User',
      password_hash: '$2a$12$IOTHd2yBlSpItrE9VkLEIe5e3LOnOtnI.BfHiQtQQjCrMvroxSdoC',
      role: 'admin',
      created_at: new Date().toISOString()
    }
  ],
  voters: [],
  email_blasts: [],
  sms_blasts: [],
  email_lists: [],
  email_subscribers: []
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
      const [email, name, password_hash, role] = params;
      const user = {
        id: mockData.users.length + 1,
        email,
        name,
        password_hash,
        role: role || 'staff',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockData.users.push(user);
      return { rows: [{ id: user.id }], rowCount: 1 };
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

    // SELECT FROM email_blasts
    if (sql.includes('SELECT') && sql.includes('email_blasts')) {
      return { rows: mockData.email_blasts.slice(0, params[0] || 50) };
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

    // UPDATE
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
