# Voter Tracking System - Server

Node.js/Express backend for the voter tracking system with PostgreSQL database.

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
cd server
npm install
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
DATABASE_URL=postgresql://user:password@localhost:5432/voter_tracking_db
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
```

### Database Setup

```bash
npm run db:migrate
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Voters (`/api/voters`)
- `GET /` - Get all voters with filters
- `GET /:id` - Get voter details
- `POST /` - Create new voter
- `PUT /:id` - Update voter
- `DELETE /:id` - Delete voter
- `POST /export` - Export voter data

### Precincts (`/api/precincts`)
- `GET /` - Get all precincts
- `GET /:id` - Get precinct details
- `GET /prioritize` - Get prioritized precincts

### Analysis (`/api/analysis`)
- `GET /win-number` - Get win number calculations
- `GET /turnout` - Get turnout analysis
- `GET /persuasion` - Get persuasion opportunities

### Canvassing (`/api/canvassing`)
- `POST /log` - Log canvassing activity
- `GET /history/:voterId` - Get activity history for voter

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - User registration

## Testing

```bash
npm test
```

With coverage:
```bash
npm run test:coverage
```

## Project Structure

```
src/
├── routes/        # API route definitions
├── controllers/   # Request handlers
├── models/        # Data models
├── middleware/    # Express middleware
├── services/      # Business logic services
├── utils/         # Helper functions
└── app.js         # Express app setup
```

## Development Guidelines

- Follow REST API best practices
- Use environment variables for configuration
- Implement proper error handling
- Write tests for critical functions
- Use consistent naming conventions
