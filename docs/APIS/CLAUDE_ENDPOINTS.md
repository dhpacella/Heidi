# Claude API Endpoints — Quick Reference

## Base Configuration
```
Base URL: http://localhost:5000/api/ai
Auth: JWT Bearer token or Session cookie
Role: admin or campaign_manager
Model: claude-haiku-4-5-20251001
Max Tokens: 2048
```

---

## Email Generation

### Generate Email from Idea
```
POST /api/ai/generate-email

Request:
{
  "idea": "Encourage voters to participate",
  "campaignName": "Election 2024"
}

Response:
{
  "html": "<html><head>...</head><body>...</body></html>"
}
```

---

## Content Optimization

### Suggest Subject Lines
```
POST /api/ai/suggest-subjects

Request:
{
  "htmlBody": "<p>Join us to make a difference</p>"
}

Response:
{
  "subjects": [
    "Make Your Voice Heard This Election",
    "Your Vote Matters — Vote Tomorrow",
    "Last Chance to Vote"
  ]
}
```

### Improve Email Content
```
POST /api/ai/improve-email

Request:
{
  "htmlBody": "<p>Vote</p>",
  "instructions": "Make compelling and urgent"
}

Response:
{
  "html": "<html><body><p>Cast your vote and be heard!</p></body></html>"
}
```

---

## Analytics & Insights

### Analyze Campaign Metrics
```
POST /api/ai/analyze-campaign

Request:
{
  "blast": {
    "subject": "Campaign Subject",
    "sent_count": 25000,
    "delivered_count": 24500,
    "opened_count": 8200,
    "clicked_count": 2100,
    "bounced_count": 500
  }
}

Response:
{
  "analysis": "32.8% open rate is strong. Consider A/B testing..."
}
```

---

## Error Responses

**400 Bad Request**
```json
{ "error": "Campaign idea required" }
```

**403 Forbidden**
```json
{ "error": "Insufficient permissions" }
```

**500 Server Error**
```json
{ "error": "Claude API request failed" }
```

---

## Frontend Integration Points

| File | Function | Endpoint |
|------|----------|----------|
| email-compose.html | generateEmailWithAI() | POST /generate-email |
| email-compose.html | suggestSubjectsWithAI() | POST /suggest-subjects |
| email-compose.html | improveEmailWithAI() | POST /improve-email |
| campaign-analytics.html | analyzeCampaignWithAI() | POST /analyze-campaign |

---

## Implementation Files

- **Backend:** `server/src/routes/ai.js` — Route handlers
- **SDK Client:** `server/src/lib/aiClient.js` — Claude API wrapper
- **Frontend:** `server/public/email-compose.html` — UI integration (email-compose page)
