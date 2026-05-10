// Precinct Model
class Precinct {
  constructor(id, name, precinctCode, partisanLean, registrationPotential, turnoutHistory) {
    this.id = id;
    this.name = name;
    this.precinctCode = precinctCode;
    this.partisanLean = partisanLean; // 'Democratic', 'Republican', 'Competitive'
    this.registrationPotential = registrationPotential; // Number 0-100
    this.turnoutHistory = turnoutHistory; // Array of turnout percentages by year
    this.priorityScore = 0;
  }

  calculatePriority(indicators) {
    // Calculate priority based on indicators
    // indicators = { partisanLean, registrationPotential, turnoutHistory, winNumber, persuasionOpportunity }
    this.priorityScore = 0;
    
    if (indicators.partisanLean === 'Competitive') this.priorityScore += 30;
    if (indicators.registrationPotential > 50) this.priorityScore += 25;
    if (this.getAverageTurnout() > 60) this.priorityScore += 20;
    if (indicators.persuasionOpportunity > 20) this.priorityScore += 25;
    
    return this.priorityScore;
  }

  getAverageTurnout() {
    if (!this.turnoutHistory || this.turnoutHistory.length === 0) return 0;
    const sum = this.turnoutHistory.reduce((a, b) => a + b, 0);
    return sum / this.turnoutHistory.length;
  }
}

module.exports = Precinct;
