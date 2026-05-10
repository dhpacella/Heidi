# Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Node.js 16+ installed
- PostgreSQL 12+ installed

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

2. **Configure Database**
   ```bash
   # Create database
   psql -U postgres -c "CREATE DATABASE voter_tracking_db;"
   
   # Create server/.env
   cat > server/.env << EOF
   DATABASE_URL=postgresql://postgres:password@localhost:5432/voter_tracking_db
   JWT_SECRET=dev_secret_key_change_in_production
   PORT=5000
   NODE_ENV=development
   EOF
   ```

3. **Initialize Database**
   ```bash
   psql -U postgres -d voter_tracking_db -f server/src/db/schema.sql
   ```

4. **Start Development Servers**
   
   Terminal 1:
   ```bash
   npm run server
   ```
   
   Terminal 2:
   ```bash
   npm run client
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health check: http://localhost:5000/health

## Key Features

### Door-Knocking Prioritization
1. Navigate to "Voter Filter"
2. Select voters who voted in last 3 years
3. Sort by "Precinct Prioritization"
4. Start canvassing from top precincts

### Filter Voters
- By precinct
- By voting history (3 years or custom)
- By party affiliation
- By age range

### Export Data
1. Go to "Data Export"
2. Select format (CSV, JSON, PDF)
3. Apply filters
4. Download file

### Log Canvassing
1. Go to "Canvassing & Phone Banking"
2. Click "Log Door Knock" or "Log Phone Call"
3. Enter voter ID and outcome
4. View activity history

### View Analytics
1. Dashboard shows:
   - Total voters
   - Last 3-year voters
   - Precinct metrics
   - Canvassing progress

## Project Structure

```
├── client/              React frontend
├── server/              Node.js backend
├── .github/             GitHub config
├── SETUP_GUIDE.md       Detailed setup
├── ARCHITECTURE.md      System design
├── CONTRIBUTING.md      Development guidelines
├── README.md            Project overview
└── package.json         Root dependencies
```

## Useful Commands

### Development
```bash
npm run dev              # Run both frontend and backend
npm run server           # Backend only
npm run client           # Frontend only
npm test                 # Run all tests
```

### Database
```bash
npm run db:migrate       # Run migrations
```

### Production Build
```bash
npm run build            # Build both projects
NODE_ENV=production npm start  # Run production
```

## Troubleshooting

**Port 5000/3000 already in use?**
```bash
# Change port in server/.env or kill the process
lsof -i :5000  # Find process on port 5000
kill -9 <PID>  # Kill the process
```

**Database connection error?**
```bash
# Check PostgreSQL is running
psql -U postgres -c "\l"  # List databases

# Verify connection string in server/.env
# Format: postgresql://user:password@localhost:5432/dbname
```

**Modules not found?**
```bash
# Reinstall dependencies
rm -rf node_modules server/node_modules client/node_modules
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## Next Steps

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand system design
2. Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup
3. Check [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
4. Start developing features!

## Support

For issues or questions, check:
- README.md - Project overview
- ARCHITECTURE.md - System design
- SETUP_GUIDE.md - Detailed setup steps
- Individual component README.md files

Happy coding! 🎯
