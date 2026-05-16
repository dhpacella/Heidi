# Quick Start — Windows Server 2022

**Get Heidi running in 5 minutes with Docker Compose**

---

## Prerequisites

- Windows Server 2022 ✅
- Docker Desktop installed ✅
- AWS credentials (SES + SNS) ✅

---

## 5-Minute Setup

### 1️⃣ Create Environment File (1 min)

```powershell
cd "C:\path\to\heidi-voter-dashboard"
Copy-Item .env.docker .env
notepad .env
```

Edit `.env` — fill in these values:

```env
DB_PASSWORD=your_secure_password_here
JWT_SECRET=generate_with_node_-e_console_log_require_crypto_randomBytes_32_toString_hex
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJal...
SES_FROM_EMAIL=admin@yourdomain.com
```

**To generate JWT_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output into .env
```

**Save and close.** ✅

### 2️⃣ Start Docker Containers (2 min)

```powershell
docker-compose build
docker-compose up -d
```

Wait for:
```
heidi-postgres is now accepting connections
heidi-app | ✅ Server started on port 5000
```

### 3️⃣ Verify It's Working (1 min)

```powershell
# Check containers are running
docker-compose ps

# Test the API
curl http://localhost:5000/health
```

Expected response:
```json
{"status":"ok","db":{"connected":true},...}
```

### 4️⃣ Login to Dashboard (1 min)

Open browser:
```
http://localhost:5000/login
```

**Credentials:**
- Email: `admin@test.com`
- Password: `Admin123!`

You're in! ✅

---

## Common Commands

```powershell
# View logs
docker-compose logs -f

# Stop services
docker-compose stop

# Start services
docker-compose start

# Restart after code changes
docker-compose down
docker-compose up -d

# View database
docker-compose exec postgres psql -U heidi_user -d voter_dashboard
```

---

## Next: Send Your First Campaign

1. Go to **Email Compose** → Upload CSV with voter emails
2. Write your message with tokens: `Hello {first_name}!`
3. Click "Send Campaign"
4. Check AWS CloudWatch for SES delivery logs

---

## Troubleshooting

**Port 5000 already in use?**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Containers won't start?**
```powershell
docker-compose logs postgres
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

**Database connection failed?**
```powershell
docker-compose restart postgres
docker-compose exec postgres psql -U heidi_user -c "SELECT 1"
```

---

## Full Documentation

- **Detailed setup:** `DOCKER_DEPLOYMENT.md`
- **Deployment options:** `DEPLOYMENT_STRATEGY.md`
- **Architecture:** `README.md`

---

**Done!** You now have Heidi running on your Windows Server with Docker Compose. 🎉

Next: Test sending emails and SMS campaigns.
