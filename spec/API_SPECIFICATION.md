# API Specification - Voter Tracking System

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except `/auth/login` and `/auth/register`) require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Voters API

### Get All Voters
```
GET /voters
Query Parameters:
  - precinct (string, optional): Filter by precinct
  - votedInYears (number, optional): Filter by voting history (1-10)
  - party (string, optional): Filter by party affiliation
  - page (number, default: 1): Pagination page
  - limit (number, default: 50): Records per page

Response: 200 OK
{
  "voters": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "phone": "555-0101",
      "address": "123 Main St",
      "precinct": "Precinct A",
      "partyAffiliation": "Democrat",
      "votingHistory": [],
      "registrationDate": "2022-03-15"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### Get Voter by ID
```
GET /voters/:id

Response: 200 OK
{
  "id": 1,
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "phone": "555-0101",
  "address": "123 Main St",
  "precinct": "Precinct A",
  "partyAffiliation": "Democrat",
  "votingHistory": [
    {
      "electionYear": 2020,
      "electionType": "General",
      "voted": true,
      "partyVoted": "Democrat"
    }
  ],
  "canvassingHistory": [],
  "registrationDate": "2022-03-15"
}
```

### Create Voter
```
POST /voters
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "phone": "555-0101",
  "address": "123 Main St",
  "precinct": "Precinct A",
  "partyAffiliation": "Democrat",
  "registrationDate": "2022-03-15"
}

Response: 201 Created
{
  "id": 1,
  "firstName": "John",
  "lastName": "Smith",
  ...
}
```

### Update Voter
```
PUT /voters/:id
Content-Type: application/json

{
  "phone": "555-9999",
  "partyAffiliation": "Republican"
}

Response: 200 OK
{
  "id": 1,
  "firstName": "John",
  "lastName": "Smith",
  ...
}
```

### Delete Voter
```
DELETE /voters/:id

Response: 204 No Content
```

### Export Voters
```
POST /voters/export
Content-Type: application/json

{
  "format": "csv",
  "filters": {
    "precinct": "Precinct A",
    "votedInYears": 3
  }
}

Response: 200 OK
<CSV data>
```

### Import Voters - Schema Detection
```
POST /voters/import/detect-schema
Content-Type: multipart/form-data

Request:
  - file: [CSV or Excel file]
  - mode: "auto" or "manual" (optional, default: "auto")

Response: 200 OK
{
  "detectedColumns": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "address": "Address",
    "precinct": "Precinct",
    "phone": "Phone",
    "email": "Email",
    "partyAffiliation": "Party",
    "age": "AgeRange",
    "gender": "Gender",
    "stateVoterId": "STATE ID",
    "voteFrequency": "OverAllFrequency"
  },
  "schema": "township" | "gop" | "generic",
  "rowCount": 4239,
  "preview": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "address": "456 Oak Ave",
      ...
    }
  ]
}
```

### Import Voters - Process
```
POST /voters/import/process
Content-Type: application/json

{
  "file": "base64_encoded_file_content",
  "columnMapping": {
    "firstName": "FirstName",
    "lastName": "LastName",
    ...
  },
  "mode": "simple" | "merge",
  "mergeKey": "stateVoterId"
}

Response: 200 OK
{
  "status": "success",
  "imported": 4239,
  "updated": 0,
  "skipped": 0,
  "merged": 0,
  "errors": [],
  "summary": {
    "totalProcessed": 4239,
    "byPrecinct": {
      "Precinct 001": 265,
      "Precinct 002": 287,
      ...
    },
    "byParty": {
      "Democrat": 1867,
      "Republican": 1549,
      "Independent": 823
    }
  }
}
```

### Import Voters - Merge Report (if merge mode)
```
{
  "status": "success",
  "mode": "merge",
  "newVotersAdded": 150,
  "existingVotersUpdated": 4089,
  "conflictsFlagged": 0,
  "mergeSummary": {
    "votingHistoryMerged": 4089,
    "partyAffiliationUpdated": 234,
    "demographicsUpdated": 567,
    "canvassingHistoryPreserved": 3987
  }
}
```

---

## Precincts API

### Get All Precincts
```
GET /precincts

Response: 200 OK
{
  "precincts": [
    {
      "id": 1,
      "name": "Precinct A",
      "precinctCode": "PA",
      "county": "County A",
      "state": "CA",
      "partisanLean": "Competitive",
      "registrationPotential": 75
    }
  ]
}
```

### Get Prioritized Precincts
```
GET /precincts/prioritize

Response: 200 OK
{
  "precincts": [
    {
      "id": 1,
      "name": "Precinct A",
      "precinctCode": "PA",
      "partisanLean": "Competitive",
      "registrationPotential": 75,
      "turnoutHistory": [0.65, 0.68, 0.70],
      "priorityScore": 87,
      "rank": 1
    }
  ]
}
```

### Get Precinct by ID
```
GET /precincts/:id

Response: 200 OK
{
  "id": 1,
  "name": "Precinct A",
  "precinctCode": "PA",
  ...
}
```

---

## Analysis API

### Get Win Number
```
GET /analysis/win-number?precinctId=1

Response: 200 OK
{
  "precinctId": 1,
  "precinctName": "Precinct A",
  "totalVoters": 5000,
  "registeredDemocrats": 2500,
  "registeredRepublicans": 1800,
  "registeredIndependents": 700,
  "winNumber": 2501,
  "assumptions": "Assumes 60% Democratic turnout, 40% Republican turnout"
}
```

### Get Turnout Analysis
```
GET /analysis/turnout

Response: 200 OK
{
  "precincts": [
    {
      "precinctId": 1,
      "precinctName": "Precinct A",
      "turnoutByYear": {
        "2020": 0.72,
        "2021": 0.45,
        "2022": 0.68
      },
      "averageTurnout": 0.62
    }
  ]
}
```

### Get Persuasion Opportunities
```
GET /analysis/persuasion

Response: 200 OK
{
  "opportunities": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Smith",
      "precinctId": 1,
      "persuasionScore": 85,
      "reason": "Recent party change"
    }
  ]
}
```

---

## Super Picks API

### Get Super Picks
```
GET /super-picks?minScore=70&limit=100&precinct=PrecinctA

Response: 200 OK
{
  "superPicks": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Smith",
      "phone": "555-0101",
      "precinct": "Precinct A",
      "superPickScore": 87,
      "consistencyScore": 100,
      "swingScore": 80,
      "persuasionScore": 85,
      "recencyScore": 90
    }
  ],
  "count": 50,
  "stats": {
    "totalVoters": 5000,
    "superPickCount": 50,
    "averageScore": 78.5
  }
}
```

### Get Super Picks by Category
```
GET /super-picks/categories

Response: 200 OK
{
  "consistentVoters": [...],
  "swingVoters": [...],
  "persuadableVoters": [...],
  "recentVoters": [...]
}
```

### Get Super Picks Statistics
```
GET /super-picks/stats

Response: 200 OK
{
  "totalVoters": 5000,
  "superPickCount": 850,
  "superPickPercentage": "17.00",
  "averageScore": "76.50",
  "topScore": 98,
  "bottomScore": 70
}
```

### Import Voters
```
POST /super-picks/import
Content-Type: application/json

{
  "filePath": "/uploads/voters.csv"
}

Response: 200 OK
{
  "message": "Voters imported successfully",
  "stats": {
    "totalImported": 5000,
    "byPrecinct": { "Precinct A": 1200, "Precinct B": 900 },
    "byParty": { "Democrat": 2000, "Republican": 1500 },
    "withVotingHistory": 4500
  }
}
```

### Export for Canvassing
```
POST /super-picks/export-for-canvassing
Content-Type: application/json

{
  "minScore": 80,
  "format": "csv",
  "precinct": "Precinct A"
}

Response: 200 OK (CSV file)
firstName,lastName,phone,address,precinct,superPickScore
John,Smith,555-0101,123 Main St,Precinct A,87
```

---

## Canvassing API

### Log Canvassing Activity
```
POST /canvassing/log
Content-Type: application/json

{
  "voterId": 1,
  "type": "door-knock",
  "notes": "Voter expressed interest",
  "contactResult": "Interested"
}

Response: 201 Created
{
  "id": 1,
  "voterId": 1,
  "type": "door-knock",
  "notes": "Voter expressed interest",
  "contactResult": "Interested",
  "createdAt": "2026-05-08T10:30:00Z"
}
```

### Get Canvassing History
```
GET /canvassing/history/:voterId

Response: 200 OK
{
  "voterId": 1,
  "activities": [
    {
      "id": 1,
      "type": "door-knock",
      "notes": "Voter expressed interest",
      "contactResult": "Interested",
      "createdAt": "2026-05-08T10:30:00Z",
      "createdBy": "user@example.com"
    }
  ]
}
```

---

## Authentication API

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response: 201 Created
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "details": "Field 'phone' is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Voter with id 999 not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Status Codes
- `200 OK` - Successful GET/PUT/DELETE
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE (no response body)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
