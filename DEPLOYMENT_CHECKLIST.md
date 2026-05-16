# Deployment Checklist — Docker Compose

Complete these steps in order. ✅ = done

---

## Pre-Deployment

- [ ] **Docker installed** → `docker --version` returns version number
- [ ] **AWS credentials ready**:
  - [ ] AWS Access Key ID (AKIA...)
  - [ ] AWS Secret Access Key (wJal...)
  - [ ] SES verified sender email
- [ ] **.env file created** at: `C:\path\to\heidi-voter-dashboard\.env`

---

## Step 1: Verify Setup

```powershell
cd "C:\path\to\heidi-voter-dashboard"

# Verify .env exists
Test-Path .env

# Verify docker-compose.yml exists
Test-Path docker-compose.yml
```

✅ Both files exist? Continue to Step 2.

---

## Step 2: Edit .env File

```powershell
notepad .env
```

**Fill in these three lines (REQUIRED):**

```env
AWS_ACCESS_KEY_ID=AKIA...your_key...
AWS_SECRET_ACCESS_KEY=wJal...your_secret...
SES_FROM_EMAIL=admin@yourdomain.com
```

**These are optional (already filled):**
```env
DB_PASSWORD=heidi_secure_password_2026
JWT_SECRET=89700ab131f3722d367656c3cb3b71663f152a96ba77b2bae86395b46a84aba9
```

✅ Saved? Continue to Step 3.

---

## Step 3: Build Docker Images

```powershell
cd "C:\path\to\heidi-voter-dashboard"
docker-compose build
```

**Expected output:**
```
Building app
Successfully tagged heidi-voter-dashboard_app:latest
```

⏱️ This takes 2-5 minutes. ☕

---

## Step 4: Start Containers

```powershell
docker-compose up -d
```

**Expected output:**
```
Creating heidi-postgres ... done
Creating heidi-app ... done
```

---

## Step 5: Verify Services Running

```powershell
docker-compose ps
```

**Expected output:**
```
NAME                COMMAND              STATUS
heidi-postgres      postgres             Up (healthy)
heidi-app           node src/app.js      Up
```

✅ Both "Up"? Continue to Step 6.

---

## Step 6: Check Logs

```powershell
docker-compose logs
```

**Expected (last lines):**
```
heidi-app    | ✅ Server started on port 5000
heidi-postgres | database system is ready to accept connections
```

✅ See "Server started"? Continue to Step 7.

---

## Step 7: Test API Health

```powershell
curl http://localhost:5000/health
```

**Expected response:**
```json
{"status":"ok","db":{"connected":true,"latencyMs":0},"uptime":X,...}
```

✅ See `"status":"ok"`? You're deployed! 🎉

---

## Step 8: Login to Dashboard

Open browser:
```
http://localhost:5000
```

**Credentials:**
```
Email: admin@test.com
Password: Admin123!
```

✅ Login successful? Deployment complete! 🚀

---

## Troubleshooting

### Docker not found after installation
```powershell
# Restart PowerShell
# Close and reopen PowerShell as Administrator
# Try again: docker --version
```

### Port 5000 already in use
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
docker-compose down
docker-compose up -d
```

### AWS credentials rejected
```powershell
# Verify in .env file:
cat .env | findstr AWS

# Check CloudWatch for SES/SNS errors
# Verify credentials in AWS Console
```

### Database connection failed
```powershell
docker-compose logs postgres
docker-compose restart postgres
docker-compose logs -f
```

### Containers won't start
```powershell
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f
```

---

## Once Deployed ✅

### View Logs
```powershell
docker-compose logs -f app        # App logs
docker-compose logs -f postgres   # Database logs
docker-compose logs -f            # All logs
```

### Manage Services
```powershell
docker-compose stop               # Stop all
docker-compose start              # Start all
docker-compose restart app        # Restart app
docker-compose down               # Stop & remove
```

### Backup Database
```powershell
docker-compose exec postgres pg_dump -U heidi_user voter_dashboard > backup.sql
```

### Access Database
```powershell
docker-compose exec postgres psql -U heidi_user -d voter_dashboard
# Then: SELECT * FROM users;
```

---

## Next: Test Campaigns

1. Go to: `http://localhost:5000/email-compose`
2. Upload CSV with voter emails
3. Write campaign with tokens: `Hello {first_name}!`
4. Send blast
5. Check AWS CloudWatch for SES delivery logs

---

**Questions?** Check `DOCKER_DEPLOYMENT.md` or run:
```powershell
docker-compose logs -f
```
