require('dotenv').config();
const pool = require('./src/db/connection');
const WalklistImporter = require('./src/utils/walklistImporter');
const path = require('path');

const filePath = path.join(__dirname, '..', 'heidi_homer_glen_walklist_2026-05-08.csv');

(async () => {
  const client = await pool.connect();
  try {
    console.log('Parsing walklist...');
    const voters = await WalklistImporter.importFromWalklistCSV(filePath);
    console.log(`✓ Parsed ${voters.length} voters`);

    await client.query('BEGIN');

    // Step 1: Create all precincts
    const precinctNames = [...new Set(voters.map(v => v.precinct))];
    console.log(`Creating ${precinctNames.length} precincts...`);
    for (const name of precinctNames) {
      await client.query(
        `INSERT INTO precincts (name, precinct_code) VALUES ($1, $1)
         ON CONFLICT (precinct_code) DO NOTHING`,
        [name]
      );
    }
    console.log('✓ Precincts created');

    // Step 2: Bulk insert voters
    console.log('Inserting voters...');
    let inserted = 0;
    for (let i = 0; i < voters.length; i++) {
      const v = voters[i];
      const voterRes = await client.query(
        `INSERT INTO voters (first_name, last_name, address, precinct_id, party_affiliation, phone)
         SELECT $1, $2, $3, id, $4, $5 FROM precincts WHERE name = $6
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [v.firstName, v.lastName, v.address, v.partyAffiliation, v.phone, v.precinct]
      );

      if (voterRes.rows.length > 0 && v.votingHistory && v.votingHistory.length > 0) {
        const voterId = voterRes.rows[0].id;
        for (const vh of v.votingHistory) {
          await client.query(
            `INSERT INTO voting_history (voter_id, election_year, election_type, voted)
             VALUES ($1, $2, $3, $4)`,
            [voterId, vh.electionYear, vh.electionType, vh.voted]
          );
        }
        inserted++;
      }

      if ((i + 1) % 500 === 0) {
        console.log(`  ${i + 1}/${voters.length} processed...`);
      }
    }

    await client.query('COMMIT');
    console.log(`✓ Import complete: ${inserted} voters with voting history`);

    // Final stats
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
