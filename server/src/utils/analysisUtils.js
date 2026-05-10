// Analysis utilities
class AnalysisUtils {
  // Calculate win number
  static calculateWinNumber(totalVoters, targetVotePercentage) {
    return Math.ceil((totalVoters * targetVotePercentage) / 100);
  }

  // Calculate turnout based on historical data
  static calculateTurnout(historicalTurnout) {
    if (!historicalTurnout || historicalTurnout.length === 0) return 0;
    const sum = historicalTurnout.reduce((a, b) => a + b, 0);
    return sum / historicalTurnout.length;
  }

  // Identify persuasion opportunities
  static identifyPersuasionOpportunities(voters) {
    return voters.filter(voter => {
      // Logic to identify persuasion opportunities
      // Could be based on voting pattern changes, swing voter indicators, etc.
      return voter.isPersuasionOpportunity && voter.isPersuasionOpportunity();
    });
  }

  // Prioritize precincts
  static prioritizePrecincts(precincts, indicators) {
    return precincts.sort((a, b) => {
      const priorityA = a.calculatePriority(indicators);
      const priorityB = b.calculatePriority(indicators);
      return priorityB - priorityA;
    });
  }
}

module.exports = AnalysisUtils;
