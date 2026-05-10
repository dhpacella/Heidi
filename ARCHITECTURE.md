# Voter Tracking System - Project Architecture

## Overview
A full-stack voter tracking and door-knocking prioritization system built with React, Node.js, and PostgreSQL.

## System Architecture

```
┌─────────────────────────────────────┐
│       React Frontend (Port 3000)    │
│  - Dashboard                        │
│  - Voter Filtering                  │
│  - Precinct Prioritization          │
│  - Canvassing Tracking              │
│  - Data Export                      │
└────────────┬────────────────────────┘
             │ HTTP/REST
             │
┌────────────▼────────────────────────┐
│    Node.js/Express Backend (Port 5000)
│  - API Routes                       │
│  - Business Logic                   │
│  - Authentication                   │
│  - Data Processing                  │
└────────────┬────────────────────────┘
             │
             │ SQL
┌────────────▼────────────────────────┐
│   PostgreSQL Database               │
│  - Voter Data                       │
│  - Voting History                   │
│  - Precinct Information             │
│  - Canvassing Activities            │
│  - User Accounts                    │
└─────────────────────────────────────┘
```

## Core Features

### 1. Voter Management
- Import and store voter records
- Track voting history (3+ years)
- Filter by multiple criteria
- Prioritize voters based on voting patterns

### 2. Precinct Prioritization
Precincts are scored based on:
- **Partisan Lean**: Competitive vs. safe districts get higher priority
- **Registration Potential**: New voter registration opportunities
- **Turnout History**: Historical voter participation rates
- **Win Number**: Votes needed to win precinct
- **Persuasion Opportunities**: Potential swing voters

Priority Score = (Partisan × 0.3) + (Registration × 0.25) + (Turnout × 0.2) + (WinNumber × 0.15) + (Persuasion × 0.1)

### 3. Door-Knocking Prioritization
Voters are prioritized for door-knocking based on:
1. Voted in last 3 years (primary filter)
2. Assigned to top-priority precincts
3. Not yet canvassed or unsuccessful canvass

### 4. Canvassing Tracking
- Log door-knock interactions
- Track phone banking calls
- Record voter responses
- Monitor contact outcomes

### 5. Data Analytics
- Win number calculations
- Turnout analysis
- Persuasion opportunity identification
- Precinct performance metrics

### 6. Data Export
- Export filtered voter lists
- Multiple formats: CSV, JSON, PDF
- Customizable field selection
- Ready for mail merge or direct mail

## Technology Stack

### Frontend
- **React 18**: UI framework
- **Redux Toolkit**: State management
- **Axios**: HTTP client
- **React Router**: Navigation
- **Chart.js**: Data visualization

### Backend
- **Express.js**: Web framework
- **PostgreSQL**: Database
- **JWT**: Authentication
- **Bcrypt**: Password hashing
- **Dotenv**: Environment configuration

### Development Tools
- **Node.js 16+**: Runtime
- **npm**: Package manager
- **Jest**: Testing framework
- **Nodemon**: Auto-reload during development

## Database Schema

### Key Tables
- **voters**: Core voter information
- **voting_history**: Historical voting records
- **precincts**: Precinct definitions and metrics
- **turnout_history**: Historical turnout data
- **canvassing_activities**: Tracked interactions
- **users**: System user accounts

## API Endpoints

### Voters
- `GET /api/voters` - List voters with filters
- `GET /api/voters/:id` - Get voter details
- `POST /api/voters` - Create voter
- `PUT /api/voters/:id` - Update voter
- `POST /api/voters/export` - Export data

### Precincts
- `GET /api/precincts` - List all precincts
- `GET /api/precincts/prioritize` - Get prioritized list
- `GET /api/precincts/:id` - Get precinct details

### Analysis
- `GET /api/analysis/win-number` - Calculate win numbers
- `GET /api/analysis/turnout` - Get turnout analysis
- `GET /api/analysis/persuasion` - Identify persuasion opportunities

### Canvassing
- `POST /api/canvassing/log` - Log activity
- `GET /api/canvassing/history/:voterId` - Get activity history

## Data Flow

```
1. Voter imports CSV/database
   ↓
2. Data stored in PostgreSQL
   ↓
3. System calculates precinct priorities
   ↓
4. Frontend displays prioritized precincts & voters
   ↓
5. User filters voters (precinct, voting history, etc.)
   ↓
6. Canvassers log door-knock interactions
   ↓
7. Data aggregated for analytics
   ↓
8. Reports and exports generated
```

## Security Considerations

- JWT authentication for API access
- Password hashing with bcrypt
- Environment variables for sensitive config
- SQL injection prevention via parameterized queries
- CORS configuration for frontend access
- Rate limiting on API endpoints (to be implemented)

## Performance Optimization

- Database indexes on frequently queried fields
- Pagination for large voter lists
- Caching for precinct data (to be implemented)
- Lazy loading in React components
- API response compression

## Scalability Considerations

- Horizontal scaling of Node.js backend
- Database connection pooling
- Redis caching layer (future)
- Message queue for heavy processing (future)
- API rate limiting and throttling

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
NODE_ENV=production npm start
```

### Docker (Optional)
- Containerize frontend and backend
- Docker Compose for local development
- Deploy to container registry

## Monitoring & Logging

- Application logs in `logs/` directory
- Error tracking and reporting
- API request logging
- Database query monitoring

## Future Enhancements

1. Mobile app for field canvassing
2. Real-time notifications
3. Advanced segmentation algorithms
4. Integration with voter registration systems
5. SMS/Email campaign tracking
6. Predictive modeling for voter behavior
7. Multi-language support
8. Advanced reporting dashboards
