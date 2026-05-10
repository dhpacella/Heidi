# Feature Specifications - Voter Tracking System

## 1. Voter Management

### 1.1 Voter Data Storage
- Store voter information: name, email, phone, address, precinct, party affiliation
- Track registration date
- Maintain voting history (election year, type, voted yes/no, party voted)
- Support canvassing history (interactions, outcomes)

### 1.2 Voter Import
- Support CSV and Excel (.xlsx) file upload
- Validate required fields: firstName, lastName, address, precinct
- Import 1000+ voters in batch
- Show import statistics and errors
- Handle duplicate detection

### 1.2.1 Smart Column Detection
- **Auto-detection mode**: Automatically map uploaded file columns to standard voter fields
- **Manual mapping mode**: Allow user to select columns if auto-detection fails
- **Schema preview**: Optional confirmation table showing detected column mappings before processing
- **Multi-schema support**: Recognize both township file schema (e.g., PRECINCT LABEL, vote type columns) and GOP file schema (e.g., PrecinctName, VH24G, CalculatedParty)
- **Error messages**: Clear feedback if required columns are missing or misidentified

### 1.2.2 Import Modes
- **Simple import**: Load voter data as-is, replacing existing records
- **Merge mode**: Combine uploaded file with existing records by State ID / StateVoterId
  - Merge voting history from both sources
  - Preserve existing canvassing records
  - Update party affiliation and demographics if newer data provided
  - Show merge summary: new voters added, existing voters updated, conflicts noted

### 1.2.3 Supported File Formats
- CSV (comma-separated values)
- Excel (.xlsx) spreadsheets
- Auto-detection of delimiters (comma, tab, semicolon)

### 1.3 Voter Search & Filter
- Filter by precinct (exact match)
- Filter by party affiliation
- Filter by voting history (voted in last X years)
- Combine multiple filters
- Pagination support (50, 100, 200 per page)

### 1.3.1 Advanced Filters
- **Age range slider**: Filter by age (e.g., 18–35 for registration drives, 62+ for absentee outreach)
- **Vote frequency slider**: 0–5 scale matching OverAllFrequency (e.g., "freq 2–3" occasional voters for GOTV)
- **Mobile contact toggle**: One-click filter to phone-bankable voters only
- **Election-specific filters**: Checkboxes for "voted in 2023 municipal," "voted in 2024 general," "voted in 2025 ballot"
- **Gender filter**: Filter by gender for targeted outreach messaging
- **Voter segment filter**: Multi-select checkboxes (Super Voters, General-Only, Midterm, Low-Propensity, Non-Voters)
- **Cross-filter linking**: Selecting a segment automatically narrows precinct dropdown to precincts where that segment is meaningful
- **Multi-select for segments and party**: Checkboxes or toggle chips to combine, e.g., "Low-Propensity + Swing + Tier 1 precincts" in one view
- **Saved filter presets**: One-click buttons like "Door-knock today's list," "Phone bank swing voters," "GOTV Dem base" that apply multiple filters at once

### 1.4 Voter Export
- Export filtered voters as CSV
- Export as JSON for API consumption
- Include selectable fields
- Maintain formatting for mail merge

### 1.4.1 Enhanced Export Features
- **Walk list sort order**: Export sorted by street address for canvassers to walk in order (not alphabetically by name)
- **Per-volunteer packets**: Split export by precinct + tier into separate sheets, one per volunteer
- **Contact log column**: Add blank "Result / Notes" column pre-formatted for field canvasser notes
- **Geocoding data**: Include Latitude and Longitude columns (geocoded from street addresses using offline library like geopy or pgeocode)
- **Custom column selection**: Choose which voter fields to include in export

---

## 2. Super Picks System

### 2.1 Scoring Algorithm
- **Consistency Score (40%)**: Percentage of elections voted in
  - 100% participation = 100 points
  - 66% participation = 66 points
  - Scales linearly

- **Swing Potential (25%)**: Party affiliation changes
  - 2+ changes = 80 points
  - 1 change = 50 points
  - No changes = 0 points

- **Persuadability (20%)**: Likelihood to change mind
  - Independent = 50 points
  - New registration (<12 months) = 40 points
  - New registration (12-24 months) = 20 points
  - Previous canvassing success = +30 points (max)

- **Recency (15%)**: How recently voted
  - Last 6 months = 100 points
  - 6-12 months ago = 80 points
  - 1-2 years ago = 60 points
  - 2+ years ago = 20 points

### 2.2 Super Pick Classification
- Score >= 70: Qualified super pick
- Score >= 80: High priority
- Score >= 90: Premium super pick
- Score < 70: Not a super pick

### 2.3 Voter Categories
1. **Consistent Voters** - Consistency score >= 80
2. **Swing Voters** - Swing potential score >= 70
3. **Persuadable Voters** - Persuasion score >= 70
4. **Recent Voters** - Recency score >= 80

### 2.3.1 Voter Participation Profiles
- **Super Voters (Always Vote)**: Vote in nearly every election, including primaries, midterms, local races, and general elections.
- **General-Only Voters**: Vote in presidential/general elections but skip primaries and local elections.
- **Midterm Voters**: Vote occasionally with inconsistent participation across cycles.
- **Low-Propensity Voters**: Rarely vote, often only once or very infrequently.
- **Non-Voters**: No participation history recorded.

### 2.3.2 Segment Headlines from Actual Homer Glen Data
- **Super Voters (4,213 — 24.3%)** averaged 20 elections each. 68% are Hard Republican; Heidi has 1,328 Democratic Super Voters who should be recruited as block captains and volunteer coordinators. Do not waste canvassing resources chasing the Republican Super Voters.
- **General-Only (4,239 — 24.5%)** are the critical activation target. They showed up for Obama, Biden, and Trump but skipped the 2023 Homer Glen mayoral race. There are 791 Swing and 1,349 Dem General-Only voters; this segment needs one message: the race is decided by 300 votes and it affects your property taxes directly.
- **Midterm Voters (2,979 — 17.2%)** vote inconsistently but do show up for off-year races. Strong Democratic representation (1,209); these voters are persuadable and reachable.
- **Low-Propensity (4,089 — 23.6%)** is the sleeping giant. 70.4% are Swing, the highest swing concentration in any segment. Nearly 2,879 barely-voting Swing voters need 3+ personal contacts to move. Even a 15% activation rate adds over 400 net votes.
- **Non-Voters (1,780 — 10.3%)** are 87.9% Swing and completely undeclared. Prioritize registration drives with an 18–45 age target before the March 10, 2027 deadline.
- Use the Strategy tab for tailored messaging per segment, or click "Get outreach script ↗" on any segment in the voter list to generate a door-knock or phone script on the spot.

### 2.4 Super Picks Export
- Export super picks list for door-knocking
- Include: name, phone, address, precinct, score
- Sort by score (highest first)
- Filter by minimum score
- Filter by precinct

---

## 3. Precinct Prioritization

### 3.1 Precinct Attributes
- Name and code
- County and state
- Partisan lean (Democratic, Republican, Competitive)
- Registration potential (0-100)
- Turnout history (annual percentages)

### 3.2 Precinct Priority Scoring
- **Partisan Lean (30%)**: 
  - Competitive = 30 points
  - Leaning = 15 points
  - Safe = 5 points

- **Registration Potential (25%)**: Direct score 0-100

- **Turnout History (20%)**: Average annual turnout

- **Win Number (15%)**: Votes needed to win

- **Persuasion Opportunities (10%)**: Number of persuadable voters

### 3.3 Precinct Ranking
- Sort by total priority score
- Display top 10 precincts for focus
- Show metrics for each precinct

---

## 4. Analytics & Reporting

### 4.1 Win Number Calculator
- Calculate votes needed to win precinct
- Assume turnout rates
- Account for party registration
- Show margins and assumptions

### 4.2 Turnout Analysis
- Display historical turnout by precinct and year
- Calculate average turnout
- Identify trends
- Compare precincts

### 4.3 Persuasion Opportunities
- Identify swing voters
- Rank by persuasion potential
- Show target demographics
- Prioritize outreach

### 4.4 Dashboard Metrics
- Total voter count
- Super picks count and percentage
- Precinct metrics
- Canvassing progress
- Recent imports

### 4.5 Campaign Calibration
- Dashboard calibrated for Heidi's Homer Glen race.
- Include opponent context: Christina Neitzke-Troike ran as part of the coordinated "Integrity for Homer Glen" slate with trustee co-candidates.
- Recommend considering a trustee slate strategy for Heidi.
- Reflect the margin reality: 2024 township referendum won by 236 votes out of 4,474 cast.
- Win Number calculator pre-loaded with ~30% municipal turnout and a target of roughly 2,200 votes.
- Include Homer Glen precinct lean data: Republican-leaning precincts, one with 58% R vs. 40% D in 2020.
- Emphasize that municipal races are less partisan; focus on swing voters and persuadables rather than base turnout alone.
- Timeline tab must show April 6, 2027 election date with Will County registration deadlines.
- Provide quick access to tailored field materials via "Get canvass script ↗" and "Persuasion sheet ↗".

### 4.6 Real Voter File Insights
- Support 17,300 registered voters across 16 Homer Township precincts.
- Identify 13,163 voters who voted in the last 3 years as the prime door-knock universe.
- Mark 6,021 voters who voted in the 2023 municipal race as the highest-priority likely-to-show-up targets.
- Flag 5,323 swing voters (30.8% of electorate) as genuinely persuadable.
- Track mobile coverage at 88.7% with 15,344 voters having mobile phones.
- Treat all 16 precincts as competitive swing precincts.
- Prioritize precincts 006, 003, and 011 because they combine the largest swing percentages with decent Democratic lean.
- Stress that Heidi is already winning on paper: 4,467 Hard + Weak Democrats exceed the projected win number (~3,463).
- Define the true campaign risk as turnout: delivering the base and converting low-turnout freq-1/freq-2 Dem/Swing voters flips the race.
- Enable the Win Number tab to model turnout scenarios and the impact of raising municipal turnout above 2023's 30%.

---

## 5. Canvassing & Phone Banking

### 5.1 Activity Logging
- Log door-knock interactions
- Log phone banking calls
- Record contact outcomes (reached, not home, interested, not interested, declined)
- Add notes for canvasser
- Timestamp all activities

### 5.2 Activity History
- View complete history for each voter
- Sort by date
- Filter by outcome
- Show canvasser information

### 5.3 Contact Tracking
- Track which voters have been contacted
- Avoid duplicate contacts
- Show contact frequency
- Identify non-responsive voters

---

## 6. Data Management

### 6.1 Data Quality
- Validate required fields on import
- Check phone number format
- Verify address format
- Identify duplicate entries
- Flag incomplete records

### 6.2 Data Export
- CSV format for spreadsheets
- JSON format for API
- PDF format for reports
- Custom field selection
- Filtered data only

### 6.3 Database Requirements
- Store voter records efficiently
- Index on precinct, party, registration date
- Support 100K+ voters
- Fast query performance
- Referential integrity

---

## 7. User Interface

### 7.1 Navigation
- Dashboard link
- Import Data link
- Super Picks link
- Voter Filter link
- Precinct Prioritization link
- Canvassing link
- Data Export link

### 7.2 Dashboard
- Key metrics cards
- Total voters count
- Super picks count
- Precinct count
- Recent activity

### 7.3 Super Picks Page
- Statistics overview
- Filter controls (score, precinct)
- Category buttons (consistent, swing, persuadable, recent)
- Results table with detailed scores
- Export button

### 7.4 Voter Filter Page
- Filter controls (precinct, party, voting history)
- Results table
- Pagination
- Export button

### 7.5 Import Page
- File upload
- Format instructions
- Import status
- Results summary

### 7.6 Responsive Design
- Mobile-friendly layout
- Touch-friendly controls
- Readable on all screen sizes
- Fast load times

---

## 8. Authentication & Security

### 8.1 User Authentication
- Email/password login
- JWT token-based sessions
- Session expiration (24 hours)
- Password hashing (bcrypt)

### 8.2 Authorization
- User role support (admin, user, viewer)
- Permission checks on endpoints
- Audit logging

### 8.3 Data Security
- HTTPS for all communication
- SQL injection prevention
- CORS configuration
- Rate limiting on endpoints

---

## 9. Performance Requirements

### 9.1 Response Times
- API endpoints: < 500ms
- Dashboard load: < 1 second
- Search/filter: < 2 seconds
- Import: < 5 seconds for 10K voters

### 9.2 Scalability
- Support 100K+ voters
- Concurrent users: 100+
- Database queries optimized
- Connection pooling

### 9.3 Data Limits
- CSV upload: 50MB max
- Voters per batch: 50,000
- Query results: 10,000 per page

---

## 10. Deployment & Operations

### 10.1 Environment Configuration
- Development environment setup
- Production deployment
- Environment variables
- Database migrations

### 10.2 Monitoring
- Error logging
- Performance monitoring
- User activity logging
- Database backups

### 10.3 Maintenance
- Regular backups
- Database optimization
- Security patches
- Documentation updates
