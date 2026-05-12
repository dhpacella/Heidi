require('dotenv').config();
const fs = require('fs');
const pool = require('./src/db/connection');
const path = require('path');

const filePath = path.join(__dirname, '..', 'heidi list_4229.csv');

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

const VOTING_HISTORY_MAP = {
  'VH26P': { year: 2026, type: 'Primary' },
  'VH25B': { year: 2025, type: 'General' },
  'VH25A': { year: 2025, type: 'Primary' },
  'VH24P': { year: 2024, type: 'Primary' },
  'VH24G': { year: 2024, type: 'General' },
  'VH23Y': { year: 2023, type: 'General' },
  'VH23M': { year: 2023, type: 'Municipal' },
  'VH22P': { year: 2022, type: 'Primary' },
  'VH22G': { year: 2022, type: 'General' },
  'VH21P': { year: 2021, type: 'Primary' },
  'VH21G': { year: 2021, type: 'General' },
  'VH20P': { year: 2020, type: 'Primary' },
  'VH20G': { year: 2020, type: 'General' },
  'VH19Y': { year: 2019, type: 'General' },
  'VH19P': { year: 2019, type: 'Primary' },
  'VH19M': { year: 2019, type: 'Municipal' },
  'VH19G': { year: 2019, type: 'General' },
  'VH18P': { year: 2018, type: 'Primary' },
  'VH18G': { year: 2018, type: 'General' },
  'VH17Y': { year: 2017, type: 'General' },
  'VH17P': { year: 2017, type: 'Primary' },
  'VH17M': { year: 2017, type: 'Municipal' },
  'VH17G': { year: 2017, type: 'General' },
  'VH16P': { year: 2016, type: 'Primary' },
  'VH16G': { year: 2016, type: 'General' },
  'VH15Y': { year: 2015, type: 'General' },
  'VH15S': { year: 2015, type: 'Special' },
  'VH15P': { year: 2015, type: 'Primary' },
  'VH15M': { year: 2015, type: 'Municipal' },
  'VH15G': { year: 2015, type: 'General' },
  'VH14P': { year: 2014, type: 'Primary' },
  'VH14G': { year: 2014, type: 'General' },
  'VH13R': { year: 2013, type: 'General' },
  'VH13P': { year: 2013, type: 'Primary' },
  'VH13G': { year: 2013, type: 'General' },
  'VH12P': { year: 2012, type: 'Primary' },
  'VH12G': { year: 2012, type: 'General' },
  'VH11P': { year: 2011, type: 'Primary' },
  'VH11M': { year: 2011, type: 'Municipal' },
  'VH11G': { year: 2011, type: 'General' },
  'VH10P': { year: 2010, type: 'Primary' },
  'VH10G': { year: 2010, type: 'General' },
  'VH09P': { year: 2009, type: 'Primary' },
  'VH09G': { year: 2009, type: 'General' },
  'VH08S': { year: 2008, type: 'Special' },
  'VH08P': { year: 2008, type: 'Primary' },
  'VH08G': { year: 2008, type: 'General' },
  'VH07P': { year: 2007, type: 'Primary' },
  'VH07G': { year: 2007, type: 'General' },
  'VH06P': { year: 2006, type: 'Primary' },
  'VH06G': { year: 2006, type: 'General' }
};

(async () => {
  const client = await pool.connect();
  try {
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

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

    console.log(`Parsed ${records.length} voters`);

    await client.query('BEGIN');

    // Create precincts
    const precincts = new Set(records.map(r => r.PrecinctName).filter(p => p));
    console.log(`Creating ${precincts.size} precincts...`);
    for (const precinctName of precincts) {
      await client.query(
        `INSERT INTO precincts (name, precinct_code) VALUES ($1, $1)
         ON CONFLICT (precinct_code) DO NOTHING`,
        [precinctName]
      );
    }

    // Batch insert voters
    console.log('Inserting voters in batches...');
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let batch = 0; batch < records.length; batch += BATCH_SIZE) {
      const batchRecords = records.slice(batch, Math.min(batch + BATCH_SIZE, records.length));
      const voterValues = [];
      const voterParams = [];
      let paramIndex = 1;

      for (const r of batchRecords) {
        const addrParts = [];
        if (r.PrimaryHouseNumber) addrParts.push(r.PrimaryHouseNumber);
        if (r.PrimaryStreetPre) addrParts.push(r.PrimaryStreetPre);
        if (r.PrimaryStreetName) addrParts.push(r.PrimaryStreetName);
        if (r.PrimaryStreetType) addrParts.push(r.PrimaryStreetType);
        if (r.PrimaryStreetPost) addrParts.push(r.PrimaryStreetPost);
        const address = addrParts.join(' ').trim();

        const party = r.CalculatedParty || r.OfficialParty || null;

        voterValues.push(`(
          SELECT $${paramIndex}::text, $${paramIndex+1}::text, $${paramIndex+2}::text,
                 id, $${paramIndex+3}::text, $${paramIndex+4}::text
          FROM precincts WHERE name = $${paramIndex+5}
        )`);

        voterParams.push(
          r.FirstName || '',
          r.LastName || '',
          address,
          party,
          r.PrimaryPhone || '',
          r.PrecinctName
        );
        paramIndex += 6;
      }

      if (voterValues.length > 0) {
        const insertSQL = `
          INSERT INTO voters (first_name, last_name, address, precinct_id, party_affiliation, phone)
          ${voterValues.map((v, i) => (i === 0 ? '' : 'UNION ALL ') + v).join(' ')}
          ON CONFLICT DO NOTHING
          RETURNING id, first_name, last_name
        `;

        const voterRes = await client.query(insertSQL, voterParams);
        inserted += voterRes.rows.length;

        // Insert voting history for this batch
        const historyValues = [];
        const historyParams = [];
        let historyIndex = 1;

        for (const voterRow of voterRes.rows) {
          const voterRecord = batchRecords.find(r =>
            r.FirstName === voterRow.first_name && r.LastName === voterRow.last_name
          );

          if (voterRecord) {
            for (const [columnName, electionInfo] of Object.entries(VOTING_HISTORY_MAP)) {
              const voteValue = voterRecord[columnName];
              if (voteValue && voteValue !== '') {
                const voted = voteValue.toLowerCase().includes('voted');
                historyValues.push(`($${historyIndex}, $${historyIndex+1}, $${historyIndex+2}, $${historyIndex+3})`);
                historyParams.push(voterRow.id, electionInfo.year, electionInfo.type, voted);
                historyIndex += 4;
              }
            }
          }
        }

        if (historyValues.length > 0) {
          const historySQL = `
            INSERT INTO voting_history (voter_id, election_year, election_type, voted)
            VALUES ${historyValues.join(', ')}
            ON CONFLICT DO NOTHING
          `;
          await client.query(historySQL, historyParams);
        }
      }

      console.log(`  ${Math.min(batch + BATCH_SIZE, records.length)}/${records.length} processed...`);
    }

    await client.query('COMMIT');
    console.log(`✓ Import complete: ${inserted} voters inserted`);

    const stats = await client.query(`
      SELECT
        COUNT(*) as total_voters,
        COUNT(DISTINCT precinct_id) as precincts,
        (SELECT COUNT(DISTINCT election_year) FROM voting_history) as elections
      FROM voters
    `);
    console.log('Final stats:', stats.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
