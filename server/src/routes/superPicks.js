const express = require('express');
const path = require('path');
const fs = require('fs');
const SuperPicksCalculator = require('../utils/superPicksCalculator');
const VoterImporter = require('../utils/voterImporter');
const WalklistImporter = require('../utils/walklistImporter');
const { getVotersWithHistory, insertVoterWithHistory } = require('../utils/voterRepo');
const pool = require('../db/connection');

const router = express.Router();
const superPicksCalc = new SuperPicksCalculator();

router.get('/', async (req, res) => {
  try {
    const { minScore = 70, limit = 100, precinct, minConsistency = 0.66 } = req.query;
    const voters = await getVotersWithHistory({ precinct: precinct || null });

    const superPicks = superPicksCalc.identifySuperPicks(voters, {
      minScore: parseInt(minScore, 10),
      limit: parseInt(limit, 10),
      precinct,
      minConsistency: parseFloat(minConsistency)
    });

    res.json({
      superPicks,
      count: superPicks.length,
      stats: superPicksCalc.getStatistics(voters)
    });
  } catch (err) {
    console.error('Super-picks list error:', err);
    res.status(500).json({ error: 'Failed to compute super picks' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const voters = await getVotersWithHistory({});
    const categories = superPicksCalc.getSuperpicksByCategory(voters);
    res.json(categories);
  } catch (err) {
    console.error('Super-picks categories error:', err);
    res.status(500).json({ error: 'Failed to compute categories' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const voters = await getVotersWithHistory({});
    res.json(superPicksCalc.getStatistics(voters));
  } catch (err) {
    console.error('Super-picks stats error:', err);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

router.post('/import', async (req, res) => {
  const { filePath, votingHistoryPath } = req.body || {};
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `File not found: ${resolved}` });
  }

  const client = await pool.connect();
  try {
    let voters = await VoterImporter.importFromCSV(resolved);

    if (votingHistoryPath) {
      const resolvedHistory = path.resolve(votingHistoryPath);
      if (!fs.existsSync(resolvedHistory)) {
        return res.status(400).json({ error: `History file not found: ${resolvedHistory}` });
      }
      const history = await VoterImporter.importVotingHistory(resolvedHistory);
      voters = VoterImporter.mergeVoterHistory(voters, history);
    }

    await client.query('BEGIN');
    let inserted = 0;
    const errors = [];
    for (const v of voters) {
      const validation = VoterImporter.validateVoter(v);
      if (!validation.isValid) {
        errors.push({ voter: `${v.firstName || '?'} ${v.lastName || '?'}`, errors: validation.errors });
        continue;
      }
      try {
        await insertVoterWithHistory(client, v);
        inserted++;
      } catch (err) {
        errors.push({ voter: `${v.firstName} ${v.lastName}`, errors: [err.message] });
      }
    }
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Import complete',
      stats: VoterImporter.getImportStats(voters),
      inserted,
      skipped: errors.length,
      errors: errors.slice(0, 25)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Super-picks import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  } finally {
    client.release();
  }
});

router.post('/import-walklist', async (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `File not found: ${resolved}` });
  }

  const client = await pool.connect();
  try {
    const voters = await WalklistImporter.importFromWalklistCSV(resolved);

    await client.query('BEGIN');
    let inserted = 0;
    const errors = [];
    for (const v of voters) {
      const validation = VoterImporter.validateVoter(v);
      if (!validation.isValid) {
        errors.push({ voter: `${v.firstName} ${v.lastName}`, errors: validation.errors });
        continue;
      }
      try {
        await insertVoterWithHistory(client, v);
        inserted++;
      } catch (err) {
        errors.push({ voter: `${v.firstName} ${v.lastName}`, errors: [err.message] });
      }
    }
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Walklist import complete',
      stats: WalklistImporter.getImportStats(voters),
      inserted,
      skipped: errors.length,
      errors: errors.slice(0, 25)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Walklist import error:', err);
    res.status(500).json({ error: 'Walklist import failed: ' + err.message });
  } finally {
    client.release();
  }
});

router.post('/export-for-canvassing', async (req, res) => {
  try {
    const { minScore = 70, format = 'csv', precinct, minConsistency = 0.66 } = req.body || {};
    const voters = await getVotersWithHistory({ precinct: precinct || null });

    const superPicks = superPicksCalc.identifySuperPicks(voters, {
      minScore: parseInt(minScore, 10),
      limit: 100000,
      precinct,
      minConsistency: parseFloat(minConsistency)
    });

    if (format !== 'csv') {
      return res.json({ superPicks });
    }

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['first_name','last_name','phone','address','precinct','super_pick_score'];
    const lines = [header.join(',')];
    for (const v of superPicks) {
      lines.push([
        v.firstName, v.lastName, v.phone, v.address, v.precinct, v.superPickScore
      ].map(escape).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="super_picks_${Date.now()}.csv"`);
    res.send(lines.join('\r\n'));
  } catch (err) {
    console.error('Super-picks export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
