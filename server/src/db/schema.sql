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
