# Claude AI APIs — Documentation Index

This folder contains complete documentation for Claude AI API integration in the Heidi Voter Dashboard.

---

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [CLAUDE_ENDPOINTS.md](CLAUDE_ENDPOINTS.md) | **Quick reference** for all endpoints | Developers, API users |
| [CLAUDE_SETUP.md](CLAUDE_SETUP.md) | **Installation & configuration** guide | DevOps, backend setup |
| [CLAUDE_USAGE_EXAMPLES.md](CLAUDE_USAGE_EXAMPLES.md) | **Code examples** for all endpoints | Frontend/backend developers |
| [../CLAUDE_APIS.md](../CLAUDE_APIS.md) | **Complete API documentation** (root) | Technical reference |

---

## What's Integrated?

The Heidi Voter Dashboard uses Claude AI for:

1. **📧 Email Generation** — Generate full HTML emails from campaign ideas
2. **💡 Subject Suggestions** — Suggest 3 compelling subject lines from email body
3. **✨ Email Improvement** — Optimize emails for clarity and engagement
4. **📊 Campaign Analysis** — Generate insights from email campaign metrics

---

## Getting Started

### For Setup/Deployment
→ Start with [CLAUDE_SETUP.md](CLAUDE_SETUP.md)
- Install dependencies
- Configure API key
- Verify integration

### For Using the APIs
→ Go to [CLAUDE_ENDPOINTS.md](CLAUDE_ENDPOINTS.md) for endpoint specs
→ Then [CLAUDE_USAGE_EXAMPLES.md](CLAUDE_USAGE_EXAMPLES.md) for code samples

### For Complete Reference
→ See [../CLAUDE_APIS.md](../CLAUDE_APIS.md) for exhaustive documentation

---

## API Overview

### Base Configuration
```
Model: claude-haiku-4-5-20251001
Max Tokens: 2048
Auth: Admin/Campaign Manager role required
Base URL: /api/ai (relative to server)
```

### Available Endpoints
```
POST /api/ai/generate-email         ← Generate HTML email
POST /api/ai/suggest-subjects       ← Suggest subject lines
POST /api/ai/improve-email          ← Optimize email content
POST /api/ai/analyze-campaign       ← Get campaign insights
```

---

## Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Backend Routes | ✅ Live | `server/src/routes/ai.js` |
| SDK Client | ✅ Live | `server/src/lib/aiClient.js` |
| Frontend UI | ✅ Live | `server/public/email-compose.html` |
| Rate Limiting | ⏸️ Optional | Not implemented by default |
| Logging | ✅ Basic | Console logs via `askClaude()` |

---

## Frontend Integration

The email-compose page includes an "AI Email Assistant" section with:
- **Input field** for describing your campaign idea
- **4 action buttons:**
  - 🤖 Generate Email — Create from idea
  - 💡 Suggest Subjects — Get 3 subject options
  - ✨ Improve Email — Enhance content
  - (Analyze Campaign — Available on analytics pages)
- **Status messages** showing progress/errors

---

## Environment Setup

### Required
```bash
npm install @anthropic-ai/sdk

# Set in .env or deployment config:
ANTHROPIC_API_KEY=sk-ant-v1-xxxxxxxxxxxxx
```

### Verify
```bash
# Test endpoint
curl -X POST http://localhost:5000/api/ai/generate-email \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_COOKIE" \
  -d '{"idea":"test","campaignName":"test"}'
```

---

## Common Tasks

### I want to...

**...use Generate Email in my code**
→ See [CLAUDE_USAGE_EXAMPLES.md](CLAUDE_USAGE_EXAMPLES.md) → "Generate Email" section

**...change the AI model**
→ See [CLAUDE_SETUP.md](CLAUDE_SETUP.md) → "Model Options"

**...debug API errors**
→ See [CLAUDE_SETUP.md](CLAUDE_SETUP.md) → "Troubleshooting"

**...understand cost**
→ See [CLAUDE_SETUP.md](CLAUDE_SETUP.md) → "Cost Optimization"

**...add rate limiting**
→ See [CLAUDE_SETUP.md](CLAUDE_SETUP.md) → "Rate Limiting & Quotas"

**...test all endpoints**
→ See [CLAUDE_USAGE_EXAMPLES.md](CLAUDE_USAGE_EXAMPLES.md) → "Frontend (Browser Console)"

---

## Performance Notes

| Endpoint | Time | Notes |
|----------|------|-------|
| Generate Email | 2-4s | Creates full HTML |
| Suggest Subjects | 1-2s | Fast JSON response |
| Improve Email | 2-3s | Depends on length |
| Analyze Campaign | 1-2s | Metrics analysis |

**Add loading indicators to UX during API calls.**

---

## Model Information

**Current Model:** `claude-haiku-4-5-20251001`

Reasons:
- **Speed:** Sub-3s responses for UI workflows
- **Cost:** 4-10× cheaper than Sonnet
- **Capability:** Sufficient for email/subject/analysis tasks

For higher quality output, consider upgrading to Sonnet.

---

## Security

✅ **Protected by:**
- Admin/Campaign Manager role check
- No anonymous access
- API key in environment variables
- Input validation on all endpoints

---

## Monitoring

### Logs
- Server console logs in `stdout` (check terminal or CloudWatch)
- API request/response details logged by `askClaude()`

### Costs
- Monitor usage at https://console.anthropic.com/account/limits
- Estimate: ~$1.40/day for 1000 requests (Haiku)

---

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| "API key undefined" | Check `.env` file exists and `require('dotenv').config()` is called early |
| "Invalid API key" | Verify key format (should start with `sk-ant-v1-`) |
| "403 Forbidden" | Ensure logged-in user is admin or campaign_manager |
| "Timeout" | Normal for first request; use 30s timeout in fetch |
| "Rate limited" | Wait a few minutes; upgrade Anthropic plan if frequent |

→ Full troubleshooting: [CLAUDE_SETUP.md](CLAUDE_SETUP.md) → "Troubleshooting"

---

## Next Steps

1. **If setting up for first time:** Start with [CLAUDE_SETUP.md](CLAUDE_SETUP.md)
2. **If debugging an issue:** Check [CLAUDE_SETUP.md](CLAUDE_SETUP.md) → "Troubleshooting"
3. **If adding new features:** Reference [CLAUDE_USAGE_EXAMPLES.md](CLAUDE_USAGE_EXAMPLES.md)
4. **If need complete spec:** See [../CLAUDE_APIS.md](../CLAUDE_APIS.md)

---

## Files in This Folder

```
docs/APIS/
├── README.md                      ← You are here
├── CLAUDE_ENDPOINTS.md            ← Endpoint reference
├── CLAUDE_SETUP.md                ← Setup guide
└── CLAUDE_USAGE_EXAMPLES.md       ← Code examples

Project Root:
└── CLAUDE_APIS.md                 ← Complete documentation
```

---

## Contact & Support

- **Anthropic Docs:** https://docs.anthropic.com/
- **GitHub Issues:** Create issue in project repo
- **Development:** See `server/src/routes/ai.js` and `server/src/lib/aiClient.js`

---

**Last Updated:** May 15, 2026  
**Status:** ✅ All APIs Operational  
**Model Version:** claude-haiku-4-5-20251001
