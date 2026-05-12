const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const pool = require('../db/connection');

const CSV_PATH = path.resolve(__dirname, '..', '..', '..', 'Heidi 4_2609.csv');
const BATCH_SIZE = 500; // Insert 500 voters at a time

async function importVoterData() {
  try {
    console.log('📖 Reading CSV file...');
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`✓ Parsed ${records.length} voter records`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing data
      console.log('🗑️  Clearing existing voter data...');
      await client.query('DELETE FROM canvassing_activities');
      await client.query('DELETE FROM voting_history');
      await client.query('DELETE FROM voters');
      await client.query('DELETE FROM precincts WHERE name LIKE \'HOMER%\'');

      // Create precincts
      console.log('📍 Creating precincts...');
      const precincts = {};
      records.forEach(r => {
        const pname = r.PrecinctName?.trim();
        if (pname && !precincts[pname]) {
          precincts[pname] = r.PrecinctNumber?.trim() || 'UNKNOWN';
        }
      });

      const precinctMap = {};
      for (const [name, code] of Object.entries(precincts)) {
        const res = await client.query(
          'INSERT INTO precincts (name, precinct_code, county, state) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, code, 'Will', 'IL']
        );
        precinctMap[name] = res.rows[0].id;
      }
      console.log(`✓ Created ${Object.keys(precincts).length} precincts`);

      // Prepare voter data
      console.log('👥 Preparing voter data...');
      const voterData = [];
      for (const record of records) {
        const firstName = record.FirstName?.trim() || '';
        const lastName = record.LastName?.trim() || '';
        if (!firstName || !lastName) continue;

        voterData.push({
          firstName,
          lastName,
          phone: record.PrimaryPhone?.trim() || null,
          address: buildAddress(record),
          precinctId: precinctMap[record.PrecinctName?.trim()] || null,
          party: normalizeParty(record.CalculatedParty || record.ObservedParty),
          votingHistory: parseVotingHistory(record)
        });
      }

      console.log(`  ✓ Prepared ${voterData.length} voters`);

      // Batch insert voters
      console.log(`💾 Inserting voters in batches of ${BATCH_SIZE}...`);
      const voterIdMap = {};
      for (let i = 0; i < voterData.length; i += BATCH_SIZE) {
        const batch = voterData.slice(i, i + BATCH_SIZE);
        const sql = `INSERT INTO voters (first_name, last_name, phone, address, precinct_id, party_affiliation, registration_date)
          VALUES ` + batch.map((_, idx) => {
          const offset = idx * 6;
          return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},NOW())`;
        }).join(',') + ` RETURNING id, first_name, last_name`;

        const params = [];
        batch.forEach(v => {
          params.push(v.firstName, v.lastName, v.phone, v.address, v.precinctId, v.party);
        });

        const res = await client.query(sql, params);
        res.rows.forEach(row => {
          voterIdMap[`${row.first_name}|${row.last_name}`] = row.id;
        });

        console.log(`  ✓ Inserted ${Math.min(i + BATCH_SIZE, voterData.length)} / ${voterData.length} voters`);
      }

      // Batch insert voting history
      console.log(`💾 Inserting voting history...`);
      let totalVH = 0;
      const vhBatch = [];

      for (const voter of voterData) {
        for (const vh of voter.votingHistory) {
          const voterId = voterIdMap[`${voter.firstName}|${voter.lastName}`];
          if (!voterId) continue;
          vhBatch.push([voterId, vh.year, vh.type, vh.voted, vh.party]);
          totalVH++;

          if (vhBatch.length >= 1000) {
            const sql = `INSERT INTO voting_history (voter_id, election_year, election_type, voted, party_voted)
              VALUES ` + vhBatch.map((_, idx) => {
              const offset = idx * 5;
              return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5})`;
            }).join(',');

            const params = vhBatch.flat();
            await client.query(sql, params);
            console.log(`  ✓ Inserted ${totalVH} voting history records...`);
            vhBatch.length = 0;
          }
        }
      }

      // Final batch of voting history
      if (vhBatch.length > 0) {
        const sql = `INSERT INTO voting_history (voter_id, election_year, election_type, voted, party_voted)
          VALUES ` + vhBatch.map((_, idx) => {
          const offset = idx * 5;
          return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5})`;
        }).join(',');

        await client.query(sql, vhBatch.flat());
      }

      console.log(`  ✓ Total voting history records: ${totalVH}`);

      await client.query('COMMIT');
      console.log(`\n✅ Import complete! Imported ${voterData.length} voters with ${totalVH} voting history records`);

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
}

function buildAddress(record) {
  const parts = [
    record.PrimaryHouseNumber?.trim(),
    record.PrimaryStreetPre?.trim(),
    record.PrimaryStreetName?.trim(),
    record.PrimaryStreetType?.trim(),
    record.PrimaryStreetPost?.trim()
  ].filter(Boolean);

  if (record.PrimaryUnit?.trim()) {
    parts.push(record.PrimaryUnit?.trim());
    if (record.PrimaryUnitNumber?.trim()) {
      parts[parts.length - 1] += ' ' + record.PrimaryUnitNumber?.trim();
    }
  }

  return parts.join(' ').trim() || null;
}

function normalizeParty(party) {
  if (!party) return null;
  const p = party.toLowerCase();
  if (p.includes('democrat')) return 'Democrat';
  if (p.includes('republican')) return 'Republican';
  if (p.includes('independent') || p.includes('swing') || p.includes('unaffiliated')) return 'Independent';
  return 'Other';
}

function parseVotingHistory(record) {
  const voting = [];
  const vh_columns = Object.keys(record).filter(k => k.startsWith('VH'));

  for (const col of vh_columns) {
    if (!record[col] || record[col].trim() === '') continue;

    const match = col.match(/VH(\d+)([A-Z])/);
    if (!match) continue;

    const yearCode = parseInt(match[1]);
    const typeCode = match[2];
    const status = record[col].trim();

    const year = 2000 + yearCode;

    let type = 'General';
    if (typeCode === 'P') type = 'Primary';
    if (typeCode === 'Y') type = 'Special';
    if (typeCode === 'M') type = 'Municipal';
    if (typeCode === 'S') type = 'State';
    if (typeCode === 'B') type = 'Bond';
    if (typeCode === 'G') type = 'General';
    if (typeCode === 'R') type = 'Referendum';

    const voted = status !== '' && !status.toLowerCase().includes('no');
    const party = determinePartyVoted(status);

    voting.push({ year, type, voted, party });
  }

  return voting;
}

function determinePartyVoted(status) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('democrat')) return 'Democrat';
  if (s.includes('republican')) return 'Republican';
  return null;
}

importVoterData().then(() => {
  process.exit(0);
});
