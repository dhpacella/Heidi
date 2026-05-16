# Deployment Strategy — Two-Tier Architecture

**Primary:** Docker Compose (Self-Hosted Windows Server)  
**Backup:** CloudFormation/Elastic Beanstalk (Cloud Fallback)

---

## Overview

This project supports two independent deployment paths. You control which to use based on your needs.

```
┌─────────────────────────────────────────────────────────────┐
│         Heidi Voter Dashboard — Deployment Paths            │
└─────────────────────────────────────────────────────────────┘

  PRIMARY (Recommended)              BACKUP (Optional)
  ==================                 ==================
  Docker Compose                     CloudFormation + EB
  Windows Server 2022                AWS Cloud
  8 cores, 64GB RAM                  Auto-scaling
  Your Hardware                      Managed Infrastructure
  Full Control                       Less Control
  No Surprises ✅                    Historical Risk ⚠️
```

---

## Path 1: Docker Compose (PRIMARY) ✅ **Use This**

**When:** Daily operations, development, small-to-medium campaigns  
**Where:** Your dedicated Windows Server 2022  
**Cost:** $0 (your hardware)  
**Control:** 100% (your data, your server)

### Quick Start
```powershell
cd "C:\path\to\heidi-voter-dashboard"
Copy-Item .env.docker .env
# Edit .env with AWS credentials
docker-compose up -d
```

### Documentation
- **Setup Guide:** `DOCKER_DEPLOYMENT.md`
- **Management:** Docker CLI commands (stop, restart, logs, backup)
- **Scaling:** Adjust resource limits in `docker-compose.yml`
- **Backups:** Built-in PostgreSQL backup procedures

### Resources Allocated
- **Node.js App:** 2 cores, 2GB RAM
- **PostgreSQL:** 4 cores, 8GB RAM
- **System Reserve:** 2 cores, 4GB RAM
- **Available:** 54GB RAM unused (room to scale)

### Monitoring
```powershell
docker-compose ps          # Status
docker-compose logs -f     # Live logs
docker stats              # Resource usage
```

### Backup Strategy
```powershell
# Daily automated backups via Task Scheduler
# Manual backup:
docker-compose exec postgres pg_dump -U heidi_user voter_dashboard > backup.sql
```

---

## Path 2: CloudFormation/EB (BACKUP) ⏸️ **Keep Ready, Don't Use**

**When:** If Docker Compose fails AND you need immediate cloud failover  
**Where:** AWS Elastic Beanstalk (multi-region, auto-scaling)  
**Cost:** ~$50-200/month depending on load  
**Control:** AWS manages infrastructure (less control, more risk)

### Why It's Kept
- Historical code investment (already built)
- Emergency fallback if your server goes down
- Option to scale if campaign grows beyond server capacity
- No setup needed — just run `eb deploy`

### Known Issues
⚠️ **EB has caused data loss in the past** — use only as backup, not primary

### How to Deploy (if needed)
```bash
# Only if Docker Compose is down and you need emergency scaling
cd heidi-voter-dashboard
eb init
eb create heidi-production
eb deploy
```

### When to Consider EB
1. Your server hardware fails AND offline recovery time is critical
2. Campaign load exceeds 8 cores (scale up to multiple instances)
3. You need geographic redundancy
4. You want AWS to manage infrastructure

---

## Recommended Workflow

### Normal Operations (99% of the time)
```
You → Docker Compose (Windows Server) → PostgreSQL (local) → AWS SES/SNS
      ↓
   Email/SMS via AWS APIs
   Data stored locally
   Full control
```

### Emergency Failover (if server down)
```
Server Down
   ↓
Wait for recovery
   OR
Deploy to EB as temporary backup
   ↓
Resume on Docker Compose when server is back
```

---

## Comparison Table

| Aspect | Docker Compose | CloudFormation/EB |
|--------|---|---|
| **Setup Time** | 15 minutes | 20 minutes |
| **Cost** | $0 | $50-200/mo |
| **Control** | 100% | AWS managed |
| **Data Safety** | Your responsibility | AWS responsibility |
| **Backup Ease** | Very easy | Complex |
| **Scaling** | Manual (CPU/RAM limits) | Automatic (instances) |
| **Reliability** | Proven (3+ months) | Variable (past issues) |
| **Recovery Time** | Minutes (local restart) | 5-10 min (EB deploy) |
| **Network Isolation** | Your network | Public AWS |
| **Recommended** | ✅ **YES** | ⏸️ Keep ready |

---

## Decision Tree

```
Do you want to deploy NOW?
├─ YES
│  └─ Docker Compose
│     ├─ Install Docker Desktop
│     ├─ Copy .env.docker → .env
│     ├─ docker-compose up -d
│     └─ Done ✅
│
└─ NO (will use EB instead)
   └─ CloudFormation/EB
      ├─ Set up EB environment
      ├─ eb deploy
      └─ Done (but keep Docker Compose code updated)
```

---

## File Structure

```
heidi-voter-dashboard/
├─ docker-compose.yml          ← PRIMARY: Docker Compose config
├─ .env.docker                 ← PRIMARY: Environment template
├─ DOCKER_DEPLOYMENT.md        ← PRIMARY: Setup guide
├─ server/
│  ├─ Dockerfile               ← PRIMARY: Node.js container
│  ├─ .dockerignore            ← PRIMARY: Clean builds
│  └─ src/
│     └─ app.js                ← Your app (works in both)
├─ .ebextensions/              ← BACKUP: EB configuration
├─ eb.yml                       ← BACKUP: EB config
├─ CloudFormation/             ← BACKUP: CloudFormation templates
└─ DEPLOYMENT_STRATEGY.md      ← This file
```

---

## Health Checks

### Docker Compose Health
```powershell
# All services running?
docker-compose ps

# App responding?
curl http://localhost:5000/health

# Database connected?
docker-compose exec postgres psql -U heidi_user -c "SELECT 1"
```

### EB Health (if deployed)
```bash
# Status
eb status

# Logs
eb logs

# SSH into instance
eb ssh
```

---

## Migration Path (if needed)

### From Docker Compose → EB (if scaling needed)
1. Export PostgreSQL from Docker:
   ```powershell
   docker-compose exec postgres pg_dump -U heidi_user voter_dashboard > migration.sql
   ```
2. Set up RDS instance in AWS
3. Import data:
   ```bash
   psql -h your-rds-endpoint.rds.amazonaws.com -U admin -d voter_dashboard < migration.sql
   ```
4. Update EB environment variables with RDS endpoint
5. Deploy to EB

### From EB → Docker Compose (if returning to self-hosted)
1. Export from RDS:
   ```bash
   pg_dump -h your-rds-endpoint -U admin voter_dashboard > backup.sql
   ```
2. Import into Docker PostgreSQL:
   ```powershell
   cat backup.sql | docker-compose exec -T postgres psql -U heidi_user voter_dashboard
   ```
3. Restart Docker Compose

---

## Support & Troubleshooting

**Docker Compose Issues:**
- Check: `DOCKER_DEPLOYMENT.md` → Troubleshooting section
- Logs: `docker-compose logs -f`
- Resources: `docker stats`

**EB Issues:**
- Check: `.ebextensions/` configuration
- Logs: `eb logs --stream`
- SSH: `eb ssh` (if needed)

**Both Paths:**
- AWS SES/SNS: Check CloudWatch
- Database: Use `psql` CLI
- Network: Check firewall rules

---

## Summary

✅ **You have:**
- **PRIMARY:** Docker Compose on Windows Server (recommended, no EB risk)
- **BACKUP:** CloudFormation/EB code ready (if you ever need to scale to cloud)

🚀 **Next Steps:**
1. Follow `DOCKER_DEPLOYMENT.md` to start Docker Compose
2. Keep CloudFormation code updated but don't deploy it
3. If server hardware fails, EB becomes your option
4. As load grows, you can scale either by:
   - Increasing Docker Compose limits (easier)
   - Deploying to EB (more complex but auto-scaling)

**Recommended:** Start with Docker Compose now, keep EB as insurance.
