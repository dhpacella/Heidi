// Super Picks Calculator - Identifies high-priority voters for targeting
class SuperPicksCalculator {
  constructor() {
    this.scoreWeights = {
      consistency: 0.40,
      swingPotential: 0.25,
      persuadability: 0.20,
      recency: 0.15
    };
  }

  /**
   * Calculate super pick score for a voter
   * @param {Object} voter - Voter data with voting history
   * @returns {Number} Score from 0-100
   */
  calculateVoterScore(voter) {
    const consistencyScore = this.scoreConsistency(voter.votingHistory);
    const swingScore = this.scoreSwingPotential(voter.votingHistory, voter.partyAffiliation);
    const persuasionScore = this.scorePersuadability(voter);
    const recencyScore = this.scoreRecency(voter.votingHistory);

    const totalScore =
      (consistencyScore * this.scoreWeights.consistency) +
      (swingScore * this.scoreWeights.swingPotential) +
      (persuasionScore * this.scoreWeights.persuadability) +
      (recencyScore * this.scoreWeights.recency);

    return Math.min(100, Math.max(0, Math.round(totalScore)));
  }

  /**
   * Score based on voting consistency
   * Voters who vote in every election are higher priority
   */
  scoreConsistency(votingHistory) {
    if (!votingHistory || votingHistory.length === 0) return 0;

    // Count elections where voter participated
    const votedCount = votingHistory.filter(v => v.voted === true).length;
    const consistencyRatio = votedCount / votingHistory.length;

    // Map ratio to score: 100% = 100, 66% = 66, 33% = 33, etc.
    return consistencyRatio * 100;
  }

  /**
   * Score swing voter potential
   * Voters who changed party affiliation are persuadable
   */
  scoreSwingPotential(votingHistory, currentParty) {
    if (!votingHistory || votingHistory.length < 2) return 0;

    let partyChanges = 0;
    let previousParty = null;

    votingHistory.forEach(election => {
      if (election.partyVoted && election.partyVoted !== previousParty) {
        partyChanges++;
      }
      previousParty = election.partyVoted;
    });

    // Score based on number of party changes
    // 2+ changes = high swing potential (80+)
    // 1 change = moderate swing potential (50)
    // 0 changes = low swing potential (0)
    const swingScore = partyChanges * 40;
    return Math.min(100, swingScore);
  }

  /**
   * Score persuadability factors
   */
  scorePersuadability(voter) {
    let score = 0;

    // Voters without strong party registration are more persuadable
    if (!voter.partyAffiliation || voter.partyAffiliation === 'Independent') {
      score += 50;
    } else {
      score += 25;
    }

    // Recent registration suggests persuadable new voter
    if (voter.registrationDate) {
      const registrationDate = new Date(voter.registrationDate);
      const monthsAgo = (new Date() - registrationDate) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo < 12) {
        score += 40;
      } else if (monthsAgo < 24) {
        score += 20;
      }
    }

    // Previous canvassing success indicates persuadability
    if (voter.canvassingHistory && voter.canvassingHistory.length > 0) {
      const successRate = voter.canvassingHistory.filter(c => c.contactResult === 'Interested').length / voter.canvassingHistory.length;
      score += successRate * 30;
    }

    return Math.min(100, score);
  }

  /**
   * Score based on recency of voting
   * Recent voters are more likely to vote again
   */
  scoreRecency(votingHistory) {
    if (!votingHistory || votingHistory.length === 0) return 0;

    // Find most recent election
    const sortedHistory = votingHistory.sort((a, b) => new Date(b.electionDate) - new Date(a.electionDate));
    const mostRecentVote = sortedHistory.find(v => v.voted === true);

    if (!mostRecentVote) return 0;

    const monthsSinceLastVote = (new Date() - new Date(mostRecentVote.electionDate)) / (1000 * 60 * 60 * 24 * 30);

    // Voted in last 6 months = 100
    // Voted 6-12 months ago = 80
    // Voted 1-2 years ago = 60
    // Voted 2+ years ago = 20
    if (monthsSinceLastVote < 6) return 100;
    if (monthsSinceLastVote < 12) return 80;
    if (monthsSinceLastVote < 24) return 60;
    return 20;
  }

  /**
   * Identify super picks from voter list
   * @param {Array} voters - Array of voter objects
   * @param {Object} options - Filter options
   * @returns {Array} Voters with scores sorted by priority
   */
  identifySuperPicks(voters, options = {}) {
    const {
      minScore = 70,
      limit = null,
      precinct = null,
      minConsistency = 0.66 // 66% consistency
    } = options;

    // Calculate scores for all voters
    const scoredVoters = voters
      .map(voter => ({
        ...voter,
        superPickScore: this.calculateVoterScore(voter),
        consistencyScore: this.scoreConsistency(voter.votingHistory),
        swingScore: this.scoreSwingPotential(voter.votingHistory, voter.partyAffiliation),
        persuasionScore: this.scorePersuadability(voter),
        recencyScore: this.scoreRecency(voter.votingHistory)
      }))
      .filter(voter => {
        // Apply filters
        if (voter.superPickScore < minScore) return false;
        if (voter.consistencyScore / 100 < minConsistency) return false;
        if (precinct && voter.precinct !== precinct) return false;
        return true;
      })
      .sort((a, b) => b.superPickScore - a.superPickScore);

    // Apply limit if specified
    return limit ? scoredVoters.slice(0, limit) : scoredVoters;
  }

  /**
   * Get super picks by category
   */
  getSuperpicksByCategory(voters) {
    const superPicks = this.identifySuperPicks(voters, { minScore: 70 });

    return {
      consistentVoters: superPicks.filter(v => v.consistencyScore >= 80),
      swingVoters: superPicks.filter(v => v.swingScore >= 70),
      persuadableVoters: superPicks.filter(v => v.persuasionScore >= 70),
      recentVoters: superPicks.filter(v => v.recencyScore >= 80),
      allSuperPicks: superPicks
    };
  }

  /**
   * Get super picks statistics
   */
  getStatistics(voters) {
    const superPicks = this.identifySuperPicks(voters, { minScore: 70 });

    return {
      totalVoters: voters.length,
      superPickCount: superPicks.length,
      superPickPercentage: (superPicks.length / voters.length * 100).toFixed(2),
      averageScore: (superPicks.reduce((sum, v) => sum + v.superPickScore, 0) / superPicks.length).toFixed(2),
      topScore: superPicks[0]?.superPickScore || 0,
      bottomScore: superPicks[superPicks.length - 1]?.superPickScore || 0
    };
  }
}

module.exports = SuperPicksCalculator;
