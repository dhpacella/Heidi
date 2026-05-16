# Complete 17-Page Inventory

## 1. Dashboard
- **Route:** `/`
- **File:** `Dashboard.js`
- **Purpose:** Main landing page with voter statistics overview
- **Functions:**
  - Display total voter count
  - Show recent campaigns
  - Campaign performance summary
  - Quick access buttons to main features

## 2. Voter Filter
- **Route:** `/voters`
- **File:** `VoterFilter.js`
- **Purpose:** Advanced search and filtering of voter database
- **Functions:**
  - Search voters by name, email, phone
  - Filter by precinct, status, engagement
  - View voter profile details
  - Bulk actions on selected voters
  - Export filtered results

## 3. Precinct Prioritization
- **Route:** `/precincts`
- **File:** `PrecinctPrioritization.js`
- **Purpose:** Organize voters by precinct and set priorities
- **Functions:**
  - View all precincts with voter counts
  - Assign priority levels (high/medium/low)
  - Segment by precinct
  - Track outreach by precinct
  - Compare precinct performance

## 4. Super Picks
- **Route:** `/super-picks`
- **File:** `SuperPicks.js`
- **Purpose:** AI-powered high-priority voter selection
- **Functions:**
  - Generate top prospect list
  - View engagement scores
  - Create custom picks based on criteria
  - Sort by predicted conversion likelihood
  - Target specific voter segments

## 5. Voter Import
- **Route:** `/import`
- **File:** `VoterImport.js`
- **Purpose:** Bulk import voter data from CSV/Excel
- **Functions:**
  - Upload CSV or Excel files
  - Map columns to database fields
  - Preview before import
  - Validate email/phone formats
  - Detect duplicates
  - Generate import report

## 6. Email Campaigns (UNIFIED)
- **Route:** `/email`
- **File:** `EmailCampaigns.js` ⭐ NEW
- **Purpose:** Compose and manage all email campaigns (COMBINED PAGE)
- **Functions:**
  - Compose new campaigns (left: list, right: form)
  - View all campaigns in sortable table
  - Load/save email templates
  - Personalization tokens ({first_name}, {last_name}, {email})
  - Schedule campaigns for future send
  - File upload or manual recipient entry
  - Real-time cost calculation ($0.0001/email)
  - Campaign status tracking
  - Click campaign to view performance details

## 7. Campaign Analytics
- **Route:** `/analytics`
- **File:** `CampaignAnalytics.js`
- **Purpose:** Real-time campaign performance dashboard
- **Functions:**
  - Track opens, clicks, delivery rates
  - View campaign metrics in charts
  - Filter by date range
  - Compare multiple campaigns
  - ROI calculation
  - Live performance updates

## 8. Reports Page
- **Route:** `/reports`
- **File:** `ReportsPage.js`
- **Purpose:** Comprehensive campaign analysis with detailed metrics
- **Functions:**
  - Sortable campaign table
  - Recipients per campaign
  - Color-coded open rate % (green/orange/red)
  - Color-coded click rate % (blue shades)
  - Status badges for campaign state
  - Send date/time tracking
  - Export reports to CSV

## 9. Email Domain Config
- **Route:** `/email-domain`
- **File:** `EmailDomainConfig.js`
- **Purpose:** Setup custom email domain for branding
- **Functions:**
  - Configure sending domain (e.g., news.cushingtrans.com)
  - Display DNS CNAME record instructions
  - Step-by-step setup guide
  - Domain verification testing
  - Enable/disable domain toggle
  - Show domain usage (sending, tracking, unsubscribe)

## 10. Lists Management
- **Route:** `/lists`
- **File:** `ListsManagement.js`
- **Purpose:** Create and manage subscriber email lists
- **Functions:**
  - Create named email lists
  - View list statistics (subscriber count)
  - Search lists by name
  - Delete lists
  - Track list creation date
  - Display subscriber counts
  - Quick access to list details

## 11. List Details
- **Route:** `/lists/:listId`
- **File:** `ListDetails.js`
- **Purpose:** Manage subscribers within a specific list
- **Functions:**
  - View all subscribers in list
  - Add individual subscribers
  - Delete subscribers
  - Search by email or name
  - Track subscriber status (active/unsubscribed/bounced)
  - View last activity timestamp
  - Display subscriber statistics

## 12. SMS Compose
- **Route:** `/sms-compose`
- **File:** `SMSCompose.js`
- **Purpose:** Create and send bulk SMS campaigns
- **Functions:**
  - Compose SMS message
  - Live character counter
  - SMS segment count (160 char segments)
  - File upload (CSV/Excel with phones)
  - Manual phone number entry
  - Phone number normalization (+1 format)
  - Real-time cost calculation ($0.0075/SMS)
  - Deduplication of phone numbers
  - Confirm & send modal

## 13. Canvassing
- **Route:** `/canvassing`
- **File:** `Canvassing.js`
- **Purpose:** Door-knock tracking and volunteer engagement
- **Functions:**
  - Log voter door-knock visits
  - Record conversation notes
  - Track engagement level
  - Map visited precincts
  - View canvassing statistics
  - Assign volunteers to routes
  - Monitor team activity

## 14. Data Export
- **Route:** `/export`
- **File:** `DataExport.js`
- **Purpose:** Export data for external analysis
- **Functions:**
  - Export voter data (CSV/Excel)
  - Export campaign results
  - Export campaign performance metrics
  - Filter export by date range
  - Select fields to export
  - Download formatted files

## 15. Login
- **Route:** `/login`
- **File:** `Login.js`
- **Purpose:** User authentication
- **Functions:**
  - Email/password login
  - JWT token generation
  - Session management
  - Remember me option
  - Password validation
  - Error handling & feedback

## 16. Email Compose (LEGACY)
- **Route:** `/email-compose`
- **File:** `EmailCompose.js`
- **Status:** ⚠️ DEPRECATED - Redirects to `/email`
- **Note:** Maintained for backward compatibility only

## 17. Email Outreach (LEGACY)
- **Route:** `/email-outreach`
- **File:** `EmailOutreach.js`
- **Status:** ⚠️ DEPRECATED - Redirects to `/email`
- **Note:** Maintained for backward compatibility only

---

## Summary by Category

### 📧 Email Management (6 pages)
1. Email Campaigns (unified compose + list)
2. Campaign Analytics
3. Reports Page
4. Email Domain Config
5. Email Compose (legacy)
6. Email Outreach (legacy)

### 👥 Voter Management (4 pages)
1. Dashboard
2. Voter Filter
3. Precinct Prioritization
4. Super Picks
5. Voter Import

### 💬 SMS & Engagement (2 pages)
1. SMS Compose
2. Canvassing

### 📋 Subscriber Lists (2 pages)
1. Lists Management
2. List Details

### 📊 Data & Auth (2 pages)
1. Data Export
2. Login

---

## All 17 Pages Status

✅ All 17 pages fully functional
✅ All routes accessible
✅ All APIs integrated
✅ Production ready

**Total Features:** 50+ distinct functions across all pages
