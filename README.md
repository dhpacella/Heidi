# Voter Tracking System

A comprehensive full-stack application for tracking voter history, analyzing voting patterns, and prioritizing door-knocking efforts based on precinct indicators.

## Features

### Core Functionality
- **Voter Management**: Import, store, and manage voter data with historical voting records
- **Super Picks Identification**: Multi-factor scoring algorithm to identify high-value voters
  - Voting consistency (40%)
  - Swing potential (25%)
  - Persuadability (20%)
  - Recency of voting (15%)
- **Precinct Prioritization**: Sort precincts by key indicators including:
  - Partisan lean
  - Registration potential
  - Turnout history
  - Turnout & Win Number Calculator
  - Canvassing & Phone Banking metrics
  - Persuasion opportunity scores
- **Advanced Filtering**: Filter voters by various criteria (3-year voting history, precinct, demographics, etc.)
- **Data Export**: Export filtered data in multiple formats (CSV, JSON, PDF)
- **Analytics Dashboard**: View key metrics and voter insights
- **Canvassing Tracking**: Log door-knocking and phone banking interactions

### Super Picks Feature ⭐
Intelligently identifies voters most likely to be persuaded and vote:
- **Consistent Voters** - Vote in every election
- **Swing Voters** - Changed party affiliation recently
- **Persuadable Voters** - High likelihood of being influenced
- **Recent Voters** - Voted recently, likely to vote again

### Door-Knocking Priority
The system prioritizes voters who voted in the last 3 years, sorted by:
1. Super pick score (highest priority)
2. Precinct priority indicators
3. Contact availability

## Project Structure

```
├── .github/
│   └── copilot-instructions.md
├── server/                    # Node.js/Express backend
│   ├── src/
│   │   ├── models/           # Data models (Voter, Precinct, etc.)
│   │   ├── routes/           # API endpoints
│   │   ├── controllers/      # Business logic
│   │   ├── middleware/       # Authentication, error handling
│   │   ├── services/         # Database services
│   │   ├── utils/            # Helper functions
│   │   └── app.js            # Express app setup
│   ├── tests/                # Test files
│   ├── .env.example          # Environment variables template
│   └── package.json
├── client/                   # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── redux/            # Redux store and actions
│   │   ├── services/         # API client services
│   │   ├── utils/            # Helper functions
│   │   └── App.js
│   └── package.json
└── README.md
```

## Tech Stack

- **Frontend**: React with TypeScript, Redux, Chart.js
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Testing**: Jest, React Testing Library

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. Clone the repository
2. Install root dependencies: `npm install`
3. Install server dependencies: `cd server && npm install`
4. Install client dependencies: `cd client && npm install`

### Configuration

1. Set up environment variables in `server/.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/voter_db
   JWT_SECRET=your_secret_key
   PORT=5000
   NODE_ENV=development
   ```

2. Initialize the database:
   ```bash
   cd server
   npm run db:migrate
   ```

### Running the Project

Development mode (runs both server and client):
```bash
npm run dev
```

Or run individually:
```bash
npm run server  # Terminal 1
npm run client  # Terminal 2
```

## API Endpoints

### Voters
- `GET /api/voters` - Get all voters with filters
- `GET /api/voters/:id` - Get voter details
- `POST /api/voters` - Create new voter
- `PUT /api/voters/:id` - Update voter
- `DELETE /api/voters/:id` - Delete voter
- `POST /api/voters/export` - Export voter data

### Precincts
- `GET /api/precincts` - Get all precincts
- `GET /api/precincts/:id` - Get precinct details
- `GET /api/precincts/prioritize` - Get prioritized precincts

### Analysis
- `GET /api/analysis/win-number` - Get win number calculations
- `GET /api/analysis/turnout` - Get turnout analysis
- `GET /api/analysis/persuasion` - Get persuasion opportunities

## Features in Development

- Real-time canvassing tracking
- Advanced segmentation algorithms
- Integration with voter registration databases
- Mobile app for field canvassing

## Testing

Run tests with:
```bash
npm test
```

## License

MIT
