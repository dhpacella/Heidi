# Data Schema Specification

## Database Tables

### voters
Stores core voter information.

```sql
CREATE TABLE voters (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address VARCHAR(255),
  precinct_id INTEGER REFERENCES precincts(id),
  party_affiliation VARCHAR(50),
  registration_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voters_precinct ON voters(precinct_id);
CREATE INDEX idx_voters_party ON voters(party_affiliation);
CREATE INDEX idx_voters_registration ON voters(registration_date);
```

**Columns:**
- `id`: Unique identifier
- `first_name`: Voter first name (required)
- `last_name`: Voter last name (required)
- `email`: Email address (optional, unique)
- `phone`: Phone number (optional)
- `address`: Street address (required)
- `precinct_id`: Foreign key to precincts table
- `party_affiliation`: Political party (Democrat, Republican, Independent, etc.)
- `registration_date`: When voter registered
- `created_at`, `updated_at`: Timestamps

---

### voting_history
Records of voter participation in elections.

```sql
CREATE TABLE voting_history (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  election_type VARCHAR(50),
  voted BOOLEAN DEFAULT TRUE,
  party_voted VARCHAR(50),
  election_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voting_history_voter_year ON voting_history(voter_id, election_year);
CREATE INDEX idx_voting_history_voter ON voting_history(voter_id);
```

**Columns:**
- `id`: Unique identifier
- `voter_id`: Reference to voter (required)
- `election_year`: Year of election (e.g., 2020, 2022)
- `election_type`: Type of election (General, Midterm, Local, Primary)
- `voted`: Whether voter participated (true/false)
- `party_voted`: Party voter voted for
- `election_date`: Date of election
- `created_at`: Record creation date

---

### precincts
Geographical voting districts.

```sql
CREATE TABLE precincts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  precinct_code VARCHAR(20) UNIQUE NOT NULL,
  county VARCHAR(100),
  state VARCHAR(2),
  partisan_lean VARCHAR(50),
  registration_potential INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_precincts_code ON precincts(precinct_code);
CREATE INDEX idx_precincts_county ON precincts(county);
```

**Columns:**
- `id`: Unique identifier
- `name`: Precinct name (required)
- `precinct_code`: Unique precinct code (required)
- `county`: County name
- `state`: State abbreviation
- `partisan_lean`: Democratic, Republican, or Competitive
- `registration_potential`: 0-100 score for new voter potential
- `created_at`, `updated_at`: Timestamps

---

### turnout_history
Historical voter turnout data by precinct.

```sql
CREATE TABLE turnout_history (
  id SERIAL PRIMARY KEY,
  precinct_id INTEGER NOT NULL REFERENCES precincts(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  total_registered INTEGER,
  total_voted INTEGER,
  turnout_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_turnout_precinct_year ON turnout_history(precinct_id, election_year);
```

**Columns:**
- `id`: Unique identifier
- `precinct_id`: Reference to precinct (required)
- `election_year`: Year of election
- `total_registered`: Total registered voters
- `total_voted`: Total voters who voted
- `turnout_percentage`: Calculated turnout percentage
- `created_at`: Record creation date

---

### canvassing_activities
Records of canvassing interactions with voters.

```sql
CREATE TABLE canvassing_activities (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),
  notes TEXT,
  contact_result VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

CREATE INDEX idx_canvassing_voter ON canvassing_activities(voter_id);
CREATE INDEX idx_canvassing_created ON canvassing_activities(created_at);
CREATE INDEX idx_canvassing_result ON canvassing_activities(contact_result);
```

**Columns:**
- `id`: Unique identifier
- `voter_id`: Reference to voter (required)
- `activity_type`: Type of activity (door-knock, phone-call, email)
- `notes`: Canvasser notes
- `contact_result`: Outcome (reached, not-home, interested, not-interested, declined)
- `created_at`: When activity was logged
- `created_by`: Email of canvasser

---

### users
System users for authentication.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Columns:**
- `id`: Unique identifier
- `username`: Login username (required, unique)
- `email`: Email address (required, unique)
- `password_hash`: Hashed password (required)
- `first_name`: User first name
- `last_name`: User last name
- `role`: User role (admin, user, viewer)
- `is_active`: Account active status
- `created_at`, `updated_at`: Timestamps

---

## Relationships

```
users (1) ──── (many) canvassing_activities
              ↓ created_by

voters (1) ──── (many) voting_history
        └──── (many) canvassing_activities
        └──── (many) precincts

precincts (1) ──── (many) turnout_history
          └──── (many) voters
```

---

## Data Types

### Integer
- Used for: IDs, percentages, counts
- Examples: id, registration_potential, total_voted

### Varchar(n)
- Used for: Text fields with max length
- Examples: first_name VARCHAR(100), phone VARCHAR(20)

### Text
- Used for: Unlimited text
- Examples: notes TEXT

### Boolean
- Used for: Yes/No values
- Examples: voted BOOLEAN, is_active BOOLEAN

### Decimal(5,2)
- Used for: Percentages with 2 decimals
- Examples: turnout_percentage DECIMAL(5, 2)

### Date
- Used for: Dates without time
- Examples: election_date DATE

### Timestamp
- Used for: Dates with time
- Examples: created_at TIMESTAMP

---

## JSON Data Structures

### Voter Object (API)
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "phone": "555-0101",
  "address": "123 Main St",
  "precinct": "Precinct A",
  "partyAffiliation": "Democrat",
  "registrationDate": "2022-03-15",
  "votingHistory": [
    {
      "electionYear": 2020,
      "electionType": "General",
      "voted": true,
      "partyVoted": "Democrat",
      "electionDate": "2020-11-03"
    }
  ],
  "canvassingHistory": [
    {
      "id": 1,
      "type": "door-knock",
      "notes": "Interested in campaign",
      "contactResult": "Interested",
      "createdAt": "2026-05-08T10:30:00Z"
    }
  ]
}
```

### Super Pick Object (API)
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Smith",
  "phone": "555-0101",
  "address": "123 Main St",
  "precinct": "Precinct A",
  "superPickScore": 87,
  "consistencyScore": 100,
  "swingScore": 80,
  "persuasionScore": 85,
  "recencyScore": 90
}
```

### Precinct Object (API)
```json
{
  "id": 1,
  "name": "Precinct A",
  "precinctCode": "PA",
  "county": "County A",
  "state": "CA",
  "partisanLean": "Competitive",
  "registrationPotential": 75,
  "turnoutHistory": [0.65, 0.68, 0.70],
  "priorityScore": 87,
  "rank": 1
}
```

---

## CSV Import Formats

### Voters CSV
```
firstName,lastName,email,phone,address,precinct,partyAffiliation,registrationDate
John,Smith,john@example.com,555-0101,123 Main St,Precinct A,Democrat,2022-03-15
Jane,Doe,jane@example.com,555-0102,456 Oak Ave,Precinct B,Republican,2021-06-20
```

### Voting History CSV
```
voterId,electionYear,electionType,voted,partyVoted,electionDate
1,2020,General,true,Democrat,2020-11-03
1,2021,Local,true,Democrat,2021-05-15
2,2022,Midterm,false,,2022-11-08
```

---

## Validation Rules

### Voters
- `first_name` and `last_name`: Required, max 100 chars
- `address`: Required, max 255 chars
- `email`: Optional, must be valid email format
- `phone`: Optional, 10-20 chars
- `precinct`: Required
- `party_affiliation`: Optional, valid values (Democrat, Republican, Independent, Green, Libertarian, Other)
- `registration_date`: Optional, must be valid date

### Voting History
- `voter_id`: Required, must reference existing voter
- `election_year`: Required, 1900-2100
- `voted`: Required, boolean
- `party_voted`: Optional if voted=false, required if voted=true
- `election_date`: Optional but recommended

### Precincts
- `name`: Required, max 100 chars
- `precinct_code`: Required, unique, max 20 chars
- `partisan_lean`: Valid values (Democratic, Republican, Competitive)
- `registration_potential`: 0-100

---

## Indexes for Performance

```sql
-- Voter queries
CREATE INDEX idx_voters_precinct ON voters(precinct_id);
CREATE INDEX idx_voters_party ON voters(party_affiliation);
CREATE INDEX idx_voters_registration ON voters(registration_date);

-- Voting history queries
CREATE INDEX idx_voting_history_voter_year ON voting_history(voter_id, election_year);
CREATE INDEX idx_voting_history_voter ON voting_history(voter_id);

-- Precinct queries
CREATE INDEX idx_precincts_code ON precincts(precinct_code);
CREATE INDEX idx_precincts_county ON precincts(county);

-- Turnout queries
CREATE INDEX idx_turnout_precinct_year ON turnout_history(precinct_id, election_year);

-- Canvassing queries
CREATE INDEX idx_canvassing_voter ON canvassing_activities(voter_id);
CREATE INDEX idx_canvassing_created ON canvassing_activities(created_at);
CREATE INDEX idx_canvassing_result ON canvassing_activities(contact_result);

-- User queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```
