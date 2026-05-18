#!/usr/bin/env node
/**
 * One-shot voter file importer for Heidi 4_2609.csv (GOP format)
 * Run from the heidi-voter-dashboard directory:
 *   node scripts/import-voters.js <path-to-csv>
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

const CSV_PATH = process.argv[2] || path.join(__dirname, '..', 'Heidi 4_2609.csv');
// Run this from the server/ directory: node ../scripts/import-voters.js
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:MuTUdwIQbZjRSyTWfgPpYjXQdHUBIZzj@yamanote.proxy.rlwy.net:45193/railway';
const BATCH_SIZE = 200;

// VH election columns in the CSV
const VH_COLUMNS = [
  'VH26P','VH25B','VH25A','VH24P','VH24G','VH23Y','VH23M','VH22P','VH22G',
  'VH21P','VH21G','VH20P','VH20G','VH19Y','VH19P','VH19M','VH19G','VH18P',
  'VH18G','VH17Y','VH17P','VH17M','VH17G','VH16P','VH16G','VH15Y','VH15S',
  'VH15P','VH15M','VH15G','VH14P','VH14G','VH13R','VH13P','VH13G','VH12P',
  'VH12G','VH11P','VH11M','VH11G','VH10P','VH10G','VH09P','VH09G','VH08S',
  'VH08P','VH08G','VH07P','VH07G','VH06P','VH06G'
];

function parseFrequency(val) {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function parseParty(val) {
  if (!val) return null;
  // "3 - Swing" → "Swing", "1 - Strong R" → "Strong R", etc.
  const m = val.match(/^\d+\s*-\s*(.+)$/);
  return m ? m[1].trim() : val.trim();
}

function buildAddress(row) {
  const parts = [
    row.PrimaryHouseNumber,
    row.PrimaryStreetPre,
    row.PrimaryStreetName,
    row.PrimaryStreetType,
    row.PrimaryStreetPost,
    row.PrimaryUnit && row.PrimaryUnitNumber ? `${row.PrimaryUnit} ${row.PrimaryUnitNumber}` : null
  ].filter(Boolean);
  const street = parts.join(' ').trim();
  if (!street) return row.PrimaryAddress1 || null;
  return `${street}, ${row.PrimaryCity || ''}, ${row.PrimaryState || ''} ${row.PrimaryZip || ''}`.trim();
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  console.log(`Reading ${CSV_PATH}...`);
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });
  console.log(`Parsed ${records.length} rows`);

  // Build precinct lookup: precinctCode → id
  const precinctCache = {};
  const { rows: existingPrecincts } = await pool.query('SELECT id, precinct_code FROM precincts');
  existingPrecincts.forEach(p => { precinctCache[p.precinct_code] = p.id; });

  let imported = 0, skipped = 0, errors = 0;
  const total = records.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const row of batch) {
        const firstName = (row.FirstName || '').trim();
        const lastName = (row.LastName || '').trim();
        if (!firstName || !lastName) { skipped++; continue; }

        const precinctCode = row.PrecinctNumber ? String(row.PrecinctNumber).trim() : null;
        let precinctId = null;

        if (precinctCode && !precinctCache[precinctCode]) {
          const pName = (row.PrecinctName || precinctCode).trim();
          const pr = await client.query(
            `INSERT INTO precincts (name, precinct_code)
             VALUES ($1, $2)
             ON CONFLICT (precinct_code) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [pName, precinctCode]
          );
          precinctCache[precinctCode] = pr.rows[0].id;
        }
        if (precinctCode) precinctId = precinctCache[precinctCode];

        const voteHistory = {};
        VH_COLUMNS.forEach(col => {
          const v = (row[col] || '').trim();
          if (v) voteHistory[col] = v;
        });

        const stateVoterId = (row.StateVoterId || '').trim() || null;
        const lat = row.Latitude ? parseFloat(row.Latitude) : null;
        const lon = row.Longitude ? parseFloat(row.Longitude) : null;
        const phone = (row.PrimaryPhone || '').trim() || null;
        const gender = (row.Gender || '').trim().toUpperCase().charAt(0) || null;
        const party = parseParty(row.CalculatedParty);
        const freq = parseFrequency(row.OverAllFrequency);
        const addr = buildAddress(row);
        const householdId = (row.HHRecId || '').trim() || null;
        const middleName = (row.MiddleName || '').trim() || null;
        const suffix = (row.SuffixName || '').trim() || null;

        try {
          await client.query(
            `INSERT INTO voters
               (first_name, last_name, middle_name, suffix_name, address, phone, gender,
                party_affiliation, vote_frequency, precinct_id, state_voter_id,
                latitude, longitude, household_id, vote_history)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             ON CONFLICT (state_voter_id) WHERE state_voter_id IS NOT NULL
             DO UPDATE SET
               first_name       = EXCLUDED.first_name,
               last_name        = EXCLUDED.last_name,
               middle_name      = EXCLUDED.middle_name,
               address          = EXCLUDED.address,
               phone            = EXCLUDED.phone,
               gender           = EXCLUDED.gender,
               party_affiliation= EXCLUDED.party_affiliation,
               vote_frequency   = EXCLUDED.vote_frequency,
               precinct_id      = EXCLUDED.precinct_id,
               latitude         = EXCLUDED.latitude,
               longitude        = EXCLUDED.longitude,
               household_id     = EXCLUDED.household_id,
               vote_history     = EXCLUDED.vote_history,
               updated_at       = CURRENT_TIMESTAMP`,
            [firstName, lastName, middleName, suffix, addr, phone, gender,
             party, freq, precinctId, stateVoterId,
             lat, lon, householdId,
             Object.keys(voteHistory).length ? JSON.stringify(voteHistory) : null]
          );
          imported++;
        } catch (err) {
          errors++;
          if (errors <= 5) console.error(`  Row error (${lastName}, ${firstName}):`, err.message);
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Batch error:', err.message);
    } finally {
      client.release();
    }

    const pct = Math.round(((i + batch.length) / total) * 100);
    process.stdout.write(`\r  Progress: ${i + batch.length}/${total} (${pct}%) — imported:${imported} skipped:${skipped} errors:${errors}`);
  }

  console.log(`\n\nDone.`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);

  const { rows } = await pool.query('SELECT COUNT(*) FROM voters');
  console.log(`  Total voters in DB: ${rows[0].count}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
