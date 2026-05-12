# Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- Git repository (push to GitHub or GitLab)
- PostgreSQL database on Railway

## Step 1: Connect Repository to Railway

1. Go to https://railway.app and log in
2. Click "New Project" → "Deploy from GitHub"
3. Authorize Railway to access your GitHub account
4. Select this repository (`heidi-voter-dashboard`)
5. Railway will auto-detect the `Procfile` and `railway.json`

## Step 2: Create PostgreSQL Database

1. In Railway project, click "New" → "Database" → "PostgreSQL"
2. Railway will create a PostgreSQL service and automatically provide `DATABASE_URL`
3. Note the connection details for migrations

## Step 3: Set Environment Variables

In Railway dashboard, go to **Variables** and set:

```
DATABASE_URL=postgresql://...  (auto-populated by Railway)
SESSION_SECRET=<generate-random-string>
JWT_SECRET=<generate-different-random-string>
JWT_EXPIRES_IN=8h
NODE_ENV=production
PORT=5000
CLIENT_URL=https://<your-railway-domain>.railway.app
```

### Generate Secure Secrets

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

## Step 4: Run Database Migrations

After deployment, SSH into the Railway container and run:

```bash
cd /app/server
npm run db:migrate
```

Or use Railway's shell in the dashboard:
1. Go to Deployments
2. Click the deployment
3. Click "Shell" tab
4. Run: `cd /app/server && npm run db:migrate`

## Step 5: Verify Deployment

1. Your app will be available at `https://<project-name>.railway.app`
2. Test the health endpoint: `https://<project-name>.railway.app/health`
3. Access the dashboard: `https://<project-name>.railway.app/dashboard`

## Troubleshooting

### Build Fails
- Check logs: Railway Dashboard → Deployments → Build Logs
- Verify `npm install` works in `server/` directory
- Check for missing dependencies in `package.json`

### Database Connection Error
- Verify `DATABASE_URL` is set in Variables
- Check PostgreSQL service is running
- Ensure migrations were run

### Authentication Issues
- Verify `SESSION_SECRET` and `JWT_SECRET` are set and secure
- Check `NODE_ENV=production`

### Port Issues
- Railway auto-assigns ports; set `PORT=5000` in Variables
- Railway will expose on port 443 (HTTPS)

## File Structure

```
heidi-voter-dashboard/
├── railway.json           ✅ Configuration file
├── Procfile              ✅ Start command
├── server/
│   ├── package.json      ✅ Dependencies
│   ├── .env.example      ✅ Environment template
│   ├── src/
│   │   ├── app.js        ✅ Express app
│   │   ├── db/
│   │   │   ├── connection.js
│   │   │   ├── migrations.js
│   │   │   └── schema.sql
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   └── public/
└── heidi_voter_dashboard_final_27.html
```

## Post-Deployment

### Import Voter Data

If you want to import voter data after deployment:

1. Via SSH/Shell in Railway:
   ```bash
   cd /app/server
   node src/scripts/importVoterData.js
   ```

2. Or upload CSV via dashboard upload feature

### Monitor Logs

Railway Dashboard → Deployments → Logs (real-time monitoring)

### Rollback

Railway keeps deployment history. Click a previous deployment to rollback instantly.

## Environment-Specific Notes

| Env | DATABASE_URL | NODE_ENV | SESSION_SECRET |
|-----|--------------|----------|---|
| Local | localhost:5432 | development | dev-secret-change-me |
| Railway | auto-provided | production | strong-random-string |

## Support

- Railway Docs: https://docs.railway.app
- PostgreSQL on Railway: https://docs.railway.app/databases/postgresql
- Node.js on Railway: https://docs.railway.app/guides/nodejs
