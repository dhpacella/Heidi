# Project Setup Guide

## Prerequisites Installation

Before running the project, ensure you have the following installed:

### 1. Node.js and npm
Download and install from [https://nodejs.org/](https://nodejs.org/)
- Recommended: LTS version (16+)
- This will include npm automatically

**Verify installation:**
```bash
node --version
npm --version
```

### 2. PostgreSQL
Download and install from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- Recommended: PostgreSQL 12 or later
- During installation, remember the password for the `postgres` user

**Verify installation:**
```bash
psql --version
```

## Project Setup Steps

### 1. Navigate to Project Directory
```bash
cd "path/to/Heidis Filter Code"
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Install Server Dependencies
```bash
cd server
npm install
cd ..
```

### 4. Install Client Dependencies
```bash
cd client
npm install
cd ..
```

### 5. Database Setup

#### Create Database
```bash
psql -U postgres
# In psql prompt:
CREATE DATABASE voter_tracking_db;
```

#### Create .env file in server directory
```bash
cd server
# Create .env based on .env.example
# Edit with your database credentials
```

#### Run Migrations (optional, when migration files are created)
```bash
npm run db:migrate
```

### 6. Run Development Servers

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

The application will be available at `http://localhost:3000`

## Development Commands

### Root Level
- `npm run dev` - Run both server and client concurrently
- `npm test` - Run all tests
- `npm run build` - Build both server and client

### Server Only
```bash
cd server
npm run dev      # Development with hot reload
npm start        # Production mode
npm test         # Run tests
npm run db:migrate # Run database migrations
```

### Client Only
```bash
cd client
npm start        # Development with hot reload
npm run build    # Production build
npm test         # Run tests
```

## Troubleshooting

### Port Already in Use
If port 5000 or 3000 is already in use:
1. Change the PORT in `server/.env`
2. Change the proxy in `client/package.json`

### Database Connection Issues
1. Verify PostgreSQL is running: `psql -U postgres`
2. Check DATABASE_URL in `server/.env`
3. Ensure database exists: `psql -U postgres -l | grep voter_tracking_db`

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -r node_modules server/node_modules client/node_modules
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## Project Structure Overview

```
Heidis Filter Code/
├── .github/
│   └── copilot-instructions.md
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Data models
│   │   ├── utils/         # Helper functions
│   │   └── app.js         # Express setup
│   ├── .env               # Environment variables
│   └── package.json
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── redux/         # Redux store
│   │   └── services/      # API calls
│   └── package.json
├── package.json           # Root package
└── README.md
```

## Next Steps

1. Complete Node.js and PostgreSQL installation
2. Follow the setup steps above
3. Create database and configure `.env` files
4. Run `npm run dev` to start development servers
5. Visit `http://localhost:3000` in your browser

## Additional Resources

- [Express Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Redux Documentation](https://redux.js.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
