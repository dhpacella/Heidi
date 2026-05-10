// Voter Model
class Voter {
  constructor(id, firstName, lastName, address, precinct, partyAffiliation, votingHistory, contactInfo) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.address = address;
    this.precinct = precinct;
    this.partyAffiliation = partyAffiliation;
    this.votingHistory = votingHistory; // Array of years voted
    this.contactInfo = contactInfo;
    this.canvassingHistory = [];
  }

  hasVotedInLastYears(years) {
    const currentYear = new Date().getFullYear();
    return this.votingHistory.some(year => currentYear - year <= years);
  }

  isPersuasionOpportunity() {
    // Logic to determine if this voter is a persuasion opportunity
    return true;
  }
}

module.exports = Voter;
