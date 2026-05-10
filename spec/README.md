# Specification Documentation

Complete technical specifications for the Voter Tracking System project.

## 📋 Specification Files

### [API_SPECIFICATION.md](API_SPECIFICATION.md)
Complete REST API documentation including:
- All endpoint definitions
- Request/response formats
- Query parameters
- Authentication requirements
- Error responses and status codes
- Examples for each endpoint

**Use this for:**
- Frontend developers integrating with API
- Backend developers implementing endpoints
- API testing and documentation
- Mobile app development

---

### [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md)
Detailed feature requirements and specifications:
- Voter management features
- Super picks system algorithm
- Precinct prioritization logic
- Analytics and reporting
- Canvassing and phone banking
- User interface requirements
- Performance and deployment specs

**Use this for:**
- Understanding feature requirements
- Implementing new features
- Design decisions
- Performance planning

---

### [DATA_SCHEMA.md](DATA_SCHEMA.md)
Complete database schema documentation:
- Table definitions with SQL
- Column specifications
- Data types and constraints
- Relationships and foreign keys
- JSON API data structures
- CSV import/export formats
- Validation rules
- Indexes for performance

**Use this for:**
- Database design and migrations
- API payload design
- Data import/export
- Query optimization
- Data validation

---

### [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md)
Comprehensive testing specifications:
- Unit test examples
- Integration test cases
- Component test examples
- End-to-end test workflows
- Performance test scenarios
- Test utilities and helpers
- Coverage goals

**Use this for:**
- Writing unit tests
- Testing endpoints
- Component testing
- Quality assurance
- Test planning

---

## Quick Navigation

### By Role

**Frontend Developer:**
1. Start with [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md) - Understand requirements
2. Read [API_SPECIFICATION.md](API_SPECIFICATION.md) - Know what API to call
3. Review [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md) - Learn how to test

**Backend Developer:**
1. Read [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md) - Understand requirements
2. Study [DATA_SCHEMA.md](DATA_SCHEMA.md) - Design database
3. Implement [API_SPECIFICATION.md](API_SPECIFICATION.md) - Build endpoints
4. Write [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md) - Test implementation

**QA/Tester:**
1. Review [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md) - Test cases
2. Study [API_SPECIFICATION.md](API_SPECIFICATION.md) - API testing
3. Use [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md) - Test scenarios

**Product Manager:**
1. Start with [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md) - Feature overview
2. Check [API_SPECIFICATION.md](API_SPECIFICATION.md) - Integration points

---

### By Task

**Building an Endpoint:**
1. Define in [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md)
2. Specify in [API_SPECIFICATION.md](API_SPECIFICATION.md)
3. Design database in [DATA_SCHEMA.md](DATA_SCHEMA.md)
4. Test per [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md)

**Implementing a Feature:**
1. Read feature in [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md)
2. Design database changes in [DATA_SCHEMA.md](DATA_SCHEMA.md)
3. Create APIs in [API_SPECIFICATION.md](API_SPECIFICATION.md)
4. Write tests in [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md)

**Adding Data:**
1. Check [DATA_SCHEMA.md](DATA_SCHEMA.md) for CSV format
2. Validate with [DATA_SCHEMA.md](DATA_SCHEMA.md) rules
3. Test per [TEST_SPECIFICATIONS.md](TEST_SPECIFICATIONS.md)

**Fixing a Bug:**
1. Reproduce per test spec
2. Check API contract in [API_SPECIFICATION.md](API_SPECIFICATION.md)
3. Verify database schema in [DATA_SCHEMA.md](DATA_SCHEMA.md)

---

## Key Specifications Summary

### Super Picks Algorithm
From [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md#superPicksScoringAlgorithm):
- **Consistency** (40%): How often voter votes
- **Swing Potential** (25%): Party changes
- **Persuadability** (20%): Likelihood to influence
- **Recency** (15%): How recently voted

Score ranges: 0-100, minimum super pick: 70

### API Authentication
From [API_SPECIFICATION.md](API_SPECIFICATION.md#authentication):
- JWT token required (except login/register)
- Token in Authorization header
- Format: `Bearer <token>`

### Database Relationships
From [DATA_SCHEMA.md](DATA_SCHEMA.md#relationships):
- Voters → Voting History (many-to-one)
- Voters → Canvassing Activities (many-to-one)
- Voters → Precincts (many-to-one)
- Precincts → Turnout History (many-to-one)

### Key Tables
From [DATA_SCHEMA.md](DATA_SCHEMA.md#databaseTables):
- `voters` - Core voter information
- `voting_history` - Election participation
- `precincts` - Geographic districts
- `canvassing_activities` - Interaction logs
- `users` - System accounts

---

## Document Version Control

| Document | Version | Last Updated | Status |
|----------|---------|--------------|--------|
| API_SPECIFICATION.md | 1.0 | May 2026 | Complete |
| FEATURE_SPECIFICATIONS.md | 1.0 | May 2026 | Complete |
| DATA_SCHEMA.md | 1.0 | May 2026 | Complete |
| TEST_SPECIFICATIONS.md | 1.0 | May 2026 | Complete |

---

## Key Decisions & Rationale

### Why Multi-Factor Scoring?
Different voters contribute to electoral success differently. A single metric (like turnout) misses crucial factors like persuadability and party volatility. Our 4-factor algorithm balances all dimensions.

### Why These Weights?
- **Consistency (40%)** - Most reliable indicator of future behavior
- **Swing Potential (25%)** - Swing voters decide elections
- **Persuadability (20%)** - Resources best spent on moveable voters
- **Recency (15%)** - Recent activity matters less than pattern

### Why PostgreSQL?
- Relational data (voters → voting history)
- ACID compliance for data integrity
- Performance for 100K+ voter queries
- JSON support for flexible responses

### Why JWT for Auth?
- Stateless authentication
- Scalable across multiple servers
- Standard in modern APIs
- Works with REST and CORS

---

## Campaign Context: Heidi's Race

The dashboard is now fully calibrated for Heidi's race and the local Homer Glen environment.
- Opponent Christina Neitzke-Troike ran on an organized slate called "Integrity for Homer Glen" with trustee co-candidates. Her coordinated slate strategy and local community identity were a major factor in her win.
- Heidi should consider running with a slate of trustee candidates as well.
- The most recent contested vote in Homer Glen (the 2024 township referendum) was decided by just 236 votes out of 4,474 cast. This is a knife-edge electorate.
- The Win Number calculator is pre-loaded with an assumed ~30% municipal turnout, putting Heidi's target at roughly 2,200 votes — very reachable with disciplined door-knocking.
- Homer Glen precincts lean Republican, with at least one precinct showing 58% R vs. 40% D in the 2020 presidential race. Municipal races are less partisan, so Heidi needs to win swing voters and persuadables, not just the base.

Real Will County voter file insights:
- 17,300 registered voters across 16 Homer Township precincts.
- 13,163 voted in the last 3 years — your door-knock universe.
- 6,021 voted in the 2023 municipal race — the highest-priority, most likely-to-show-up targets.
- 5,323 swing voters — 30.8% of the electorate and genuinely persuadable.
- 15,344 voters have a mobile number — outstanding phone bank coverage at 88.7%.
- All 16 precincts score as "Swing" — Homer Glen is genuinely competitive everywhere.
- Precincts 006, 003, and 011 rank highest because they combine the largest swing percentages with decent Democratic lean.

The big strategic insight:
- Heidi is already winning on paper. Her Democratic base (4,467 Hard + Weak Democrats) already exceeds the projected win number (~3,463).
- The real enemy is turnout, not the incumbent's secret sauce. If Heidi's base voters actually show up, she wins.
- The incumbent won a low-turnout 2023 race. If Heidi drives municipal turnout even slightly above 2023's 30% by activating the 4,000+ freq-1 and freq-2 Dem/Swing voters who sat out, the math flips decisively.
- The Win Number tab lets you model exactly how that plays out — adjust the base turnout rate to see the impact.

Voter segment headlines from the actual Homer Glen file:
- **Super Voters (4,213 — 24.3%)** averaged 20 elections each, but 68% are Hard Republican. Heidi should recruit her 1,328 Dem Super Voters as block captains and volunteer coordinators, not spend canvassing time on the Republican Super Voters.
- **General-Only (4,239 — 24.5%)** are the critical activation target. They showed up for Obama, Biden, and Trump but skipped the 2023 Homer Glen mayoral race. There are 791 Swing and 1,349 Dem General-Only voters; this group needs the message that the race is decided by 300 votes and it affects property taxes directly.
- **Midterm Voters (2,979 — 17.2%)** are inconsistent but do show up for off-year elections. Strong Democratic representation (1,209) makes them persuadable and reachable.
- **Low-Propensity (4,089 — 23.6%)** is the sleeping giant, with 70.4% Swing — the highest swing concentration of any segment. Nearly 2,879 barely-voting Swing voters need 3+ personal contacts to move; even 15% activation adds 400+ net votes.
- **Non-Voters (1,780 — 10.3%)** are 87.9% Swing and essentially undeclared. Prioritize registration drives for the 18–45 age range before the March 10, 2027 deadline.
- Use the Strategy tab for tailored messaging per segment, or click "Get outreach script ↗" on any segment in the voter list to generate a door-knock or phone script on the spot.

Key moves for the campaign:
- Start the 3-year voter door-knock list now — that's your highest-conversion universe.
- Use the Win Number tab to model how many swing voters you need to flip.
- The Campaign Timeline tab shows the April 6, 2027 election date with all Will County registration deadlines baked in.
- Hit "Get canvass script ↗" or "Persuasion sheet ↗" any time to generate tailored field materials for Heidi.

---

## Related Documentation

- **README.md** - Project overview and features
- **ARCHITECTURE.md** - System design and data flow
- **QUICKSTART.md** - Quick setup guide
- **SUPER_PICKS_GUIDE.md** - Feature-specific guide

---

## How to Use These Specs

1. **Read** the relevant spec for your task
2. **Reference** specific sections as needed
3. **Link** to specs when discussing requirements
4. **Update** specs when making major changes
5. **Review** specs before code review

---

## Questions or Issues?

If you find gaps in the specifications:
1. Add details to the relevant spec file
2. Note version change with date
3. Communicate updates to team
4. Update this index if new sections added

---

**For Project Developers**: Keep these specs open while coding. Reference them frequently to maintain consistency with requirements.

**For Code Reviewers**: Use these specs to validate that implementations meet requirements.

**For New Team Members**: Start here to understand the system requirements and architecture.

---

*Last Updated: May 2026*  
*Specification Set Version: 1.0*
