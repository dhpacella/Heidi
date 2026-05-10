# Super Picks Feature - Implementation Guide

## Overview

The "Super Picks" system identifies and prioritizes high-value voters for targeted outreach. It uses a multi-factor scoring algorithm to rank voters based on:

- **Voting Consistency** (40%) - How often they vote in elections
- **Swing Potential** (25%) - Whether they've changed party affiliation
- **Persuadability** (20%) - Likelihood of being influenced
- **Recency** (15%) - How recently they voted

## Super Picks Scoring Algorithm

### Consistency Score
Voters who vote in every election receive higher scores:
- 100% participation = 100 points
- 66% participation = 66 points
- 33% participation = 33 points

### Swing Potential Score
Voters who have changed party affiliation are more persuadable:
- 2+ party changes = 80+ points
- 1 party change = 50 points
- No party changes = 0 points

### Persuadability Score
Multiple factors increase persuadability:
- Independent voter = 50 points
- New registration (<12 months) = 40 points
- New registration (12-24 months) = 20 points
- Previous canvassing success = up to 30 points

### Recency Score
Recent voters are more likely to vote again:
- Voted in last 6 months = 100 points
- Voted 6-12 months ago = 80 points
- Voted 1-2 years ago = 60 points
- Voted 2+ years ago = 20 points

### Total Super Pick Score
```
Score = (Consistency × 0.40) + (Swing × 0.25) + (Persuadability × 0.20) + (Recency × 0.15)
```

**Minimum score to qualify as super pick: 70/100**

## Voter Import Process

### Step 1: Prepare CSV Files

**Voters CSV** (`sample_voters.csv`):
```csv
firstName,lastName,email,phone,address,precinct,partyAffiliation,registrationDate
John,Smith,john@example.com,555-0101,123 Main St,Precinct A,Democrat,2022-03-15
```

**Voting History CSV** (`sample_voting_history.csv`):
```csv
voterId,electionYear,electionType,voted,partyVoted,electionDate
1,2020,General,true,Democrat,2020-11-03
```

### Step 2: Import Data

1. Go to "Import Data" page
2. Upload voters CSV file
3. View import statistics
4. System automatically calculates super pick scores

### Step 3: View Super Picks

1. Go to "Super Picks" page
2. View statistics dashboard
3. Filter by score range or precinct
4. View voters by category:
   - Consistent Voters
   - Swing Voters
   - Persuadable Voters
   - Recent Voters

## Using Super Picks

### Filter by Score
- **70+**: Qualified super picks
- **80+**: High-priority super picks
- **90+**: Premium super picks

### Filter by Precinct
Focus door-knocking efforts on specific precincts with highest super pick concentration.

### Export for Door-Knocking
1. Set minimum score threshold
2. Select precinct (optional)
3. Click "Export for Door-Knocking"
4. Receives CSV with:
   - First and last name
   - Phone number
   - Address
   - Precinct
   - Super pick score

## Integration with Voter Tracking

### Door-Knocking Priority
1. Sort by super pick score (highest first)
2. Canvassers knock on super picks first
3. Log interaction results
4. Update voter records with contact information

### Canvassing Feedback
- Log door-knock results
- Update persuasion likelihood
- Track conversion rates
- Refine targeting algorithms

### Analytics & Reporting
- Track super pick conversion rates
- Measure canvassing effectiveness
- Identify top-performing precincts
- ROI analysis on voter contact

## API Endpoints

### Get Super Picks
```
GET /api/super-picks?minScore=70&limit=100&precinct=Precinct%20A
```

### Get Super Picks by Category
```
GET /api/super-picks/categories
```

### Get Statistics
```
GET /api/super-picks/stats
```

### Import Voters
```
POST /api/super-picks/import
{
  "filePath": "path/to/voters.csv"
}
```

### Export for Canvassing
```
POST /api/super-picks/export-for-canvassing
{
  "minScore": 70,
  "format": "csv",
  "precinct": "Precinct A"
}
```

## Best Practices

### Data Quality
- Ensure complete voting history (3+ years minimum)
- Validate phone numbers and addresses
- Remove duplicate entries
- Update party affiliation regularly

### Targeting
- Start with score 80+ for highest ROI
- Focus on competitive precincts
- Prioritize recent voters for reactivation
- Track swing voters closely

### Follow-up
- Log all canvassing interactions
- Update voter records after contact
- Analyze conversion rates
- Adjust targeting based on results

## Example Super Pick Profile

| Metric | Value | Reasoning |
|--------|-------|-----------|
| Name | John Smith | |
| Precinct | Precinct A | High swing potential area |
| Voting History | 4/4 elections (100%) | Consistent super pick |
| Party Changes | 2 changes | Highly persuadable |
| Persuasion Score | 85 | Recent engagement success |
| **Total Score** | **87** | **Premium Super Pick** |

## Troubleshooting

### Low Super Pick Count
- Check data quality and completeness
- Verify voting history accuracy
- Lower minimum score threshold
- Ensure precinct data matches

### Import Errors
- Verify CSV column names match template
- Check for missing required fields
- Ensure date format is YYYY-MM-DD
- Look for special characters in data

### Export Issues
- Verify records have phone numbers and addresses
- Check browser file download settings
- Try alternative export format
- Contact support if persists
