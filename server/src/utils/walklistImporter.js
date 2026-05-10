const fs = require('fs');
const csv = require('csv-parser');

class WalklistImporter {
  static parseElectionCode(code) {
    const match = code.match(/^(\d{2})([A-Z])$/);
    if (!match) return null;
    const [, year, type] = match;
    const fullYear = parseInt(`20${year}`, 10);
    const typeMap = {
      M: { name: 'Municipal', type: 'Municipal' },
      G: { name: 'General', type: 'General' },
      P: { name: 'Primary', type: 'Primary' },
      B: { name: 'Ballot', type: 'Special' },
      S: { name: 'Special', type: 'Special' }
    };
    const election = typeMap[type];
    return election ? { year: fullYear, type: election.type, name: election.name } : null;
  }

  static extractElectionColumns(headers) {
    const elections = {};
    for (const header of headers) {
      const election = this.parseElectionCode(header);
      if (election) {
        elections[header] = election;
      }
    }
    return elections;
  }

  static validateWalklistRow(row) {
    const errors = [];
    if (!row.firstName || !row.firstName.trim()) errors.push('firstName required');
    if (!row.lastName || !row.lastName.trim()) errors.push('lastName required');
    if (!row.phone || !row.phone.trim()) errors.push('phone required');
    return { isValid: errors.length === 0, errors };
  }

  static async importFromWalklistCSV(filePath) {
    return new Promise((resolve, reject) => {
      const voters = [];
      let elections = null;
      let firstRow = true;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (firstRow && !elections) {
            elections = this.extractElectionColumns(Object.keys(row));
            firstRow = false;
          }

          const precinct = row['Precinct']?.match(/HOMER PCT (\d+)/)
            ? `Precinct ${row['Precinct'].match(/HOMER PCT (\d+)/)[1]}`
            : row['Precinct'] || null;

          const voter = {
            firstName: (row['First Name'] || '').trim(),
            lastName: (row['Last Name'] || '').trim(),
            address: (row['Address'] || '').trim() || null,
            precinct: precinct,
            partyAffiliation: (row['Party'] || '').trim() || null,
            phone: (row['Phone'] || '').trim() || null,
            age: (row['Age'] || '').trim() || null,
            gender: (row['Gender'] || '').trim() || null,
            segment: (row['Segment'] || '').trim() || null,
            votingHistory: []
          };

          if (elections) {
            for (const [code, election] of Object.entries(elections)) {
              const voted = (row[code] || '').trim().toUpperCase() === 'Y';
              voter.votingHistory.push({
                electionYear: election.year,
                electionType: election.type,
                voted
              });
            }
          }

          voters.push(voter);
        })
        .on('end', () => resolve(voters))
        .on('error', reject);
    });
  }

  static getImportStats(voters) {
    const byPrecinct = {};
    const byParty = {};
    let withVoting = 0;
    const historyLengths = [];

    for (const v of voters) {
      if (v.precinct) byPrecinct[v.precinct] = (byPrecinct[v.precinct] || 0) + 1;
      if (v.partyAffiliation) byParty[v.partyAffiliation] = (byParty[v.partyAffiliation] || 0) + 1;
      if (v.votingHistory && v.votingHistory.length > 0) {
        withVoting++;
        historyLengths.push(v.votingHistory.length);
      }
    }

    const avgHistoryLength = historyLengths.length > 0
      ? (historyLengths.reduce((a, b) => a + b, 0) / historyLengths.length).toFixed(2)
      : '0.00';

    return {
      totalImported: voters.length,
      byPrecinct,
      byParty,
      withVotingHistory: withVoting,
      averageHistoryLength: avgHistoryLength
    };
  }
}

module.exports = WalklistImporter;
