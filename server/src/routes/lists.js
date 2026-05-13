const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { normalizeEmail } = require('../lib/sesClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function findEmailColumn(headers) {
  for (let h of headers) {
    const lc = h.toLowerCase();
    if (lc === 'email') return h;
  }
  for (let h of headers) {
    const lc = h.toLowerCase();
    if (lc === 'e-mail' || lc === 'email_address' || lc === 'emailaddress') return h;
  }
  return null;
}

function findPersonalizationColumns(headers) {
  const result = { firstName: null, lastName: null };
  for (let h of headers) {
    const lc = h.toLowerCase();
    if (!result.firstName && (lc === 'first_name' || lc === 'firstname' || lc === 'first')) {
      result.firstName = h;
    }
    if (!result.lastName && (lc === 'last_name' || lc === 'lastname' || lc === 'last')) {
      result.lastName = h;
    }
  }
  return result;
}

router.get('/', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT l.*, u.name as created_by_name FROM email_lists l LEFT JOIN users u ON l.created_by = u.id ORDER BY l.created_at DESC'
    );
    res.json({ lists: rows });
  } catch (err) {
    console.error('❌ Fetch lists error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

router.post('/', requireRole('admin', 'campaign_manager'), upload.single('file'), async (req, res) => {
  const { name } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'file is required' });
  }

  try {
    let records = [];
    const mimeType = req.file.mimetype;
    const filename = req.file.originalname.toLowerCase();

    if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
      records = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true });
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || filename.endsWith('.xlsx')) {
      const workbook = XLSX.read(req.file.buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ error: 'File must be CSV or Excel (.xlsx)' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'File contains no records' });
    }

    const headers = Object.keys(records[0]);
    const emailColumn = findEmailColumn(headers);
    if (!emailColumn) {
      return res.status(400).json({ error: 'No email column found' });
    }

    const personalization = findPersonalizationColumns(headers);
    const customColumns = headers.filter(h => {
      const lc = h.toLowerCase();
      return lc !== emailColumn.toLowerCase() && lc !== 'email' &&
             lc !== 'first_name' && lc !== 'firstname' && lc !== 'first' &&
             lc !== 'last_name' && lc !== 'lastname' && lc !== 'last' &&
             lc !== 'e-mail' && lc !== 'email_address' && lc !== 'emailaddress';
    });

    let validRecords = [];
    let invalidCount = 0;

    records.forEach((record) => {
      const email = record[emailColumn];
      const normalized = normalizeEmail(email);
      if (normalized) {
        const customFields = {};
        customColumns.forEach(col => {
          if (record[col] !== undefined && record[col] !== null && record[col] !== '') {
            customFields[col] = record[col];
          }
        });

        validRecords.push({
          email: normalized,
          firstName: personalization.firstName ? (record[personalization.firstName] || '') : '',
          lastName: personalization.lastName ? (record[personalization.lastName] || '') : '',
          customFields: Object.keys(customFields).length > 0 ? customFields : null
        });
      } else {
        invalidCount++;
      }
    });

    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid email addresses in file' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const listResult = await client.query(
        'INSERT INTO email_lists (name, created_by, subscriber_count) VALUES ($1, $2, $3) RETURNING id',
        [name.trim(), req.user.id, validRecords.length]
      );
      const listId = listResult.rows[0].id;

      if (validRecords.length > 0) {
        const valuesList = validRecords
          .map((_, i) => `($1, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`)
          .join(',');

        const params = [listId];
        validRecords.forEach((record) => {
          params.push(record.email, record.firstName || null, record.lastName || null, record.customFields ? JSON.stringify(record.customFields) : null);
        });

        await client.query(
          `INSERT INTO email_subscribers (list_id, email, first_name, last_name, custom_fields) VALUES ${valuesList} ON CONFLICT (list_id, email) DO NOTHING`,
          params
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        listId,
        name: name.trim(),
        subscriberCount: validRecords.length,
        invalid: invalidCount
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ List creation error:', err.message);
    res.status(500).json({ error: `List creation failed: ${err.message}` });
  }
});

router.get('/:id/subscribers', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    let whereConditions = ['list_id = $1'];
    let paramIndex = 2;
    const params = [id];

    if (req.query.status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(req.query.status);
      paramIndex++;
    }

    if (req.query.email_contains) {
      whereConditions.push(`email ILIKE $${paramIndex}`);
      params.push(`%${req.query.email_contains}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, custom_fields, status, created_at FROM email_subscribers WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM email_subscribers WHERE ${whereClause}`,
      params.slice(0, -2)
    );
    const total = parseInt(countResult.rows[0].total);

    res.json({
      subscribers: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('❌ Fetch subscribers error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

router.post('/:id/segments', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, conditions } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({ error: 'conditions is required and must be non-empty array' });
    }

    const { rows } = await pool.query(
      'INSERT INTO email_segments (list_id, name, conditions, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name.trim(), JSON.stringify(conditions), req.user.id]
    );

    res.json({ segment: rows[0] });
  } catch (err) {
    console.error('❌ Create segment error:', err.message);
    res.status(500).json({ error: `Segment creation failed: ${err.message}` });
  }
});

router.get('/:id/segments', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT s.*, u.name as created_by_name FROM email_segments s LEFT JOIN users u ON s.created_by = u.id WHERE s.list_id = $1 ORDER BY s.created_at DESC',
      [id]
    );

    res.json({ segments: rows });
  } catch (err) {
    console.error('❌ Fetch segments error:', err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

router.delete('/:id/segments/:sid', requireRole('admin', 'campaign_manager'), async (req, res) => {
  try {
    const { id, sid } = req.params;

    const { rows } = await pool.query(
      'DELETE FROM email_segments WHERE id = $1 AND list_id = $2 RETURNING id',
      [sid, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({ success: true, segmentId: sid });
  } catch (err) {
    console.error('❌ Delete segment error:', err.message);
    res.status(500).json({ error: `Delete failed: ${err.message}` });
  }
});

module.exports = router;
