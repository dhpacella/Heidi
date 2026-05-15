# AWS SES/SNS Local Setup Guide

## Overview

This guide explains how to test AWS SES (email) and SNS (SMS) services locally with the voter dashboard.

## Prerequisites

1. **AWS Account** with SES and SNS enabled
2. **AWS Credentials** configured locally (via `~/.aws/credentials`)
3. **Local development setup** (SQLite database running)

## Quick Start

### 1. Configure AWS Credentials

```bash
# Create/edit ~/.aws/credentials
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY

# Create/edit ~/.aws/config
[default]
region = us-east-2
output = json
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-2
```

### 2. Verify SES Sandbox

AWS SES starts in sandbox mode (test only):
- Can only send to verified email addresses
- Limited to 1 email/second
- Limited to 200 emails/24 hours

**To verify an email for testing:**
```bash
aws ses verify-email-identity --email-address your-email@example.com
# Check email for verification link
```

### 3. Run Local Server with SQLite

```bash
cd server
python3 init-sqlite-db.py   # Create database
npm install                  # Install dependencies
npm start                    # Start server
```

Server runs on `http://localhost:5000`

### 4. Test SES/SNS

**Option A: Web UI**
- Go to: http://localhost:5000/aws-test.html
- Login if prompted
- Fill in email/SMS details
- Click "Send Email" or "Send SMS"

**Option B: API Curl**

```bash
# Test Email
curl -X POST http://localhost:5000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fromAddress": "heidi@hadleytrees.com",
    "subject": "Test",
    "htmlBody": "<h1>Hello</h1>",
    "recipientEmails": "[\"test@example.com\"]"
  }'

# Test SMS
curl -X POST http://localhost:5000/api/sms/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Hello from Heidi!",
    "recipientPhones": "[\"+12025551234\"]"
  }'
```

## Configuration

Edit `.env.local` to control AWS behavior:

```env
# AWS SES
AWS_SES_REGION=us-east-2
SES_FROM_EMAIL=heidi@hadleytrees.com

# AWS SNS
AWS_SNS_REGION=us-east-2

# Database (use SQLite for local, PostgreSQL for production)
DATABASE_URL=sqlite:heidi-dev.db
```

## API Reference

### POST /api/email/send

Send emails via AWS SES.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "fromAddress": "sender@example.com",
  "subject": "Email Subject",
  "htmlBody": "<h1>HTML content</h1>",
  "recipientEmails": "[\"recipient@example.com\"]"
}
```

**Response:**
```json
{
  "success": true,
  "blastId": 1,
  "totalEmails": 1,
  "successCount": 1,
  "failureCount": 0,
  "results": [
    {
      "success": true,
      "messageId": "0000014a-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "email": "recipient@example.com"
    }
  ]
}
```

### POST /api/sms/send

Send SMS via AWS SNS.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "message": "Your SMS message here",
  "recipientPhones": "[\"+12025551234\"]"
}
```

**Response:**
```json
{
  "success": true,
  "blastId": 1,
  "totalPhones": 1,
  "successCount": 1,
  "failureCount": 0,
  "totalCost": 0.0075,
  "results": [
    {
      "success": true,
      "messageId": "12345678-1234-1234-1234-123456789012",
      "phone": "+12025551234"
    }
  ]
}
```

### GET /api/email/history

Get recent email sends.

**Query Parameters:**
- `limit` (optional, default: 50) - Number of records
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
[
  {
    "id": 1,
    "subject": "Test Email",
    "recipient_count": 5,
    "status": "sent",
    "created_at": "2026-05-15T10:30:00Z"
  }
]
```

### GET /api/sms/history

Get recent SMS sends.

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "message": "Test SMS",
    "recipient_count": 5,
    "total_cost": 0.0375,
    "status": "sent",
    "created_at": "2026-05-15T10:30:00Z"
  }
]
```

## Troubleshooting

### "MessageRejected" Error

**Cause:** Email address not verified in SES.

**Fix:** Verify email in AWS Console:
```bash
aws ses verify-email-identity --email-address your-email@example.com
```

### "InvalidParameterValue" SMS Error

**Cause:** Invalid phone number format.

**Fix:** Use international format: `+12025551234`

### "Access Denied" Error

**Cause:** AWS credentials not configured or incorrect.

**Fix:** Check credentials:
```bash
aws sts get-caller-identity
```

Should return your AWS account ID.

### Emails Not Arriving

1. Check SES sandbox mode (limited testing emails)
2. Verify sender email address in SES console
3. Check spam/junk folder
4. Review SES send statistics in AWS Console

### SMS Not Arriving

1. Verify SNS is enabled for SMS in your region
2. Check phone number format (US: `+1` prefix required)
3. Check AWS account SMS spending limit
4. Review CloudWatch logs for errors

## Cost Estimates

### SES (Email)
- **Free tier:** 62,000 emails/month (inbound + outbound)
- **Paid:** $0.10 per 1,000 emails after free tier

### SNS (SMS)
- **Cost:** ~$0.0075 per SMS (varies by country)
- **Example:** 1,000 SMS = $7.50

## Database Support

### Local Development (SQLite)
```env
DATABASE_URL=sqlite:heidi-dev.db
```
- ✅ No AWS needed
- ✅ Fast setup
- ❌ Single-user only
- ❌ No concurrent requests

### Production (PostgreSQL RDS)
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
```
- ✅ Multi-user
- ✅ Concurrent requests
- ✅ Backups
- ❌ Requires AWS RDS setup

## Testing Checklist

- [ ] AWS credentials configured
- [ ] SES email verified (for testing)
- [ ] SQLite database initialized
- [ ] Server running on localhost:5000
- [ ] Can login with `admin@test.com` / `Admin123!`
- [ ] Email form loads at `/aws-test.html`
- [ ] Can send test email (check AWS SES console)
- [ ] Can send test SMS (check AWS SNS console)
- [ ] Email history shows sent messages
- [ ] SMS history shows sent messages

## Next Steps

1. **Expand SES:** Request production access to send to any email
2. **Configure Webhooks:** Set up SNS subscriptions for delivery reports
3. **Add Templates:** Create email templates in SES
4. **Monitor Costs:** Set up CloudWatch alarms for AWS spending
5. **Load Testing:** Test with larger batches (100+ emails/SMS)
