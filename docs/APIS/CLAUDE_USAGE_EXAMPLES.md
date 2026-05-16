# Claude API Usage Examples

## Frontend (Browser Console)

### Test Generate Email
```javascript
// Simulate clicking "Generate Email" button
await fetch('/api/ai/generate-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idea: 'Encourage registered voters to participate',
    campaignName: 'Election Day 2024'
  })
})
.then(r => r.json())
.then(d => console.log(d.html))
```

### Test Suggest Subjects
```javascript
await fetch('/api/ai/suggest-subjects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    htmlBody: '<p>Join us this Tuesday to cast your vote. Your voice matters!</p>'
  })
})
.then(r => r.json())
.then(d => console.log(d.subjects))
```

### Test Improve Email
```javascript
await fetch('/api/ai/improve-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    htmlBody: '<p>Vote on Tuesday.</p>',
    instructions: 'Make it more compelling and include a clear CTA'
  })
})
.then(r => r.json())
.then(d => console.log(d.html))
```

---

## PowerShell / cURL (Command Line)

### Generate Email
```bash
curl -X POST http://localhost:5000/api/ai/generate-email \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d "{\"idea\":\"Voter turnout drive\",\"campaignName\":\"Election 2024\"}"
```

### Suggest Subjects
```bash
curl -X POST http://localhost:5000/api/ai/suggest-subjects \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d "{\"htmlBody\":\"<p>Vote now and be heard!</p>\"}"
```

### Improve Email
```bash
curl -X POST http://localhost:5000/api/ai/improve-email \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d "{\"htmlBody\":\"<p>Hello voters</p>\",\"instructions\":\"Add urgency\"}"
```

---

## Node.js Script

```javascript
const fetch = require('node-fetch');
const axiosInstance = require('axios').default;

const api = axiosInstance.create({
  baseURL: 'http://localhost:5000/api/ai',
  headers: { 'Content-Type': 'application/json' }
});

// Add JWT token or session cookie
api.defaults.headers.common['Authorization'] = 'Bearer YOUR_JWT_TOKEN';

// Generate Email
async function generateEmail(idea, campaignName) {
  const res = await api.post('/generate-email', { idea, campaignName });
  return res.data.html;
}

// Suggest Subjects
async function suggestSubjects(emailBody) {
  const res = await api.post('/suggest-subjects', { htmlBody: emailBody });
  return res.data.subjects;
}

// Improve Email
async function improveEmail(emailBody, instructions) {
  const res = await api.post('/improve-email', { htmlBody: emailBody, instructions });
  return res.data.html;
}

// Analyze Campaign
async function analyzeCampaign(blastMetrics) {
  const res = await api.post('/analyze-campaign', { blast: blastMetrics });
  return res.data.analysis;
}

// Example usage
(async () => {
  try {
    const html = await generateEmail(
      'Get out the vote for Tuesday election',
      'Election 2024 Drive'
    );
    console.log('Generated email:', html);

    const subjects = await suggestSubjects(html);
    console.log('Suggested subjects:', subjects);

    const improved = await improveEmail(html, 'Make it more urgent');
    console.log('Improved email:', improved);

    const analysis = await analyzeCampaign({
      subject: 'Election Day Reminder',
      sent_count: 25000,
      opened_count: 8200,
      clicked_count: 2100
    });
    console.log('Analysis:', analysis);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
```

---

## Real-World Workflow Example

### Step 1: Generate Email from Campaign Idea
```javascript
// User inputs: "Remind voters about polling locations"
const generateRes = await fetch('/api/ai/generate-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idea: 'Remind voters about polling locations and hours',
    campaignName: 'Polling Location Guide'
  })
});

const generated = await generateRes.json();
// Result: HTML email with polling location info
console.log(generated.html); // Paste into HTML editor
```

### Step 2: Suggest Subject Lines
```javascript
// Claude reads the generated HTML
const subjectsRes = await fetch('/api/ai/suggest-subjects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    htmlBody: generated.html
  })
});

const subjects = await subjectsRes.json();
// Result: 3 options
console.log(subjects.subjects);
// [
//   "Find Your Polling Location Now",
//   "Know Where to Vote: Your Polling Place Guide",
//   "Election Day — Everything You Need to Know"
// ]

// User selects option 1 → automatically set as subject line
```

### Step 3: Refine Content
```javascript
// User customizes email, then improves it
const improveRes = await fetch('/api/ai/improve-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    htmlBody: generated.html,
    instructions: 'Add more urgency, include a clear "Find My Polling Location" button'
  })
});

const improved = await improveRes.json();
// Result: Enhanced version with better copy and CTA
```

### Step 4: Send to Test Recipient
```javascript
// Fill in recipient list or manual test entry
// Review email in preview
// Send email

// On recipient: verify HTML renders correctly, CTAs work, etc.
```

### Step 5: Track Performance (Later)
```javascript
// After campaign sends, analyze metrics
const analyticsRes = await fetch('/api/ai/analyze-campaign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blast: {
      subject: 'Find Your Polling Location Now',
      sent_count: 25000,
      delivered_count: 24800,
      opened_count: 7200,
      clicked_count: 1800,
      bounced_count: 200
    }
  })
});

const insights = await analyticsRes.json();
// Result: "28.8% open rate and 7.2% click rate are strong for informational email..."
```

---

## Error Handling Example

```javascript
async function callClaudeAPI(endpoint, payload) {
  try {
    const res = await fetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 400) {
        const err = await res.json();
        console.error('Bad request:', err.error);
      } else if (res.status === 403) {
        console.error('You lack permissions for AI features');
      } else if (res.status === 500) {
        const err = await res.json();
        console.error('Claude API error:', err.error);
      }
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Network error:', err.message);
    return null;
  }
}

// Usage
const result = await callClaudeAPI('generate-email', {
  idea: 'Test',
  campaignName: 'Test'
});

if (result && result.html) {
  console.log('Success:', result.html);
} else {
  console.log('Failed to generate email');
}
```

---

## Performance Considerations

| Endpoint | Time | Notes |
|----------|------|-------|
| Generate Email | 2-4s | First API call slightly slower due to connection |
| Suggest Subjects | 1-2s | Faster; simpler prompt |
| Improve Email | 2-3s | Depends on email length |
| Analyze Campaign | 1-2s | Depends on metrics complexity |

**Tip:** Add loading indicators to UI during these calls.

---

## Environment Variable Setup

Create a `.env` file in the server directory:

```env
# .env
ANTHROPIC_API_KEY=sk-ant-v1-xxxxxxxxxxxxxxxxxxxx
```

Then load it in your Node app:
```javascript
require('dotenv').config();
const apiKey = process.env.ANTHROPIC_API_KEY;
```

---

## Debugging Tips

1. **Enable verbose logging:**
   ```javascript
   console.log('Request:', payload);
   console.log('Response:', responseData);
   ```

2. **Check Claude API status:**
   - Visit https://status.anthropic.com to verify API is up

3. **Verify API key:**
   ```javascript
   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
   // Should initialize without errors
   ```

4. **Test with curl:**
   ```bash
   curl -X POST http://localhost:5000/api/ai/generate-email \
     -H "Content-Type: application/json" \
     -b "connect.sid=$(cat session_cookie.txt)" \
     -d '{"idea":"test","campaignName":"test"}'
   ```

---

## Testing Checklist

- [ ] Generate Email creates valid HTML
- [ ] Suggest Subjects returns 3 distinct options
- [ ] Improve Email enhances clarity/engagement
- [ ] Analyze Campaign provides actionable insights
- [ ] Error handling catches missing/invalid fields
- [ ] Rate limiting not exceeded (check API usage)
- [ ] Permissions checked (admin/campaign_manager role)
- [ ] Environment variable properly set

---

**Last Updated:** May 15, 2026
