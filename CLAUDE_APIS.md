# Claude AI APIs — Email Composition Integration

This document describes the Claude AI API endpoints integrated into the Heidi Voter Dashboard for intelligent email composition.

## Overview

The dashboard uses Claude's API through the `@anthropic-ai/sdk` package to provide:
- AI-powered email generation from campaign ideas
- Subject line suggestions
- Email improvement/optimization
- Campaign analytics insights

**SDK Version:** `@anthropic-ai/sdk` (latest)  
**Model:** `claude-haiku-4-5-20251001`  
**API Key:** Set via environment variable `ANTHROPIC_API_KEY`

---

## Endpoint Specifications

### 1. POST `/api/ai/generate-email`
**Purpose:** Generate a complete HTML email from a campaign idea  
**Authentication:** Requires session or JWT token (admin/campaign_manager role)

**Request Body:**
```json
{
  "idea": "Get out the vote reminder for Tuesday election",
  "campaignName": "Election Day 2024"
}
```

**Response (200 OK):**
```json
{
  "html": "<html><head>...</head><body>...</body></html>"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Campaign idea required"
}
```

**System Prompt:**
> "You are an expert email marketing writer. Generate a professional HTML email based on the campaign idea. Return ONLY valid HTML starting with <html> and ending with </html>. No markdown code blocks, no explanations."

**Implementation Details:**
- Calls Claude with system prompt + user message
- Strips markdown code blocks if present (claude may wrap in ````html`…```` )
- Returns clean HTML ready to insert into email body textarea

---

### 2. POST `/api/ai/suggest-subjects`
**Purpose:** Generate 3 compelling subject lines based on email body  
**Authentication:** Requires session or JWT token (admin/campaign_manager role)

**Request Body:**
```json
{
  "htmlBody": "<html><body>Join us for Election Day!</body></html>"
}
```

**Response (200 OK):**
```json
{
  "subjects": [
    "Your Vote Matters — Get Out and Vote Tomorrow",
    "Don't Miss Election Day — Cast Your Vote!",
    "Last Chance to Make Your Voice Heard"
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Email body required"
}
```

**System Prompt:**
> "You are an email marketing expert. Generate exactly 3 compelling email subject lines based on the email body. Return ONLY valid JSON on a single line with no markdown code blocks: {\"subjects\": [\"subject 1\", \"subject 2\", \"subject 3\"]}"

**Implementation Details:**
- Calls Claude with email body text
- Expects JSON array response with exactly 3 subjects
- Parses response and extracts subjects array
- Fallback: if parsing fails, returns first 100 chars as single subject
- Frontend displays 3 options in prompt dialog; user selects 1

---

### 3. POST `/api/ai/improve-email`
**Purpose:** Optimize email content for clarity, engagement, and conversions  
**Authentication:** Requires session or JWT token (admin/campaign_manager role)

**Request Body:**
```json
{
  "htmlBody": "<p>Vote on Tuesday.</p>",
  "instructions": "Make it more engaging and urgent"
}
```

**Response (200 OK):**
```json
{
  "html": "<html><body><p>Don't miss your chance — vote this Tuesday and make your voice heard!</p></body></html>"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Email body required"
}
```

**System Prompt:**
> "You are an email marketing expert. Review and improve this email for clarity, engagement, and conversions. Return ONLY improved HTML starting with <html> or <p> tag and ending appropriately. No markdown code blocks, no explanations."

**Implementation Details:**
- Takes HTML or plain text email body
- Applies optional improvement instructions
- Returns improved HTML (or text if input was plain text)
- Strips markdown code blocks if present

---

### 4. POST `/api/ai/analyze-campaign`
**Purpose:** Generate insights from campaign metrics  
**Authentication:** Requires session or JWT token (admin/campaign_manager role)

**Request Body:**
```json
{
  "blast": {
    "id": 42,
    "subject": "Election Day Reminder",
    "sent_count": 25000,
    "delivered_count": 24500,
    "opened_count": 8200,
    "clicked_count": 2100,
    "bounced_count": 500
  }
}
```

**Response (200 OK):**
```json
{
  "analysis": "Your email achieved a 32.8% open rate and 8.4% click-through rate, indicating strong engagement. The 2% bounce rate is healthy. To improve, consider A/B testing subject lines or send times."
}
```

**System Prompt:**
> "You are an email marketing analyst. Analyze email campaign metrics and provide clear, actionable insights in plain English. Be concise and focus on what the numbers tell us."

**Implementation Details:**
- Takes complete blast metrics object
- Claude analyzes and provides narrative insights
- Used on analytics/metrics pages for campaign review

---

## Backend Implementation

**File:** `server/src/lib/aiClient.js`

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function askClaude(systemPrompt, userMessage) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });
  return message.content[0].text;
}
```

**File:** `server/src/routes/ai.js`  
All endpoints use `askClaude()` with custom system prompts. Requires `ANTHROPIC_API_KEY` environment variable.

---

## Frontend Integration

**File:** `server/public/email-compose.html`

### UI Section
Located below "Message Templates" section; includes:
- **"✨ AI Email Assistant"** label (light blue: #7BB8F5)
- **Input field:** `#aiIdea` — describes campaign concept
- **Buttons:**
  - 🤖 Generate Email → `generateEmailWithAI()`
  - 💡 Suggest Subjects → `suggestSubjectsWithAI()`
  - ✨ Improve Email → `improveEmailWithAI()`
- **Status display:** `#aiStatus` — shows messages and errors

### JavaScript Functions

**`generateEmailWithAI()`**
- Reads campaign idea from `#aiIdea`
- POSTs to `/api/ai/generate-email`
- Inserts response HTML into `#htmlBody` textarea
- Calls `switchMode('html')` to activate HTML editor
- Shows success/error status

**`suggestSubjectsWithAI()`**
- Reads email body from `#htmlBody` or `#textBody`
- POSTs to `/api/ai/suggest-subjects`
- Shows prompt with 3 options
- User selects 1-3; updates `#subject` field

**`improveEmailWithAI()`**
- Reads email body from `#htmlBody` or `#textBody`
- POSTs to `/api/ai/improve-email`
- Replaces textarea with improved version
- Detects input mode and updates accordingly

**`showAiStatus(message, isError)`**
- Displays status message in `#aiStatus` div
- Color: red (#FF6B6B) for errors, blue (#7BB8F5) for success
- Auto-hides after 5 seconds

---

## Error Handling

All endpoints return:
- **200 OK** — Success with data
- **400 Bad Request** — Missing required fields
- **403 Forbidden** — Insufficient permissions (not admin/campaign_manager)
- **500 Internal Server Error** — Claude API error or processing failure

Frontend catches errors via:
```javascript
if (res.ok) {
  const data = await res.json();
  // Process response
} else {
  showAiStatus('❌ Error: ' + error, true);
}
```

---

## Environment Setup

**Required:**
```bash
npm install @anthropic-ai/sdk
```

**Environment Variables (`.env`):**
```
ANTHROPIC_API_KEY=sk-ant-v1-xxxxxxxxxxxx
```

---

## Rate Limiting & Quotas

- No built-in rate limiting on `/api/ai/*` endpoints (uses general API auth)
- Respect Claude API usage limits per your Anthropic account
- Each request costs tokens based on prompt + response length
- Haiku model: ~0.80 / 1M input tokens, ~4.00 / 1M output tokens

---

## Testing the APIs

### Test 1: Generate Email
```bash
curl -X POST http://localhost:5000/api/ai/generate-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"idea":"Get out the vote reminder","campaignName":"Election 2024"}'
```

### Test 2: Suggest Subjects
```bash
curl -X POST http://localhost:5000/api/ai/suggest-subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"htmlBody":"<p>Vote on Tuesday and make your voice heard!</p>"}'
```

### Test 3: Improve Email
```bash
curl -X POST http://localhost:5000/api/ai/improve-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"htmlBody":"Vote Tuesday.","instructions":"Make it engaging"}'
```

### Via Browser (Email Compose Page)
1. Navigate to `http://localhost:5000/email-compose`
2. Enter campaign idea in "Describe your email idea" field
3. Click "🤖 Generate Email" → HTML auto-generates
4. Write email body or use generated content
5. Click "💡 Suggest Subjects" → 3 options appear in prompt
6. Select one → subject line auto-populated

---

## Limitations & Future Improvements

**Current:**
- Max 2048 tokens per response (Haiku limit)
- No streaming support (full response buffered before return)
- No cost tracking per request
- No audit log of AI-generated content

**Future:**
- Switch to Claude Sonnet for longer, higher-quality content
- Implement streaming response for faster UX
- Add approval workflow for AI-generated content before send
- Track AI usage metrics per user/campaign
- Cache frequently-generated prompts

---

**Last Updated:** May 15, 2026  
**System:** Heidi Voter Dashboard  
**Maintainer:** Development Team
