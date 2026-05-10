const pool = require('../db/connection');

/**
 * Fetch voters with voting + canvassing history shaped for SuperPicksCalculator.
 * @param {object} opts
 * @param {string|null} opts.precinct - precinct NAME (string match) or null
 * @param {number|null} opts.limit
 */
async function getVotersWithHistory({ precinct = null, limit = null } = {}) {
  const params = [];
  const conditions = [];

  if (precinct) {
    params.push(precinct);
    conditions.push(`p.name = $${params.length}`);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : '';

  const sql = `
    SELECT
      v.id,
      v.first_name AS "firstName",
      v.last_name  AS "lastName",
      v.email,
      v.phone,
      v.address,
      p.name       AS precinct,
      v.party_affiliation AS "partyAffiliation",
      v.registration_date AS "registrationDate",
      COALESCE(
        (SELECT json_agg(
                  json_build_object(
                    'electionYear',  vh.election_year,
                    'electionType',  vh.election_type,
                    'voted',         vh.voted,
                    'partyVoted',    vh.party_voted,
                    'electionDate',  vh.election_date
                  ) ORDER BY vh.election_year DESC
                )
         FROM voting_history vh WHERE vh.voter_id = v.id),
        '[]'::json
      ) AS "votingHistory",
      COALESCE(
        (SELECT json_agg(
                  json_build_object(
                    'activityType',  ca.activity_type,
                    'contactResult', ca.contact_result,
                    'createdAt',     ca.created_at
                  ) ORDER BY ca.created_at DESC
                )
         FROM canvassing_activities ca WHERE ca.voter_id = v.id),
        '[]'::json
      ) AS "canvassingHistory"
    FROM voters v
    LEFT JOIN precincts p ON p.id = v.precinct_id
    ${where}
    ORDER BY v.last_name, v.first_name
    ${limitClause}
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Insert a single voter (with optional voting history rows).
 * Resolves precinct by name (upsert).
 * Used by import flows. Caller manages transaction.
 * @returns {number} voter id
 */
async function insertVoterWithHistory(client, voter) {
  let precinctId = null;
  if (voter.precinct) {
    const precinctRes = await client.query(
      `INSERT INTO precincts (name, precinct_code)
       VALUES ($1, $1)
       ON CONFLICT (precinct_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [voter.precinct]
    );
    precinctId = precinctRes.rows[0].id;
  }

  const insertRes = await client.query(
    `INSERT INTO voters
       (first_name, last_name, email, phone, address, precinct_id, party_affiliation, registration_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      voter.firstName, voter.lastName,
      voter.email || null, voter.phone || null, voter.address || null,
      precinctId, voter.partyAffiliation || null, voter.registrationDate || null
    ]
  );
  const voterId = insertRes.rows[0].id;

  if (Array.isArray(voter.votingHistory) && voter.votingHistory.length > 0) {
    for (const h of voter.votingHistory) {
      await client.query(
        `INSERT INTO voting_history (voter_id, election_year, election_type, voted, party_voted, election_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          voterId,
          h.electionYear || null,
          h.electionType || null,
          h.voted ?? true,
          h.partyVoted || null,
          h.electionDate || null
        ]
      );
    }
  }

  return voterId;
}

module.exports = { getVotersWithHistory, insertVoterWithHistory };
