# Local Development Setup

## Quick Start

### 1. Initialize SQLite Database

```bash
cd server
python3 init-sqlite-db.py
```

This creates `heidi-dev.db` with all tables and an admin user.

**Admin credentials:** `admin@test.com` / `Admin123!`

### 2. Install Dependencies

```bash
npm install
```

Make sure `sqlite3` is in package.json. If not, install it:
```bash
npm install sqlite3
```

### 3. Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server runs on http://localhost:5000

### 4. Access the App

- **Login:** http://localhost:5000/login
- **Dashboard:** http://localhost:5000/dashboard
- **Admin Panel:** http://localhost:5000/admin

Login with:
- Email: `admin@test.com`
- Password: `Admin123!`

## Configuration

The app uses `.env.local` for local development. It's configured to use SQLite by default:

```
DATABASE_URL=sqlite:heidi-dev.db
NODE_ENV=development
```

### Switch to PostgreSQL (Optional)

If you want to test against RDS instead:

1. Edit `.env.local`:
```
DATABASE_URL=postgresql://ebroot:etMf3W5t4EchcjG@heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

2. Restart the server

## Database

### SQLite (Local Development)

- File: `heidi-dev.db`
- Reset/reinitialize:
  ```bash
  rm heidi-dev.db
  python3 init-sqlite-db.py
  ```

### PostgreSQL (Production/Testing)

- Endpoint: `heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com`
- Username: `ebroot`
- Password: See RDS console or ask Dominic
- Region: us-east-2

## Troubleshooting

### "Cannot find module 'sqlite3'"
```bash
npm install sqlite3
```

### SQLite database locked
- Restart the server
- Make sure only one instance is running

### Admin login fails
1. Reset database:
   ```bash
   rm heidi-dev.db
   python3 init-sqlite-db.py
   ```
2. Clear browser cookies
3. Try login again

### Email/SMS features not working locally
These require AWS credentials (SES for email, SNS for SMS). Configure in `.env.local`:
```
AWS_SES_REGION=us-east-2
AWS_SNS_REGION=us-east-2
```

## Features

All features work locally with SQLite:
- ✅ Admin panel (user management)
- ✅ Voter management
- ✅ Email campaigns (SES not needed for local testing)
- ✅ SMS campaigns (SNS not needed for local testing)
- ✅ Email templates
- ✅ Lists and segments
- ✅ Analytics

## Git Ignore

`.env.local` and `heidi-dev.db` are in `.gitignore`, so they won't be committed.

Create your own `.env.local` when you clone the repo.
