# AWS Support Request: Elastic Beanstalk Deployment & Database Connection Issue

## Environment Details
- **EB Environment:** heidi-prod-east2
- **Region:** us-east-2
- **Instance Type:** t3.micro
- **Platform:** Node.js
- **RDS Instance:** heidi-voter-db-east2 (PostgreSQL 18.3, us-east-2)

## Problem Summary
Code changes deployed to EB are not taking effect. The Node.js application continues to attempt database connections to `127.0.0.1:5432` (localhost) instead of the configured us-east-2 RDS endpoint, despite multiple code updates and environment restarts.

## What We've Verified
✅ Security groups configured correctly:
- RDS security group (sg-17ebda6e) allows inbound TCP 5432 from EB security group (sg-05c763370804dec5d)
- EB instance is in the correct security group

✅ Code changes deployed successfully (exit code 0)
- Multiple deployments confirmed via EB CLI
- Environment restarts completed
- Full environment rebuild attempted

✅ Code locally contains correct RDS connection parameters:
- Host: heidi-voter-db-east2.cf6y8ieas57y.us-east-2.rds.amazonaws.com
- Port: 5432
- User: ebroot
- Database: postgres

## Specific Issues

### Issue 1: Connection String Not Being Used
- Updated connection.js to use direct host/port/user/password configuration (not connection strings)
- Hardcoded RDS endpoint with fallback logic
- Changes show as deployed, but app still tries to connect to 127.0.0.1:5432

### Issue 2: Route Changes Not Reflecting
- Added /health endpoint enhancement to check DB connection status
- Added /test-db-connection diagnostic endpoint
- Routes are in committed code but don't respond (404 errors)
- /health endpoint still returns cached response without updates

### Issue 3: Environment Rebuild Didn't Resolve
- Terminated and rebuilt entire EB environment
- Fresh environment exhibits same behavior
- All deployments show successful completion

## Error Message
```
{"status":"error","message":"connect ECONNREFUSED 127.0.0.1:5432"}
```

## Questions for AWS Support
1. Why is the Node.js app defaulting to localhost:5432 when DATABASE_URL is not set, instead of using hardcoded host parameters?
2. Are code changes being cached or not fully deployed?
3. Is there an nginx/proxy configuration preventing route updates from taking effect?
4. Are environment variables properly being passed to the Node process?

## Files for Review
- `.ebextensions/nodejs.config` - EB environment configuration
- `server/src/db/connection.js` - Database connection code
- `server/src/app.js` - Express app setup
- Recent CloudWatch logs from `/aws/elasticbeanstalk/heidi-prod-east2/var/log/web.stdout.log`

## Credentials
- RDS Master Username: ebroot
- RDS Password: (provided separately)
- AWS Account ID: 641405172194
