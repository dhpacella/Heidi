# Docker Deployment Guide — Windows Server 2022

Self-hosted deployment of Heidi Voter Dashboard using Docker Compose on Windows Server 2022.

**System:** Intel Xeon E5-2623 v4 (8 cores, 64GB RAM)  
**Architecture:** Node.js app + PostgreSQL in Docker containers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install Docker](#install-docker)
3. [Setup Configuration](#setup-configuration)
4. [Deploy with Docker Compose](#deploy-with-docker-compose)
5. [Manage Services](#manage-services)
6. [Backups](#backups)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Windows Server 2022 (your machine)
- Administrator access
- Internet connection
- AWS account (for SES email & SNS SMS)

---

## Install Docker

### Step 1: Install Docker Desktop for Windows Server

Download from: https://www.docker.com/products/docker-desktop

**Or use PowerShell (recommended for server):**

```powershell
# Install Docker using package manager
choco install docker-desktop -y

# Or manual install:
# 1. Download Docker Desktop installer
# 2. Run installer as Administrator
# 3. Follow setup wizard
# 4. Restart your server
```

### Step 2: Verify Installation

```powershell
docker --version
docker run hello-world
```

Expected output:
```
Docker version 24.x.x, build xxxxxx
Hello from Docker!
```

### Step 3: Enable Docker Service (Auto-start)

```powershell
# Start Docker service
Start-Service Docker

# Verify it's running
Get-Service Docker

# Enable auto-start on reboot
Set-Service -Name Docker -StartupType Automatic
```

---

## Setup Configuration

### Step 1: Create `.env` File

In your project root: `C:\path\to\heidi-voter-dashboard\.env`

Copy from `.env.docker` and fill in your values:

```powershell
cd "C:\path\to\heidi-voter-dashboard"
Copy-Item .env.docker .env
```

### Step 2: Generate JWT Secret

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output: A 64-character random string. Copy this into `.env`:

```
JWT_SECRET=your_random_string_here
```

### Step 3: Get AWS Credentials

1. Go to AWS Console → IAM → Users → Your User
2. Create Access Key (or use existing)
3. Copy:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SES_FROM_EMAIL` (a verified sender in AWS SES)

### Step 4: Fill in `.env`

```env
NODE_ENV=production
DB_USER=heidi_user
DB_PASSWORD=your_secure_database_password_here
DB_NAME=voter_dashboard
JWT_SECRET=your_random_jwt_secret_64_chars
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJal...
SES_FROM_EMAIL=admin@yourdomain.com
AWS_REGION=us-east-2
```

**Save the file. Do NOT commit to git.**

---

## Deploy with Docker Compose

### Step 1: Build Docker Images

```powershell
cd "C:\path\to\heidi-voter-dashboard"

# Build the images
docker-compose build
```

Expected output:
```
Building app
...
Successfully tagged heidi-voter-dashboard_app:latest
```

### Step 2: Start Containers

```powershell
# Start in background
docker-compose up -d

# Watch startup logs
docker-compose logs -f
```

Wait for output like:
```
heidi-app    | ✅ Server started on port 5000
heidi-postgres | database system is ready to accept connections
```

### Step 3: Verify Services Are Running

```powershell
# List running containers
docker ps

# Should show:
# heidi-postgres   (healthy)
# heidi-app        (up)
```

### Step 4: Test the Application

```powershell
# Test health endpoint
curl http://localhost:5000/health

# Expected response:
# {"status":"ok","db":{"connected":true,"latencyMs":0},...}
```

---

## Manage Services

### View Logs

```powershell
# All containers
docker-compose logs

# Only app
docker-compose logs app

# Follow logs in real-time
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail 100
```

### Stop Services

```powershell
# Stop (keeps data)
docker-compose stop

# Stop specific service
docker-compose stop app
```

### Start Services

```powershell
# Start (if already stopped)
docker-compose start

# Start specific service
docker-compose start app
```

### Restart Services

```powershell
# Restart all
docker-compose restart

# Restart app
docker-compose restart app

# Restart after code changes
docker-compose down
docker-compose up -d
```

### View Resource Usage

```powershell
# Real-time stats
docker stats

# Specific container
docker stats heidi-app
```

---

## Access the Application

### Node.js Server (API)
```
http://localhost:5000
```

### PostgreSQL Database
```
Host: localhost
Port: 5432
User: heidi_user
Password: (from .env DB_PASSWORD)
Database: voter_dashboard
```

**Connect from PgAdmin or SQL client:**

```
postgresql://heidi_user:password@localhost:5432/voter_dashboard
```

---

## Backups

### Backup PostgreSQL Database

```powershell
# Backup to SQL file
docker-compose exec postgres pg_dump -U heidi_user voter_dashboard > backup-$(Get-Date -Format "yyyy-MM-dd").sql

# Restore from backup
cat backup-2026-05-15.sql | docker-compose exec -T postgres psql -U heidi_user voter_dashboard
```

### Backup Everything (Including App Data)

```powershell
# Create backup directory
mkdir C:\heidi-backups

# Copy PostgreSQL volume
docker run --rm -v heidi-voter-dashboard_postgres_data:/data -v C:\heidi-backups:/backup ^
  alpine tar czf /backup/postgres-backup-$(Get-Date -Format "yyyy-MM-dd").tar.gz -C /data .

# Copy .env and configuration
Copy-Item .env C:\heidi-backups\env-backup-$(Get-Date -Format "yyyy-MM-dd")
```

### Automated Daily Backup (Task Scheduler)

Create a PowerShell script: `C:\scripts\backup-heidi.ps1`

```powershell
$backupDir = "C:\heidi-backups"
$date = Get-Date -Format "yyyy-MM-dd-HHmm"

# Create backup directory if not exists
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir -Force
}

# Database backup
cd "C:\path\to\heidi-voter-dashboard"
docker-compose exec -T postgres pg_dump -U heidi_user voter_dashboard | Out-File "$backupDir\pg-dump-$date.sql"

# Keep only last 30 days
Get-ChildItem $backupDir -Filter "pg-dump-*.sql" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

Schedule in Task Scheduler:
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2 AM
4. Action: PowerShell script C:\scripts\backup-heidi.ps1

---

## Troubleshooting

### Port Already in Use

```powershell
# Check what's using port 5000
netstat -ano | findstr :5000

# Kill process (if safe)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml:
# ports:
#   - "5001:5000"  (change first number)
```

### Database Connection Failed

```powershell
# Check if PostgreSQL container is healthy
docker-compose ps

# If not healthy, check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Wait 30 seconds, then check health
docker-compose ps
```

### App Won't Start

```powershell
# View detailed logs
docker-compose logs app

# Rebuild images (fixes dependency issues)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check environment variables
docker-compose exec app env | findstr AWS
```

### Out of Disk Space

```powershell
# Check disk usage
docker system df

# Clean up unused images/containers
docker system prune -a

# Remove all volumes (WARNING: deletes data!)
docker volume prune
```

### Need to Access Container Terminal

```powershell
# Access app container
docker-compose exec app sh

# Access database container
docker-compose exec postgres psql -U heidi_user -d voter_dashboard
```

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment | `production` |
| `DB_USER` | Database user | `heidi_user` |
| `DB_PASSWORD` | Database password | `secure_pass_123` |
| `DB_NAME` | Database name | `voter_dashboard` |
| `JWT_SECRET` | Token secret | `64_char_random_string` |
| `AWS_REGION` | AWS region | `us-east-2` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJal...` |
| `SES_FROM_EMAIL` | Sender email (SES) | `admin@domain.com` |
| `PORT` | Server port | `5000` |

---

## Scaling Notes

Your system (8 cores, 64GB RAM) can handle:

- **Current allocation:**
  - Node.js: 2 cores, 2GB RAM
  - PostgreSQL: 4 cores, 8GB RAM
  - System: 2 cores, 4GB RAM

- **If you need more capacity:**
  ```yaml
  app:
    cpus: '4'        # Increase from 2
    mem_limit: 4g    # Increase from 2g
  postgres:
    cpus: '6'        # Increase from 4
    mem_limit: 12g   # Increase from 8g
  ```

---

## Next Steps

1. ✅ Deploy with Docker Compose
2. Test email sending: POST /api/email/send with AWS SES
3. Test SMS sending: POST /api/sms/send with AWS SNS
4. Set up automated backups
5. Monitor logs regularly

---

**Questions?** Check `docker-compose logs` output or AWS CloudWatch for SES/SNS errors.
