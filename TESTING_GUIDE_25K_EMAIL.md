# Testing Guide: 25K Email System

**Deployment Date:** May 16, 2026  
**Environment:** heidi-prod (us-east-1)  
**Deployed Version:** app-b2e5-260515_195732827997  
**Status:** Ready, Health: Green

---

## Phase 0: Pre-Test Verification

Before running any tests, verify the deployment is live and healthy.

### 1. Check EB Environment Status

```bash
cd "C:\Users\Administrator\OneDrive - Cushing Transportation, Inc\Documents\Dominic's Coding\Projects\heidi-voter-dashboard"

eb status heidi-prod
```

**Expected Output:**
```
Environment details for: heidi-prod
  Status: Ready
  Health: Green
  Deployed Version: app-b2e5-260515_195732827997
  CNAME: heidi-prod.eba-dkbkgcjs.us-east-1.elasticbeanstalk.com
```

### 2. SSH into EB Instance

```bash
eb ssh heidi-prod
```

### 3. Verify Running Services

```bash
pm2 status
```

**Expected Output:**
```
┌─────────────────────────────────────────────────┐
│ id │ name          │ namespace   │ version │ mode │
├────┼───────────────┼─────────────┼─────────┼──────┤
│ 0  │ app.js        │ default     │ 0.0.0   │ fork │
│ 1  │ blastWorker.js│ default     │ 0.0.0   │ fork │
└─────────────────────────────────────────────────┘
```

Both app.js and blastWorker.js should be **online** ✅

---

## Phase 1: Integration Test (Validates Architecture)

The integration test validates all 8 core optimization aspects without sending real emails.

### Run the Test

```bash
cd /var/app/current/server
node test-25k-integration.js
```

**Expected Output:** All 8 tests pass with "READY FOR PRODUCTION DEPLOYMENT"

### What It Tests

| # | Test | Validates | Expected Result |
|---|------|-----------|-----------------|
| 1 | CSV Generation | 25K recipients under 25MB | 0.98MB, 25,000 records |
| 2 | Chunked INSERT | Postgres parameter safety | 25 batches × 1K rows (safe) |
| 3 | SQS Chunking | Parallel message distribution | 50 messages × 500 recipients |
| 4 | Worker Pagination | LIMIT/OFFSET query logic | 500/chunk, 10 SES calls/chunk |
| 5 | Message ID Persistence | Database ses_message_id storage | 100% of recipients get IDs |
| 6 | Exponential Backoff | SES throttle recovery | 1s/2s/4s retry schedule |
| 7 | Memory Efficiency | RAM usage per chunk | < 100MB peak (was 200MB+) |
| 8 | Crash Recovery | SQS visibility timeout retry | Auto-requeue on failure |

### Parsing Test Output

Look for this summary:

```
═══════════════════════════════════════════════════
✅ INTEGRATION TEST SUMMARY
═══════════════════════════════════════════════════

✓ CSV Upload               ✓ 25MB limit sufficient
✓ Postgres INSERTs         ✓ 25 batches × 1K rows (safe)
✓ SQS Messages             ✓ 50 chunks × 500 recipients
✓ SES API Calls            ✓ ~500 (50× reduction)
✓ Message IDs              ✓ Persisted for webhook matching
✓ Retry Logic              ✓ 3 attempts with 1s/2s/4s backoff
✓ Memory Usage             ✓ < 100MB peak
✓ Crash Recovery           ✓ Auto-retry via SQS DLQ

═══════════════════════════════════════════════════
🚀 READY FOR PRODUCTION DEPLOYMENT
═══════════════════════════════════════════════════
```

**Success Criteria:** All 8 tests pass ✅

---

## Phase 2: Small Blast Test (10 Recipients)

Tests the full email pipeline with a small, manageable batch.

### 2.1 Create Test Recipients CSV

On your local machine, create `test_10_recipients.csv`:

```csv
email,first_name,last_name
user1@example.com,John,Smith
user2@example.com,Jane,Doe
user3@example.com,Bob,Johnson
user4@example.com,Alice,Williams
user5@example.com,Charlie,Brown
user6@example.com,Diana,Jones
user7@example.com,Eve,Garcia
user8@example.com,Frank,Miller
user9@example.com,Grace,Davis
user10@example.com,Henry,Rodriguez
```

### 2.2 Access Dashboard

Open in browser:
```
https://heidi-prod.eba-dkbkgcjs.us-east-1.elasticbeanstalk.com
```

**Login:** admin@test.com / Admin123! (or your configured credentials)

### 2.3 Send Small Blast

1. Navigate to **Email Outreach** → **Compose**
2. Upload the test CSV (test_10_recipients.csv)
3. Fill in campaign details:
   - **Subject:** `Test Blast - 10 Recipients`
   - **Body (HTML):** 
     ```html
     <p>Hello {{first_name}} {{last_name}},</p>
     <p>This is a test email from the 25K optimization system.</p>
     <p><a href="https://example.com/test">Click here</a> to verify tracking.</p>
     <p>Regards,<br>Heidi Campaign</p>
     ```
4. Click **Send Now** (or enable Test Mode first if available)

### 2.4 Monitor Logs

In the EB SSH terminal:

```bash
pm2 logs blastWorker --lines 50
```

**Expected Log Output:**
```
[blastWorker] Processing chunk for blast_id=TEST_BLAST_001
[blastWorker] Reading 10 recipients (LIMIT 500 OFFSET 0)
[blastWorker] Calling SES SendBulkTemplatedEmail with 10 destinations
[blastWorker] SES Response: MessageIds=[...]
[blastWorker] Persisting ses_message_id for 10 recipients
[blastWorker] Deleting SQS message (chunk processed successfully)
[blastWorker] Chunk complete: 10 recipients sent in 2.3s
```

### 2.5 Verify in Database

Connect to your database and run:

```sql
-- Find the latest blast
SELECT id, campaign_name, status, created_at 
FROM email_blasts 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify recipients inserted
SELECT COUNT(*) as total_recipients,
       COUNT(CASE WHEN ses_message_id IS NOT NULL THEN 1 END) as with_message_id,
       COUNT(CASE WHEN status = 'sent' THEN 1 END) as marked_sent
FROM email_recipients 
WHERE blast_id = 'LATEST_BLAST_ID_HERE';
```

**Expected Output:**
```
total_recipients | with_message_id | marked_sent
      10         |       10        |      10
```

### 2.6 Check CloudWatch Metrics

Go to **AWS CloudWatch Console** → **Metrics**:

**SQS Metrics:**
- Queue Name: `heidi-blasts-prod`
- Look for: Messages Received = 1, Messages Sent = 1 ✅
- Approximate Queue Depth should return to 0 ✅

**SES Metrics:**
- Look for: Send count = 1 call (10 recipients in 1 batch) ✅
- Bounce rate = 0% ✅
- Success rate = 100% ✅

**Lambda Metrics:**
- heidi-emailEventProcessor: Duration < 1 second ✅
- Errors = 0 ✅

### Success Criteria for Phase 2
- ✅ All 10 recipients inserted to database
- ✅ All 10 have ses_message_id
- ✅ SES sent exactly 1 message (10 recipients batched)
- ✅ No errors in logs
- ✅ Processing time < 10 seconds

---

## Phase 3: Full Load Test (25K Recipients)

Tests the complete system at scale.

### 3.1 Generate 25K Test Recipients

On your local machine, create a Python script `generate_25k_csv.py`:

```python
import csv

with open('test_25k_recipients.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['email', 'first_name', 'last_name'])
    writer.writeheader()
    
    for i in range(1, 25001):
        writer.writerow({
            'email': f'user{i}@example.com',
            'first_name': f'FirstName{i // 100}',
            'last_name': f'LastName{i % 100}'
        })

print("Generated test_25k_recipients.csv")
```

Run it:
```bash
python generate_25k_csv.py
```

**Output:** Creates `test_25k_recipients.csv` (~2.5MB)

### 3.2 Send 25K Blast

1. Open dashboard: https://heidi-prod.eba-dkbkgcjs.us-east-1.elasticbeanstalk.com
2. Navigate to **Email Outreach** → **Compose**
3. Upload `test_25k_recipients.csv`
4. Fill in campaign:
   - **Subject:** `Production Test - 25K Recipients`
   - **Body (HTML):** Same as Phase 2
5. Click **Send Now**

### 3.3 Monitor Real-Time Progress

**Watch SQS Queue Depth** (should go 50 → 0):

```bash
while true; do
  aws sqs get-queue-attributes \
    --queue-url https://sqs.us-east-1.amazonaws.com/641405172194/heidi-blasts-prod \
    --attribute-names ApproximateNumberOfMessages \
    --region us-east-1 \
    --query 'Attributes.ApproximateNumberOfMessages' \
    --output text
  echo "---"
  sleep 5
done
```

**Expected Output:**
```
50   (initial enqueue)
42
35
28
15
8
2
0    (complete, ~30 seconds total)
---
```

### 3.4 Monitor Worker Logs

In EB SSH terminal:

```bash
tail -f /var/app/current/logs/email.log
```

**Expected Pattern:**
```
[CHUNK_001] Processing 500 recipients
[CHUNK_001] SES batch 1: 50 recipients
[CHUNK_001] SES batch 2: 50 recipients
... (10 batches per chunk)
[CHUNK_001] Persisting 500 ses_message_ids
[CHUNK_001] Complete: 2.1s

[CHUNK_002] Processing 500 recipients
... (repeat for 50 chunks)

[FINAL] 25000 recipients processed in 28.3s
[FINAL] 500 SES API calls (reduction: 50×)
```

### 3.5 Monitor CloudWatch Metrics

**SQS:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessages \
  --dimensions Name=QueueName,Value=heidi-blasts-prod \
  --statistics Average \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --region us-east-1
```

**Expected:** Queue depth peaks at 50, drops to 0 within 60 seconds ✅

**SES Send Count:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Send \
  --statistics Sum \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --region us-east-1
```

**Expected:** ~500 total sends (vs 25,000 before optimization) ✅

### 3.6 Verify Database Completion

```sql
-- Final verification
SELECT 
  COUNT(*) as total_recipients,
  COUNT(CASE WHEN ses_message_id IS NOT NULL THEN 1 END) as with_message_id,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as marked_sent,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as still_pending,
  MIN(created_at) as first_recipient,
  MAX(created_at) as last_recipient
FROM email_recipients 
WHERE blast_id = 'LATEST_BLAST_ID';

-- Check for any NULL message IDs (failure indicator)
SELECT COUNT(*) as orphaned_recipients
FROM email_recipients
WHERE blast_id = 'LATEST_BLAST_ID' AND ses_message_id IS NULL;
```

**Expected Output:**
```
total_recipients | with_message_id | marked_sent | still_pending
      25000      |      25000      |    25000    |       0
      
orphaned_recipients
        0
```

### Success Criteria for Phase 3
- ✅ 25,000 recipients inserted
- ✅ All 25,000 have ses_message_id
- ✅ All 25,000 marked as 'sent'
- ✅ SQS queue processes in < 60 seconds
- ✅ ~500 SES API calls (50× reduction from 25,000)
- ✅ No errors in logs or CloudWatch
- ✅ Processing time: 25-30 seconds

---

## Phase 4: Event Tracking Verification

Tests that bounce/open/click events are captured and matched to recipients.

### 4.1 Trigger a Test Bounce Event

In AWS SES Console:
1. Go to **Verified identities**
2. Select your verified email
3. Click **Send a test email** → Choose **Bounce**
4. Verify the bounce appears in CloudWatch logs

### 4.2 Verify Event Matching

```sql
-- Check if bounce event was matched to a recipient
SELECT 
  COUNT(*) as total_bounced,
  COUNT(CASE WHEN ses_message_id IS NOT NULL THEN 1 END) as matched_via_message_id
FROM email_recipients
WHERE blast_id = 'LATEST_BLAST_ID' AND bounced_at IS NOT NULL;
```

**Expected:** All bounced emails have ses_message_id ✅

### 4.3 Check Lambda Event Processor Logs

```bash
aws logs tail /aws/lambda/heidi-emailEventProcessor --follow
```

**Expected Output:**
```
Processing SNS message: EventType=Bounce
Received bounce for ses_message_id=...
Updated email_recipients.bounced_at for recipient_id=123
```

### Success Criteria for Phase 4
- ✅ Test bounce event triggers
- ✅ Event is matched to original recipient via ses_message_id
- ✅ Database bounced_at timestamp updated
- ✅ No orphaned events (events without matching recipient)

---

## Phase 5: 24-Hour Monitoring Checklist

After the full load test, monitor for 24 hours:

- [ ] **Hour 1:** Check CloudWatch for any Lambda errors or SQS DLQ messages
- [ ] **Hour 6:** Verify no messages in DLQ (should be empty)
- [ ] **Hour 12:** Check database for any delayed updates or inconsistencies
- [ ] **Hour 24:** Final verification - all metrics normal, no errors logged

**Critical Metrics to Watch:**
- SES bounce rate < 5% (indicates healthy email list)
- Lambda error rate = 0%
- SQS DLQ message count = 0
- Memory usage per worker < 100MB

---

## Troubleshooting

### Issue: SQS messages stuck in queue

**Check:**
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/641405172194/heidi-blasts-prod \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
  --region us-east-1
```

**If ApproximateNumberOfMessagesNotVisible > 0:** Messages are being processed. Wait longer.

**If messages keep growing:** Worker may have crashed. Check:
```bash
pm2 status
pm2 logs blastWorker --lines 100
```

### Issue: ses_message_id is NULL for some recipients

**Check database:**
```sql
SELECT id, email, ses_message_id, status, updated_at
FROM email_recipients
WHERE ses_message_id IS NULL
LIMIT 10;
```

**Possible causes:**
- SES call failed (check logs for ThrottlingException)
- Worker crashed before UPDATE (check CloudWatch for errors)
- Retry logic exhausted (messages in SQS DLQ)

### Issue: Very slow processing (> 60 seconds for 25K)

**Check:**
1. Lambda memory/CPU limits
2. Database connection pool (if using RDS)
3. SES API rate (may be hitting limit)
4. Worker logs for delays

---

## Success Criteria (Final)

✅ **Phase 1 (Integration Test):** All 8 tests pass  
✅ **Phase 2 (10 Recipients):** All inserted, all have message IDs, < 10s  
✅ **Phase 3 (25K Recipients):** All inserted, 500 SES calls, < 60s  
✅ **Phase 4 (Event Tracking):** Bounces matched, no orphans  
✅ **Phase 5 (24h Monitoring):** No errors, metrics stable  

---

## Next Steps After Testing

1. **If all tests pass:** System is production-ready ✅
   - Begin gradual rollout to real campaigns
   - Monitor metrics for first week
   - Enable CloudWatch alarms (from DEPLOYMENT_GUIDE_25K_EMAIL.md)

2. **If any test fails:** 
   - Check troubleshooting section above
   - Review logs and error messages
   - Refer to DEPLOYMENT_GUIDE_25K_EMAIL.md for architecture details
   - Rollback if necessary (see DEPLOYMENT_GUIDE_25K_EMAIL.md)

---

**Last Updated:** May 16, 2026  
**Testing Guide Version:** 1.0  
**Deployment Version:** app-b2e5-260515_195732827997
