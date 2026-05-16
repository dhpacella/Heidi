# Claude API Setup & Configuration

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Active Anthropic account with API key

---

## Installation

### 1. Install Claude SDK
```bash
cd server
npm install @anthropic-ai/sdk
```

### 2. Install dotenv (for environment variables)
```bash
npm install dotenv
```

### 3. Verify Installation
```bash
npm list @anthropic-ai/sdk
# Should show: @anthropic-ai/sdk@x.x.x
```

---

## Configuration

### Step 1: Get Your API Key

1. Go to https://console.anthropic.com/
2. Navigate to "API Keys" section
3. Click "Create Key"
4. Copy the key (starts with `sk-ant-v1-`)
5. Save it securely (do not commit to git)

### Step 2: Set Environment Variable

**Option A: Local Development (`.env` file)**

Create `server/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-v1-your-actual-key-here
```

**Option B: Production (AWS EB Environment)**

In AWS Elastic Beanstalk console:
1. Go to Configuration → Software
2. Environment Properties
3. Add: `ANTHROPIC_API_KEY` = `sk-ant-v1-...`
4. Deploy

**Option C: Production (Docker/Container)**

In `Dockerfile` or deployment config:
```dockerfile
ENV ANTHROPIC_API_KEY=sk-ant-v1-xxx
```

### Step 3: Initialize in Node App

In `server/src/app.js` or early in startup:
```javascript
require('dotenv').config();

// Verify key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set');
  process.exit(1);
}
```

---

## Verify Setup

### Test 1: Direct SDK Test
```javascript
// test-claude.js
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function test() {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Say "Claude API works!"' }]
  });
  console.log(message.content[0].text);
}

test().catch(console.error);
```

Run:
```bash
node test-claude.js
# Output: Claude API works!
```

### Test 2: HTTP Endpoint Test
```bash
curl -X POST http://localhost:5000/api/ai/generate-email \
  -H "Content-Type: application/json" \
  -b "connect.sid=$(cat session.txt)" \
  -d '{"idea":"Test","campaignName":"Test"}'
```

Expected response:
```json
{
  "html": "<html>...</html>"
}
```

---

## Model Options

Current: **claude-haiku-4-5-20251001** (fast, low cost)

### Alternative Models

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| claude-haiku-4-5-20251001 | Fast | $$ | Email generation, suggestions |
| claude-sonnet-4-6-20250514 | Balanced | $$$$ | High-quality analysis, complex prompts |
| claude-opus-4-7-20250219 | Slow | $$$$$$ | Advanced reasoning, long outputs |

**To switch models:**

Edit `server/src/lib/aiClient.js`:
```javascript
const message = await client.messages.create({
  model: 'claude-sonnet-4-6-20250514',  // Change this line
  max_tokens: 2048,
  // ... rest of config
});
```

---

## Rate Limiting & Quotas

### API Key Limits
- Check your plan at https://console.anthropic.com/account/limits
- Free tier: Limited messages/day
- Paid tier: Higher limits based on plan

### In-App Rate Limiting
Currently no per-user rate limiting on `/api/ai/*` routes.

**To add rate limiting:**

```javascript
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many AI requests, try again later'
});

router.post('/generate-email', aiLimiter, async (req, res) => {
  // ... handler
});
```

---

## Monitoring & Logging

### Enable Debug Logging
```javascript
// server/src/lib/aiClient.js
async function askClaude(systemPrompt, userMessage) {
  console.log('🤖 Claude request:', { 
    model: 'claude-haiku-4-5-20251001',
    systemLength: systemPrompt.length,
    userLength: userMessage.length
  });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  console.log('✅ Claude response:', {
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    outputLength: message.content[0].text.length
  });

  return message.content[0].text;
}
```

### CloudWatch Logs (AWS)
All console.logs appear in EB CloudWatch if deployed:
- https://console.aws.amazon.com/cloudwatch/

### Local Logs
During development, check terminal output for debug messages.

---

## Troubleshooting

### "ANTHROPIC_API_KEY is undefined"
**Solution:** Check that `.env` file exists and is loaded:
```bash
# In server directory
echo $ANTHROPIC_API_KEY
# Should output your key or be empty
```

If empty, ensure this line is early in your app:
```javascript
require('dotenv').config();
```

### "Invalid API key"
**Solution:** Verify key format:
- Should start with `sk-ant-v1-`
- Should not have extra spaces or quotes
- Check console.anthropic.com that key hasn't expired

### "Rate limited"
**Solution:** Wait a few minutes and retry, or upgrade your Anthropic plan.

### "Model not found"
**Solution:** Verify model name is correct:
- Current models: https://docs.anthropic.com/en/docs/about/models

### "Timeout"
**Solution:** Increase timeout in fetch:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

fetch('/api/ai/generate-email', {
  // ... options
  signal: controller.signal
});
```

---

## Cost Optimization

### Token Counting
Each request charges based on input + output tokens:
```
Input tokens ≈ characters / 4
Output tokens ≈ generated characters / 4
```

Example:
- System prompt: 200 chars ≈ 50 tokens
- User message: 500 chars ≈ 125 tokens
- Response: 1000 chars ≈ 250 tokens
- Total: ~425 tokens

### Cost Per Request
Using claude-haiku (cheapest):
- Input: 50 tokens × $0.80/1M = $0.00004
- Output: 250 tokens × $4.00/1M = $0.001
- Total per request: ~$0.0014

At 1000 requests/day: ~$1.40/day or $42/month

### Cost Reduction Tips
1. **Shorter system prompts** — Remove unnecessary instructions
2. **Use Haiku model** — 4-10× cheaper than Sonnet
3. **Batch requests** — Combined where possible
4. **Cache responses** — Use Redis/memcached for repeated queries
5. **Limit max_tokens** — Reduce output ceiling if possible

---

## Security Best Practices

### ✅ DO
- [ ] Store API key in environment variable, never in code
- [ ] Require authentication before calling `/api/ai/*` endpoints
- [ ] Log API errors without exposing full key
- [ ] Rotate API key periodically
- [ ] Use role-based access (admin/campaign_manager only)
- [ ] Validate user input before sending to Claude

### ❌ DON'T
- [ ] Commit API key to git repo
- [ ] Embed key in frontend JavaScript
- [ ] Pass API key in URL parameters
- [ ] Log raw API responses with sensitive data
- [ ] Allow anonymous users to call Claude

### Current Implementation
`server/src/routes/ai.js` requires:
```javascript
router.use(requireRole('admin', 'campaign_manager'));
```

This protects all `/api/ai/*` endpoints from unauthenticated access.

---

## Deployment Checklist

- [ ] API key set in EB environment variables
- [ ] `@anthropic-ai/sdk` in package.json dependencies
- [ ] `require('dotenv').config()` in app startup
- [ ] Role-based access control in place
- [ ] Logging enabled for debugging
- [ ] Error handling catches API failures
- [ ] Input validation on all endpoints
- [ ] Rate limiting considered for production
- [ ] Costs monitored in Anthropic console
- [ ] Tested end-to-end in staging before prod

---

## Support & Documentation

- **Anthropic Docs:** https://docs.anthropic.com/
- **API Status:** https://status.anthropic.com/
- **SDK Source:** https://github.com/anthropics/anthropic-sdk-python (Python, but API parity)
- **Models Reference:** https://docs.anthropic.com/en/docs/about/models

---

## Version History

| Date | Change |
|------|--------|
| May 15, 2026 | Initial setup guide; claude-haiku configured |

---

**Last Updated:** May 15, 2026  
**Current Model:** claude-haiku-4-5-20251001  
**Status:** ✅ Operational
