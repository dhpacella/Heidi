# Test Specifications - Voter Tracking System

## Test Strategy

- **Unit Tests**: Individual functions and utilities
- **Integration Tests**: API endpoints and database interactions
- **Component Tests**: React UI components
- **E2E Tests**: Full user workflows
- **Performance Tests**: Load and stress testing

---

## Unit Tests

### SuperPicksCalculator Tests

#### Test: calculateVoterScore
```javascript
describe('SuperPicksCalculator.calculateVoterScore', () => {
  test('should return 100 for perfect voter', () => {
    const voter = {
      votingHistory: [
        { voted: true, partyVoted: 'Democrat' },
        { voted: true, partyVoted: 'Democrat' },
        { voted: true, partyVoted: 'Democrat' }
      ],
      partyAffiliation: 'Democrat',
      registrationDate: '2020-01-01'
    };
    const score = calc.calculateVoterScore(voter);
    expect(score).toBeGreaterThanOrEqual(85);
  });

  test('should return low score for non-voter', () => {
    const voter = {
      votingHistory: [
        { voted: false },
        { voted: false },
        { voted: false }
      ]
    };
    const score = calc.calculateVoterScore(voter);
    expect(score).toBeLessThan(50);
  });

  test('should weight factors correctly', () => {
    // Test that consistency (40%) impacts score more than recency (15%)
  });
});
```

#### Test: scoreConsistency
```javascript
describe('SuperPicksCalculator.scoreConsistency', () => {
  test('should score 100 for 100% participation', () => {
    const history = [
      { voted: true },
      { voted: true },
      { voted: true }
    ];
    expect(calc.scoreConsistency(history)).toBe(100);
  });

  test('should score 66 for 66% participation', () => {
    const history = [
      { voted: true },
      { voted: true },
      { voted: false }
    ];
    expect(calc.scoreConsistency(history)).toBeCloseTo(66.67, 1);
  });

  test('should handle empty history', () => {
    expect(calc.scoreConsistency([])).toBe(0);
  });
});
```

#### Test: scoreSwingPotential
```javascript
describe('SuperPicksCalculator.scoreSwingPotential', () => {
  test('should identify swing voters', () => {
    const history = [
      { partyVoted: 'Democrat' },
      { partyVoted: 'Republican' },
      { partyVoted: 'Democrat' }
    ];
    const score = calc.scoreSwingPotential(history);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  test('should score 0 for consistent party voters', () => {
    const history = [
      { partyVoted: 'Democrat' },
      { partyVoted: 'Democrat' }
    ];
    expect(calc.scoreSwingPotential(history)).toBe(0);
  });
});
```

#### Test: identifySuperPicks
```javascript
describe('SuperPicksCalculator.identifySuperPicks', () => {
  test('should return only voters above threshold', () => {
    const voters = [...]; // Test data
    const picks = calc.identifySuperPicks(voters, { minScore: 70 });
    picks.forEach(voter => {
      expect(voter.superPickScore).toBeGreaterThanOrEqual(70);
    });
  });

  test('should respect limit parameter', () => {
    const voters = [...]; // Test data with 100+ voters
    const picks = calc.identifySuperPicks(voters, { limit: 50 });
    expect(picks.length).toBeLessThanOrEqual(50);
  });

  test('should filter by precinct', () => {
    const voters = [...]; // Test data
    const picks = calc.identifySuperPicks(voters, { precinct: 'Precinct A' });
    picks.forEach(voter => {
      expect(voter.precinct).toBe('Precinct A');
    });
  });
});
```

### VoterImporter Tests

#### Test: importFromCSV
```javascript
describe('VoterImporter.importFromCSV', () => {
  test('should parse valid CSV file', async () => {
    const voters = await VoterImporter.importFromCSV('sample_voters.csv');
    expect(voters).toHaveLength(10);
    expect(voters[0].firstName).toBe('John');
  });

  test('should handle missing optional fields', async () => {
    const voters = await VoterImporter.importFromCSV('voters_partial.csv');
    expect(voters[0].email).toBeUndefined();
  });

  test('should throw error for invalid file', async () => {
    await expect(VoterImporter.importFromCSV('nonexistent.csv')).rejects.toThrow();
  });
});
```

#### Test: validateVoter
```javascript
describe('VoterImporter.validateVoter', () => {
  test('should pass valid voter', () => {
    const voter = {
      firstName: 'John',
      lastName: 'Smith',
      address: '123 Main',
      precinct: 'A'
    };
    const result = VoterImporter.validateVoter(voter);
    expect(result.isValid).toBe(true);
  });

  test('should fail without firstName', () => {
    const voter = {
      lastName: 'Smith',
      address: '123 Main',
      precinct: 'A'
    };
    const result = VoterImporter.validateVoter(voter);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('firstName is required');
  });
});
```

---

## Integration Tests

### API Endpoint Tests

#### Test: GET /api/super-picks
```javascript
describe('GET /api/super-picks', () => {
  test('should return super picks', async () => {
    const response = await request(app)
      .get('/api/super-picks')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.superPicks).toBeInstanceOf(Array);
    expect(response.body.stats).toBeDefined();
  });

  test('should filter by minScore', async () => {
    const response = await request(app)
      .get('/api/super-picks?minScore=80')
      .set('Authorization', `Bearer ${token}`);
    
    response.body.superPicks.forEach(voter => {
      expect(voter.superPickScore).toBeGreaterThanOrEqual(80);
    });
  });

  test('should return 401 without auth', async () => {
    const response = await request(app)
      .get('/api/super-picks');
    
    expect(response.status).toBe(401);
  });
});
```

#### Test: POST /api/super-picks/import
```javascript
describe('POST /api/super-picks/import', () => {
  test('should import voters successfully', async () => {
    const response = await request(app)
      .post('/api/super-picks/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ filePath: 'sample_voters.csv' });
    
    expect(response.status).toBe(200);
    expect(response.body.stats.totalImported).toBeGreaterThan(0);
  });

  test('should return error for invalid file', async () => {
    const response = await request(app)
      .post('/api/super-picks/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ filePath: 'nonexistent.csv' });
    
    expect(response.status).toBe(400);
  });
});
```

#### Test: POST /api/super-picks/export-for-canvassing
```javascript
describe('POST /api/super-picks/export-for-canvassing', () => {
  test('should export CSV data', async () => {
    const response = await request(app)
      .post('/api/super-picks/export-for-canvassing')
      .set('Authorization', `Bearer ${token}`)
      .send({ minScore: 70, format: 'csv' });
    
    expect(response.status).toBe(200);
    expect(response.type).toMatch(/csv|text/);
  });
});
```

#### Test: GET /api/voters
```javascript
describe('GET /api/voters', () => {
  test('should filter by precinct', async () => {
    const response = await request(app)
      .get('/api/voters?precinct=PrecinctA')
      .set('Authorization', `Bearer ${token}`);
    
    response.body.voters.forEach(voter => {
      expect(voter.precinct).toBe('PrecinctA');
    });
  });

  test('should support pagination', async () => {
    const response = await request(app)
      .get('/api/voters?page=1&limit=50')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.body.voters.length).toBeLessThanOrEqual(50);
    expect(response.body.page).toBe(1);
  });
});
```

---

## Component Tests

### SuperPicks Component Tests

#### Test: SuperPicks rendering
```javascript
describe('SuperPicks Component', () => {
  test('should render statistics dashboard', () => {
    const stats = {
      totalVoters: 5000,
      superPickCount: 850,
      superPickPercentage: '17.00',
      averageScore: '76.50'
    };
    
    const { getByText } = render(<SuperPicks stats={stats} />);
    expect(getByText('Total Super Picks')).toBeInTheDocument();
    expect(getByText('850')).toBeInTheDocument();
  });

  test('should display category buttons', () => {
    const { getByText } = render(<SuperPicks />);
    expect(getByText(/Consistent Voters/i)).toBeInTheDocument();
    expect(getByText(/Swing Voters/i)).toBeInTheDocument();
  });

  test('should filter by score', async () => {
    const { getByDisplayValue, getByText } = render(<SuperPicks />);
    const input = getByDisplayValue('70');
    fireEvent.change(input, { target: { value: '80' } });
    fireEvent.click(getByText('Apply Filters'));
    
    // Verify API called with new score
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('minScore=80')
      );
    });
  });
});
```

#### Test: VoterImport Component
```javascript
describe('VoterImport Component', () => {
  test('should display upload form', () => {
    const { getByText } = render(<VoterImport />);
    expect(getByText('Import Voter Data')).toBeInTheDocument();
    expect(getByText('Import CSV')).toBeInTheDocument();
  });

  test('should show import results', async () => {
    const stats = {
      totalImported: 100,
      withVotingHistory: 95
    };
    
    const { getByText } = render(<VoterImport initialStats={stats} />);
    expect(getByText('Total Imported')).toBeInTheDocument();
    expect(getByText('100')).toBeInTheDocument();
  });
});
```

---

## E2E Tests

### Workflow: Import and Identify Super Picks
```javascript
describe('E2E: Super Picks Workflow', () => {
  test('complete workflow from import to export', async () => {
    // 1. Login
    const loginPage = await page.goto('http://localhost:3000/login');
    await page.type('input[name="email"]', 'user@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to Import
    await page.goto('http://localhost:3000/import');
    
    // 3. Upload CSV
    const input = await page.$('input[type="file"]');
    await input.uploadFile('sample_voters.csv');
    await page.click('button:contains("Import CSV")');
    
    // 4. Verify import results
    await page.waitForSelector('.import-results');
    const count = await page.$eval('.stat', el => el.textContent);
    expect(count).toContain('100');
    
    // 5. Navigate to Super Picks
    await page.goto('http://localhost:3000/super-picks');
    
    // 6. Verify super picks displayed
    const table = await page.$('table');
    expect(table).toBeTruthy();
    
    // 7. Export super picks
    await page.click('button:contains("Export for Door-Knocking")');
    
    // 8. Verify download
    await page.waitForFunction(() => {
      return document.documentElement.textContent.includes('Downloaded');
    });
  });
});
```

---

## Performance Tests

### Load Testing
```javascript
describe('Performance Tests', () => {
  test('should handle 1000 voters', async () => {
    const voters = generateTestVoters(1000);
    const start = Date.now();
    
    const picks = calc.identifySuperPicks(voters);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should complete in <1s
  });

  test('API should respond in <500ms', async () => {
    const start = Date.now();
    await request(app)
      .get('/api/super-picks?limit=100')
      .set('Authorization', `Bearer ${token}`);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
});
```

---

## Test Utilities

### Helper Functions
```javascript
// Generate test data
function generateTestVoter() {
  return {
    id: Math.random(),
    firstName: `Voter${Math.random()}`,
    lastName: 'Test',
    phone: '555-0000',
    address: '123 Test St',
    precinct: 'Precinct A',
    partyAffiliation: 'Democrat',
    votingHistory: generateVotingHistory(),
    registrationDate: '2022-01-01'
  };
}

// Generate voting history
function generateVotingHistory() {
  return [
    { electionYear: 2020, voted: true, partyVoted: 'Democrat' },
    { electionYear: 2021, voted: true, partyVoted: 'Democrat' },
    { electionYear: 2022, voted: true, partyVoted: 'Democrat' }
  ];
}

// Create authenticated request
async function authenticatedRequest(method, url, data = null) {
  const token = await getTestToken();
  return request(app)
    [method](url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}
```

---

## Test Coverage Goals

- Unit Tests: 80% coverage
- Integration Tests: 60% coverage  
- Component Tests: 75% coverage
- Critical paths: 100% coverage

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```
