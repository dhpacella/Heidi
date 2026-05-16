const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const pool = require('../db/connection');
const { requireRole } = require('../middleware/auth');
const { publishVoterRegistered } = require('../lib/eventBridgeClient');
const { uploadFile } = require('../lib/s3Client');
const { putMetric } = require('../lib/cloudwatchClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const MAX_LIMIT = 50000;

function findColumns(headers) {
  const result = { firstName: null, lastName: null, email: null, phone: null, precinctId: null, party: null };
  for (let h of headers) {
    const lc = h.toLowerCase();
    if (!result.firstName && (lc === 'first_name' || lc === 'firstname' || lc === 'first')) result.firstName = h;
    if (!result.lastName && (lc === 'last_name' || lc === 'lastname' || lc === 'last')) result.lastName = h;
    if (!result.email && (lc === 'email' || lc === 'e-mail' || lc === 'email_address')) result.email = h;
    if (!result.phone && (lc === 'phone' || lc === 'phone_number' || lc === 'phonenumber')) result.phone = h;
    if (!result.precinctId && (lc === 'precinct_id' || lc === 'precinct' || lc === 'precinctid')) result.precinctId = h;
    if (!result.party && (lc === 'party' || lc === 'party_affiliation' || lc === 'partyaffiliation')) result.party = h;
  }
  return result;
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requested = parseInt(query.limit, 10) || 50;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildVoterFilters(query) {
  const conditions = [];
  const params = [];

  if (query.precinct) {
    params.push(parseInt(query.precinct, 10));
    conditions.push(`v.precinct_id = $${params.length}`);
  }
  if (query.party) {
    params.push(query.party);
    conditions.push(`v.party_affiliation = $${params.length}`);
  }
  if (query.votedInYears) {
    const years = parseInt(query.votedInYears, 10);
    if (!Number.isNaN(years)) {
      params.push(years);
      conditions.push(`EXISTS (
        SELECT 1 FROM voting_history vh
        WHERE vh.voter_id = v.id
          AND vh.voted = true
          AND vh.election_year >= EXTRACT(YEAR FROM CURRENT_DATE)::int - $${params.length}
      )`);
    }
  }
  if (query.name) {
    params.push(`%${query.name}%`);
    conditions.push(`(v.first_name ILIKE $${params.length} OR v.last_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return { where, params };
}

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { where, params } = buildVoterFilters(req.query);

    const countSql = `SELECT COUNT(*)::int AS total FROM voters v ${where}`;
    const listSql = `
      SELECT v.id, v.first_name, v.last_name, v.email, v.phone, v.address,
             v.precinct_id, p.name AS precinct_name, v.party_affiliation,
             v.registration_date
      FROM voters v
      LEFT JOIN precincts p ON p.id = v.precinct_id
      ${where}
      ORDER BY v.last_name, v.first_name
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [countRes, listRes] = await Promise.all([
      pool.query(countSql, params),
      pool.query(listSql, [...params, limit, offset])
    ]);

    res.json({
      voters: listRes.rows,
      total: countRes.rows[0].total,
      page,
      limit
    });
  } catch (err) {
    console.error('Voters list error:', err);
    res.status(500).json({ error: 'Failed to load voters' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid voter id' });

    const voterRes = await pool.query(
      `SELECT v.*, p.name AS precinct_name
       FROM voters v LEFT JOIN precincts p ON p.id = v.precinct_id
       WHERE v.id = $1`,
      [id]
    );
    if (voterRes.rows.length === 0) return res.status(404).json({ error: 'Voter not found' });

    const [historyRes, canvassRes] = await Promise.all([
      pool.query(
        `SELECT id, election_year, election_type, voted, party_voted, election_date
         FROM voting_history WHERE voter_id = $1
         ORDER BY election_year DESC, election_date DESC NULLS LAST`,
        [id]
      ),
      pool.query(
        `SELECT id, activity_type, notes, contact_result, created_at, created_by
         FROM canvassing_activities WHERE voter_id = $1
         ORDER BY created_at DESC LIMIT 25`,
        [id]
      )
    ]);

    res.json({
      voter: voterRes.rows[0],
      votingHistory: historyRes.rows,
      recentCanvassing: canvassRes.rows
    });
  } catch (err) {
    console.error('Voter get error:', err);
    res.status(500).json({ error: 'Failed to load voter' });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      firstName, lastName, email, phone, address,
      precinctId, precinctName, partyAffiliation, registrationDate
    } = req.body || {};

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    await client.query('BEGIN');

    let resolvedPrecinctId = precinctId ? parseInt(precinctId, 10) : null;
    if (!resolvedPrecinctId && precinctName) {
      const precinctRes = await client.query(
        `INSERT INTO precincts (name, precinct_code)
         VALUES ($1, $1)
         ON CONFLICT (precinct_code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [precinctName]
      );
      resolvedPrecinctId = precinctRes.rows[0].id;
    }

    const insertRes = await client.query(
      `INSERT INTO voters
        (first_name, last_name, email, phone, address, precinct_id, party_affiliation, registration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, first_name, last_name, email, phone, address,
                 precinct_id, party_affiliation, registration_date`,
      [firstName, lastName, email || null, phone || null, address || null,
       resolvedPrecinctId, partyAffiliation || null, registrationDate || null]
    );

    await client.query('COMMIT');

    const voter = insertRes.rows[0];
    res.status(201).json({ voter });

    // Publish voter.registered event to EventBridge (async, non-blocking)
    try {
      await publishVoterRegistered(voter.id, voter.email, voter.first_name, voter.last_name, voter.precinct_id);
    } catch (err) {
      console.warn('⚠️ Failed to publish voter.registered event:', err.message);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Voter create error:', err);
    res.status(500).json({ error: 'Failed to create voter' });
  } finally {
    client.release();
  }
});

router.post('/import', requireRole('admin', 'campaign_manager'), upload.single('file'), async (req, res) => {
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
    const columns = findColumns(headers);

    if (!columns.firstName || !columns.lastName) {
      return res.status(400).json({ error: 'File must contain first_name and last_name columns' });
    }

    let validRecords = [];
    let skippedCount = 0;

    records.forEach((record) => {
      const firstName = record[columns.firstName];
      const lastName = record[columns.lastName];

      if (firstName && lastName) {
        validRecords.push({
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          email: record[columns.email] ? String(record[columns.email]).trim().toLowerCase() : null,
          phone: record[columns.phone] ? String(record[columns.phone]).trim() : null,
          precinctId: record[columns.precinctId] ? parseInt(record[columns.precinctId], 10) : null,
          party: record[columns.party] ? String(record[columns.party]).trim() : null
        });
      } else {
        skippedCount++;
      }
    });

    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid records in file (need first_name and last_name)' });
    }

    const client = await pool.connect();
    let importedCount = 0;
    try {
      await client.query('BEGIN');

      for (const record of validRecords) {
        try {
          await client.query(
            `INSERT INTO voters (first_name, last_name, email, phone, precinct_id, party_affiliation)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (email) DO NOTHING`,
            [record.firstName, record.lastName, record.email, record.phone, record.precinctId, record.party]
          );
          importedCount++;
        } catch (err) {
          console.warn(`⚠️ Failed to import voter ${record.firstName} ${record.lastName}:`, err.message);
        }
      }

      await client.query('COMMIT');

      // Archive file to S3 (async, non-blocking)
      try {
        const fileKey = `voter-uploads/${Date.now()}-${req.file.originalname}`;
        await uploadFile(fileKey, req.file.buffer, req.file.mimetype);
        console.log(`✅ Archived voter CSV to S3: ${fileKey}`);
      } catch (err) {
        console.warn(`⚠️ Failed to archive file to S3: ${err.message}`);
      }

      await putMetric('VoterImportCount', importedCount);

      res.json({
        success: true,
        imported: importedCount,
        skipped: skippedCount,
        total: validRecords.length
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Voter import error:', err);
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { format = 'csv', filters = {} } = req.body || {};
    if (format !== 'csv') {
      return res.status(400).json({ error: 'Only CSV export is supported in Phase 1' });
    }

    const { where, params } = buildVoterFilters(filters);
    const sql = `
      SELECT v.id, v.first_name, v.last_name, v.email, v.phone, v.address,
             p.name AS precinct_name, v.party_affiliation, v.registration_date
      FROM voters v
      LEFT JOIN precincts p ON p.id = v.precinct_id
      ${where}
      ORDER BY v.last_name, v.first_name
    `;
    const { rows } = await pool.query(sql, params);

    const header = ['id','first_name','last_name','email','phone','address','precinct','party','registration_date'];
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.id, r.first_name, r.last_name, r.email, r.phone, r.address,
        r.precinct_name, r.party_affiliation,
        r.registration_date ? new Date(r.registration_date).toISOString().slice(0, 10) : ''
      ].map(escape).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="voters_${Date.now()}.csv"`);
    res.send(lines.join('\r\n'));
  } catch (err) {
    console.error('Voter export error:', err);
    res.status(500).json({ error: 'Failed to export voters' });
  }
});

module.exports = router;
