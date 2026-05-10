// CSV/Excel voter data importer
const csv = require('csv-parser');
const fs = require('fs');

class VoterImporter {
  /**
   * Import voters from CSV file
   * Expected columns: firstName, lastName, email, phone, address, precinct, partyAffiliation
   */
  static async importFromCSV(filePath) {
    return new Promise((resolve, reject) => {
      const voters = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          voters.push({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            address: row.address,
            precinct: row.precinct,
            partyAffiliation: row.partyAffiliation,
            registrationDate: row.registrationDate,
            votingHistory: [] // Will be populated separately
          });
        })
        .on('end', () => resolve(voters))
        .on('error', reject);
    });
  }

  /**
   * Import voting history from CSV
   * Expected columns: voterId, electionYear, electionType, voted, partyVoted, electionDate
   */
  static async importVotingHistory(filePath) {
    return new Promise((resolve, reject) => {
      const history = {};

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const voterId = row.voterId;
          if (!history[voterId]) {
            history[voterId] = [];
          }

          history[voterId].push({
            electionYear: parseInt(row.electionYear),
            electionType: row.electionType,
            voted: row.voted === 'true' || row.voted === '1',
            partyVoted: row.partyVoted,
            electionDate: row.electionDate
          });
        })
        .on('end', () => resolve(history))
        .on('error', reject);
    });
  }

  /**
   * Merge voters with their voting history
   */
  static mergeVoterHistory(voters, votingHistory) {
    return voters.map((voter, index) => ({
      ...voter,
      id: index + 1,
      votingHistory: votingHistory[index + 1] || []
    }));
  }

  /**
   * Validate voter data
   */
  static validateVoter(voter) {
    const errors = [];

    if (!voter.firstName) errors.push('firstName is required');
    if (!voter.lastName) errors.push('lastName is required');
    if (!voter.address) errors.push('address is required');
    if (!voter.precinct) errors.push('precinct is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get import statistics
   */
  static getImportStats(voters) {
    return {
      totalImported: voters.length,
      byPrecinct: this.countByField(voters, 'precinct'),
      byParty: this.countByField(voters, 'partyAffiliation'),
      withVotingHistory: voters.filter(v => v.votingHistory && v.votingHistory.length > 0).length,
      averageHistoryLength: (voters.reduce((sum, v) => sum + (v.votingHistory?.length || 0), 0) / voters.length).toFixed(2)
    };
  }

  static countByField(voters, field) {
    return voters.reduce((acc, voter) => {
      const value = voter[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = VoterImporter;
