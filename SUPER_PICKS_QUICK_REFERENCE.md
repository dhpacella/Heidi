# Super Picks Feature - Quick Reference

## 🎯 What Super Picks Does

Super Picks identifies your highest-value voters automatically using intelligent scoring. Instead of manually reviewing thousands of voters, the system ranks them by likelihood to:
- **Vote** - Based on their voting history
- **Be persuaded** - Swing voters and persuadable demographics  
- **Convert** - Recent participation and engagement indicators

**Result**: Your door-knockers focus on voters most likely to vote and support your campaign.

## 📊 The Scoring System

Each voter gets a score from 0-100 based on 4 factors:

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| **Consistency** | 40% | Do they vote in every election? |
| **Swing Potential** | 25% | Have they changed parties? |
| **Persuadability** | 20% | How likely are they to change their mind? |
| **Recency** | 15% | Did they vote recently? |

**Super Pick Threshold**: 70+ out of 100

### Score Interpretation
- **90-100**: Premium super pick - Highest priority
- **80-89**: High priority - Focus on these
- **70-79**: Standard super pick - Good targets
- **Below 70**: Not a super pick - Lower priority

## 🚀 Quick Start

### 1. Import Voter Data
1. Click "Import Data" in navigation
2. Upload your voters CSV file (sample provided)
3. System calculates scores automatically
4. View import statistics

### 2. View Super Picks
1. Click "Super Picks" in navigation
2. See dashboard with key statistics
3. Filter by score range or precinct
4. View voters categorized by type

### 3. Export for Door-Knocking
1. Set minimum score (70+ recommended)
2. Select precinct (optional)
3. Click "Export for Door-Knocking"
4. Get CSV with name, phone, address, score

## 📥 Data Requirements

### Voters CSV Columns
```
firstName      | John
lastName       | Smith
email          | john@example.com
phone          | 555-0101
address        | 123 Main St
precinct       | Precinct A
partyAffiliation | Democrat
registrationDate | 2022-03-15
```

### Voting History CSV Columns
```
voterId       | 1
electionYear  | 2020
electionType  | General
voted         | true
partyVoted    | Democrat
electionDate  | 2020-11-03
```

## 🎪 Super Pick Categories

### Consistent Voters
- Voted in 80%+ of elections
- Reliable participants
- Likely to vote again

### Swing Voters
- Changed party 2+ times
- Highly persuadable
- Premium targets

### Persuadable Voters
- Independents or new registrations
- Recent canvassing success
- Good conversion potential

### Recent Voters
- Voted in last 6 months
- Already engaged
- Easy to mobilize

## 📈 Key Metrics

When you import data, you see:
- **Total Super Picks**: How many qualified voters
- **% of Voters**: Concentration in your list
- **Average Score**: Overall quality level
- **Score Range**: Top to bottom distribution

## 💡 Best Practices

### Targeting
✅ Start with score 80+ for highest ROI
✅ Focus on competitive precincts
✅ Prioritize swing voters for persuasion
✅ Use recent voters for reactivation

### Import Quality
✅ Include 3+ years voting history
✅ Validate phone numbers exist
✅ Update party affiliation regularly
✅ Remove duplicate entries

### Door-Knocking
✅ Sort by score (highest first)
✅ Log all interactions
✅ Track conversion rates
✅ Adjust targeting based on results

## 🔗 Related Features

- **Voter Filter**: Additional filtering beyond super picks
- **Precinct Prioritization**: Sort precincts by indicators
- **Canvassing Tracker**: Log door-knock interactions
- **Data Export**: Export for mail campaigns

## 📚 Learn More

- `SUPER_PICKS_GUIDE.md` - Full scoring algorithm details
- `SUPER_PICKS_IMPLEMENTATION.md` - Technical implementation
- Sample CSV files - Use as templates for your data

## 🆘 Troubleshooting

### Low Super Pick Count
→ Check data completeness  
→ Lower score threshold (try 60 instead of 70)  
→ Verify voting history accuracy

### Import Errors
→ Check CSV column names match template  
→ Ensure dates are YYYY-MM-DD format  
→ Look for special characters causing issues

### Export Issues
→ Verify records have phone and address  
→ Check browser download settings  
→ Try CSV format if JSON fails

## 🎯 Example: Using Super Picks

**Scenario**: You have 5,000 voters to target

**Without Super Picks**:
- Door-knock 5,000 voters
- ~70% won't vote anyway
- Poor resource efficiency
- High cost per convert

**With Super Picks**:
1. Import your 5,000 voters
2. Identify 850 super picks (score 70+)
3. Export 200 premium picks (score 90+)
4. Door-knock top 200 first
5. 5x more efficient targeting
6. Focus on persuadable voters

**Result**: More votes per door-knock, better ROI, happier canvassers

## 📞 Need Help?

1. Check documentation files in project
2. Review sample CSV files for format
3. Check API endpoints for technical details
4. Review scoring algorithm explanation

---

**Version**: 1.0  
**Last Updated**: May 2026  
**Feature**: Super Picks Voter Identification System
