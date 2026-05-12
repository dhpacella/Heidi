require('dotenv').config();
const fs = require('fs');
const pool = require('./src/db/connection');
const path = require('path');
const readline = require('readline');

const filePath = path.join(__dirname, '..', 'TOWNSHIP_HOMER_Voter_Segments_1.csv');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const ELECTION_MAP = {
  'PRIMARY-PRIMARIA 2026 - VOTE TYPE': { year: 2026, type: 'Primary' },
  'GENERAL-GENERAL 2024 - VOTE TYPE': { year: 2024, type: 'General' },
  'PRIMARY-PRIMARIA 2024 - VOTE TYPE': { year: 2024, type: 'Primary' },
  'GENERAL-GENERAL 2022 - VOTE TYPE': { year: 2022, type: 'General' },
  'PRIMARY-PRIMARIA 2022 - VOTE TYPE': { year: 2022, type: 'Primary' },
  'GENERAL ELECTION 2020 - VOTE TYPE': { year: 2020, type: 'General' },
  'PRIMARY ELECTION 2020 - VOTE TYPE': { year: 2020, type: 'Primary' },
  'GENERAL ELECTION 2018 - VOTE TYPE': { year: 2018, type: 'General' },
  'PRIMARY ELECTION 2018 - VOTE TYPE': { year: 2018, type: 'Primary' },
  'GENERAL ELECTION 2016 - VOTE TYPE': { year: 2016, type: 'General' },
  'PRIMARY ELECTION 2016 - VOTE TYPE': { year: 2016, type: 'Primary' },
  'GENERAL ELECTION 2014 - VOTE TYPE': { year: 2014, type: 'General' },
  'PRIMARY ELECTION 2014 - VOTE TYPE': { year: 2014, type: 'Primary' },
  'GENERAL ELECTION 2012 - VOTE TYPE': { year: 2012, type: 'General' },
  'PRIMARY ELECTION 2012 - VOTE TYPE': { year: 2012, type: 'Primary' },
  'GENERAL ELECTION 2010 - VOTE TYPE': { year: 2010, type: 'General' },
  'PRIMARY ELECTION 2010 - VOTE TYPE': { year: 2010, type: 'Primary' },
  'GENERAL ELECTION 2008 - VOTE TYPE': { year: 2008, type: 'General' },
  'PRIMARY ELECTION 2008 - VOTE TYPE': { year: 2008, type: 'Primary' },
  'GENERAL ELECTION 2006 - VOTE TYPE': { year: 2006, type: 'General' },
};

(async () => {
  const client = await pool.connect();
  try {
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Parse records
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i]);
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] ? values[j].trim() : '';
      }
      records.push(record);
    }

    console.log(`Parsed ${records.length} records`);

    // Filter for Orland Park only
    const orlandPark = records.filter(r =>
      r['RES CITY'] && r['RES CITY'].toUpperCase().includes('ORLAND')
    );
    console.log(`Found ${orlandPark.length} Orland Park voters`);

    await client.query('BEGIN');

    // Step 1: Create precinct if not exists
    const precinctLabel = 'HOMER PCT 006';
    await client.query(
      `INSERT INTO precincts (name, precinct_code) VALUES ($1, $1)
       ON CONFLICT (precinct_code) DO NOTHING`,
      [precinctLabel]
    );
    console.log('✓ Precinct ensured');

    // Step 2: Insert voters with voting history
    let inserted = 0;
    for (let i = 0; i < orlandPark.length; i++) {
      const r = orlandPark[i];

      // Build address from components
      const addrParts = [];
      if (r['RES HOUSE NUMBER']) addrParts.push(r['RES HOUSE NUMBER']);
      if (r['RES PRE DIR']) addrParts.push(r['RES PRE DIR']);
      if (r['RES STREET']) addrParts.push(r['RES STREET']);
      if (r['RES STREET TYPE']) addrParts.push(r['RES STREET TYPE']);
      if (r['RES POST DIR']) addrParts.push(r['RES POST DIR']);
      const address = addrParts.join(' ').trim();

      // Insert voter
      const voterRes = await client.query(
        `INSERT INTO voters (first_name, last_name, address, precinct_id, party_affiliation, phone)
         SELECT $1, $2, $3, id, $4, $5 FROM precincts WHERE name = $6
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          r['FIRST NAME'] || '',
          r['LAST NAME'] || '',
          address,
          null, // no party affiliation in this data
          null, // no phone
          precinctLabel
        ]
      );

      if (voterRes.rows.length > 0) {
        const voterId = voterRes.rows[0].id;

        // Insert voting history
        for (const [columnName, electionInfo] of Object.entries(ELECTION_MAP)) {
          const voteType = r[columnName] ? r[columnName].trim() : '';
          if (voteType && voteType !== '') {
            const voted = voteType.toUpperCase() !== 'NO' && voteType !== '';
            try {
              await client.query(
                `INSERT INTO voting_history (voter_id, election_year, election_type, voted)
                 VALUES ($1, $2, $3, $4)`,
                [voterId, electionInfo.year, electionInfo.type, voted]
              );
            } catch (e) {
              // Ignore duplicate entries
              if (!e.message.includes('duplicate')) throw e;
            }
          }
        }
        inserted++;
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  ${i + 1}/${orlandPark.length} processed...`);
      }
    }

    await client.query('COMMIT');
    console.log(`✓ Import complete: ${inserted} Orland Park voters inserted`);

    // Final stats
    const stats = await client.query(`
      SELECT
        COUNT(*) as total_voters,
        COUNT(DISTINCT precinct_id) as precincts,
        (SELECT COUNT(DISTINCT election_year) FROM voting_history) as elections
      FROM voters
      WHERE address LIKE '%ORLAND PARK%'
    `);
    console.log('Orland Park stats:', stats.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
