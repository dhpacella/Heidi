-- Initial Database Schema for Voter Tracking System
-- Idempotent: safe to run repeatedly. Apply via `npm run db:migrate`.

-- Precincts (referenced by voters and turnout_history; declare first)
CREATE TABLE IF NOT EXISTS precincts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  precinct_code VARCHAR(50) UNIQUE NOT NULL,
  county VARCHAR(100),
  state VARCHAR(2),
  partisan_lean VARCHAR(50),
  registration_potential INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voters
CREATE TABLE IF NOT EXISTS voters (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address VARCHAR(255),
  precinct_id INTEGER REFERENCES precincts(id) ON DELETE SET NULL,
  party_affiliation VARCHAR(50),
  registration_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voting history (long format: one row per voter per election)
CREATE TABLE IF NOT EXISTS voting_history (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  election_type VARCHAR(50),
  voted BOOLEAN DEFAULT TRUE,
  party_voted VARCHAR(50),
  election_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canvassing activities (door knocks, calls, etc.)
CREATE TABLE IF NOT EXISTS canvassing_activities (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),
  notes TEXT,
  contact_result VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

-- Turnout history (per precinct per election year)
CREATE TABLE IF NOT EXISTS turnout_history (
  id SERIAL PRIMARY KEY,
  precinct_id INTEGER NOT NULL REFERENCES precincts(id) ON DELETE CASCADE,
  election_year INTEGER NOT NULL,
  total_registered INTEGER,
  total_voted INTEGER,
  turnout_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (campaign staff)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session store for connect-pg-simple
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

-- Voter referrals (neighbor referrals from voters)
CREATE TABLE IF NOT EXISTS voter_referrals (
  id SERIAL PRIMARY KEY,
  -- Who referred
  referrer_name VARCHAR(200),
  referrer_email VARCHAR(255),
  referrer_phone VARCHAR(20),
  referrer_voter_id INTEGER REFERENCES voters(id) ON DELETE SET NULL,
  -- Referred neighbor
  referred_first_name VARCHAR(100) NOT NULL,
  referred_last_name VARCHAR(100) NOT NULL,
  referred_email VARCHAR(255),
  referred_phone VARCHAR(20),
  referred_address VARCHAR(255),
  referred_voter_id INTEGER REFERENCES voters(id) ON DELETE SET NULL,
  -- Outreach tracking
  contact_method VARCHAR(20) DEFAULT 'both',
  status VARCHAR(50) DEFAULT 'sent',
  sendy_campaign_id VARCHAR(100),
  aws_sms_message_id VARCHAR(100),
  message_sent_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Blasts (outbound SMS campaigns)
CREATE TABLE IF NOT EXISTS sms_blasts (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  parts_per_message INTEGER DEFAULT 1,
  total_cost DECIMAL(10, 4),
  status VARCHAR(50) DEFAULT 'sent',
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Blasts (outbound email campaigns)
CREATE TABLE IF NOT EXISTS email_blasts (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  recipient_count INTEGER NOT NULL,
  total_cost DECIMAL(10, 6),
  status VARCHAR(50) DEFAULT 'sent',
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Recipients (individual recipients per blast)
CREATE TABLE IF NOT EXISTS email_recipients (
  id SERIAL PRIMARY KEY,
  blast_id INTEGER NOT NULL REFERENCES email_blasts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Lists (named subscriber lists)
CREATE TABLE IF NOT EXISTS email_lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Subscribers (subscribers per list with custom fields)
CREATE TABLE IF NOT EXISTS email_subscribers (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  custom_fields JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(list_id, email)
);

-- Email Segments (saved filter conditions on a list)
CREATE TABLE IF NOT EXISTS email_segments (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  conditions JSONB NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_blasts_sender ON sms_blasts(sender_id);
CREATE INDEX IF NOT EXISTS idx_sms_blasts_created ON sms_blasts(created_at);
CREATE INDEX IF NOT EXISTS idx_email_blasts_sender ON email_blasts(sender_id);
CREATE INDEX IF NOT EXISTS idx_email_blasts_created ON email_blasts(created_at);
CREATE INDEX IF NOT EXISTS idx_email_recipients_blast ON email_recipients(blast_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_email ON email_recipients(email);
CREATE INDEX IF NOT EXISTS idx_voters_name ON voters(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON voter_referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON voter_referrals(created_at);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_voter ON voter_referrals(referrer_voter_id);
CREATE INDEX IF NOT EXISTS idx_voters_email ON voters(email);
CREATE INDEX IF NOT EXISTS idx_voters_precinct ON voters(precinct_id);
CREATE INDEX IF NOT EXISTS idx_voters_party ON voters(party_affiliation);
CREATE INDEX IF NOT EXISTS idx_voting_history_voter_year ON voting_history(voter_id, election_year);
CREATE INDEX IF NOT EXISTS idx_canvassing_voter ON canvassing_activities(voter_id);
CREATE INDEX IF NOT EXISTS idx_canvassing_created ON canvassing_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_turnout_precinct_year ON turnout_history(precinct_id, election_year);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_list ON email_subscribers(list_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_segments_list ON email_segments(list_id);

-- Email Tracking (open/click/bounce)
ALTER TABLE email_recipients
  ADD COLUMN IF NOT EXISTS ses_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_email_recipients_ses_message_id ON email_recipients(ses_message_id);

-- Email Templates (reusable message templates)
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id);

-- Scheduled Sending Support
ALTER TABLE email_blasts
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS list_id INTEGER REFERENCES email_lists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS segment_id INTEGER REFERENCES email_segments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_blasts_scheduled ON email_blasts(scheduled_at) WHERE status = 'scheduled';

-- Enhanced Email Composition Fields
ALTER TABLE email_blasts
  ADD COLUMN IF NOT EXISTS from_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255),
  ADD COLUMN IF NOT EXISTS plain_text_body TEXT,
  ADD COLUMN IF NOT EXISTS query_string TEXT,
  ADD COLUMN IF NOT EXISTS web_language VARCHAR(10) DEFAULT 'en';

-- A/B Testing Support
ALTER TABLE email_blasts
  ADD COLUMN IF NOT EXISTS ab_test_id INTEGER REFERENCES email_blasts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ab_variant CHAR(1);

ALTER TABLE email_recipients
  ADD COLUMN IF NOT EXISTS ab_variant CHAR(1);

CREATE INDEX IF NOT EXISTS idx_email_blasts_ab_test ON email_blasts(ab_test_id);

-- Email Metrics Support (unsubscribe, delivery confirmation, bounce details)
ALTER TABLE email_recipients
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bounce_subtype VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bounce_diagnostic_code TEXT;

CREATE INDEX IF NOT EXISTS idx_email_recipients_unsub ON email_recipients(unsubscribed_at);
CREATE INDEX IF NOT EXISTS idx_email_recipients_delivered ON email_recipients(delivered_at);

-- Volunteers (linked to users table)
CREATE TABLE IF NOT EXISTS volunteers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  precinct_id INTEGER REFERENCES precincts(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voter assignments per volunteer
CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id SERIAL PRIMARY KEY,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  visited_at TIMESTAMP,
  notes TEXT,
  already_canvassed BOOLEAN DEFAULT FALSE,
  canvassed_at TIMESTAMP,
  concerns JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(volunteer_id, voter_id)
);

-- GPS tracking log
CREATE TABLE IF NOT EXISTS volunteer_gps (
  id SERIAL PRIMARY KEY,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Heidi's posts and polls (public voter content)
CREATE TABLE IF NOT EXISTS heidi_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS heidi_polls (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  closes_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES heidi_polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voter_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, voter_ip)
);

-- Volunteer indexes
CREATE INDEX IF NOT EXISTS idx_volunteers_user ON volunteers(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_precinct ON volunteers(precinct_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer ON volunteer_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_voter ON volunteer_assignments(voter_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_gps_volunteer ON volunteer_gps(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_gps_recorded ON volunteer_gps(recorded_at);

-- Heidi content indexes
CREATE INDEX IF NOT EXISTS idx_heidi_posts_published ON heidi_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_heidi_posts_slug ON heidi_posts(slug);
CREATE INDEX IF NOT EXISTS idx_heidi_polls_active ON heidi_polls(active);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- Site content (editable page text for the voter website)
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO site_content (key, value) VALUES
  ('hero_headline', 'Heidi For Homer'),
  ('hero_tagline', 'Preserving Open Space • Protecting Our Community'),
  ('hero_subtext', 'Fighting to save Homer Glen''s trees, farmland, and character'),
  ('about_para1', 'Heidi Pacella is an advocate for preserving open space and maintaining the assets of Homer Glen. With a degree in Psychology and minor in Creative Writing from DePaul University, she brings thoughtful leadership to community issues.'),
  ('about_para2', 'Growing up in a family business, Heidi understands the dedication required to build thriving operations and vibrant communities. She''s committed to championing small, local establishments that give Homer Glen its unique character.'),
  ('about_para3', 'Heidi believes Homer Glen''s greatest strengths lie in its environment and natural biomes. She opposes unnecessary infrastructure projects and fights to preserve our trees, farmland, and community character for future generations.'),
  ('platform_0_title', '✓ Environmental Protection'),
  ('platform_0_text', 'Preserve Homer Glen''s open spaces, natural habitats, and tree canopy. Oppose destructive infrastructure projects like the 143rd Street widening.'),
  ('platform_1_title', '✓ Support Small Business'),
  ('platform_1_text', 'Champion local, family-run businesses. Sustain the economic vitality that keeps Homer Glen vibrant and unique.'),
  ('platform_2_title', '✓ Historic Preservation'),
  ('platform_2_text', 'Protect farmland and community character. Keep Homer Glen a place where people move to preserve, not escape.'),
  ('platform_3_title', '✓ Government Accountability'),
  ('platform_3_text', 'Professional, performance-focused leadership. Transparent decision-making that serves the whole community, not special interests.'),
  ('issue_0_icon', '🌳'),
  ('issue_0_title', 'Open Space Protection'),
  ('issue_0_desc', 'Preserve natural biomes & trees'),
  ('issue_1_icon', '🛑'),
  ('issue_1_title', 'Stop 143rd St Widening'),
  ('issue_1_desc', 'Oppose unnecessary expansion'),
  ('issue_2_icon', '🚜'),
  ('issue_2_title', 'Preserve Farmland'),
  ('issue_2_desc', 'Sustain agricultural heritage'),
  ('issue_3_icon', '🏪'),
  ('issue_3_title', 'Support Local Business'),
  ('issue_3_desc', 'Champion small family businesses'),
  ('cta_headline', 'Help Save Homer Glen'),
  ('cta_text', 'Join us in fighting to preserve open space, protect our trees and farmland, and keep Homer Glen a place where the environment matters. Every voice counts.')
ON CONFLICT (key) DO NOTHING;
