#!/usr/bin/env python3
"""
Initialize local SQLite database for voter dashboard development.
Run: python3 init-sqlite-db.py
"""

import sqlite3
import json
from datetime import datetime
import hashlib
import bcrypt

DB_PATH = 'heidi-dev.db'

def hash_password(password):
    """Hash password using bcrypt (matches Node.js bcryptjs)"""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def init_database():
    """Create and initialize SQLite database with schema"""

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute('PRAGMA foreign_keys = ON')

    print("Creating tables...")

    # Precincts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS precincts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            precinct_code TEXT UNIQUE NOT NULL,
            county TEXT,
            state TEXT,
            partisan_lean TEXT,
            registration_potential INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Voters
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            precinct_id INTEGER REFERENCES precincts(id) ON DELETE SET NULL,
            party_affiliation TEXT,
            registration_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Voting history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voting_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
            election_year INTEGER NOT NULL,
            election_type TEXT,
            voted BOOLEAN DEFAULT 1,
            party_voted TEXT,
            election_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Canvassing activities
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS canvassing_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
            activity_type TEXT,
            notes TEXT,
            contact_result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT
        )
    ''')

    # Turnout history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS turnout_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            precinct_id INTEGER NOT NULL REFERENCES precincts(id) ON DELETE CASCADE,
            election_year INTEGER NOT NULL,
            total_registered INTEGER,
            total_voted INTEGER,
            turnout_percentage DECIMAL(5, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Users (campaign staff)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'staff',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # User sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            sid TEXT PRIMARY KEY,
            sess TEXT NOT NULL,
            expire TIMESTAMP NOT NULL
        )
    ''')

    # Voter referrals
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voter_referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_name TEXT,
            referrer_email TEXT,
            referrer_phone TEXT,
            referrer_voter_id INTEGER REFERENCES voters(id) ON DELETE SET NULL,
            referred_first_name TEXT NOT NULL,
            referred_last_name TEXT NOT NULL,
            referred_email TEXT,
            referred_phone TEXT,
            referred_address TEXT,
            referred_voter_id INTEGER REFERENCES voters(id) ON DELETE SET NULL,
            contact_method TEXT DEFAULT 'both',
            status TEXT DEFAULT 'sent',
            sendy_campaign_id TEXT,
            aws_sms_message_id TEXT,
            message_sent_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # SMS Blasts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sms_blasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            recipient_count INTEGER NOT NULL,
            parts_per_message INTEGER DEFAULT 1,
            total_cost DECIMAL(10, 4),
            status TEXT DEFAULT 'sent',
            results TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Email Blasts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_blasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject TEXT NOT NULL,
            html_body TEXT NOT NULL,
            from_address TEXT NOT NULL,
            recipient_count INTEGER NOT NULL,
            total_cost DECIMAL(10, 6),
            status TEXT DEFAULT 'sent',
            results TEXT,
            scheduled_at TIMESTAMP,
            sent_at TIMESTAMP,
            list_id INTEGER REFERENCES email_lists(id) ON DELETE SET NULL,
            segment_id INTEGER REFERENCES email_segments(id) ON DELETE SET NULL,
            ab_test_id INTEGER REFERENCES email_blasts(id) ON DELETE SET NULL,
            ab_variant TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Email Recipients
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blast_id INTEGER NOT NULL REFERENCES email_blasts(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            status TEXT DEFAULT 'sent',
            ses_message_id TEXT,
            opened_at TIMESTAMP,
            clicked_at TIMESTAMP,
            bounced_at TIMESTAMP,
            bounce_type TEXT,
            complained_at TIMESTAMP,
            unsubscribed_at TIMESTAMP,
            delivered_at TIMESTAMP,
            bounce_subtype TEXT,
            bounce_diagnostic_code TEXT,
            ab_variant TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Email Lists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subscriber_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Email Subscribers
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            custom_fields TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(list_id, email)
        )
    ''')

    # Email Segments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            conditions TEXT NOT NULL,
            created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Email Templates
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            html_body TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Volunteers
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS volunteers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            phone TEXT,
            precinct_id INTEGER REFERENCES precincts(id) ON DELETE SET NULL,
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Volunteer Assignments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS volunteer_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
            voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'pending',
            visited_at TIMESTAMP,
            notes TEXT,
            already_canvassed BOOLEAN DEFAULT 0,
            canvassed_at TIMESTAMP,
            concerns TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(volunteer_id, voter_id)
        )
    ''')

    # Volunteer GPS
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS volunteer_gps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create indexes
    print("Creating indexes...")
    indexes = [
        'CREATE INDEX IF NOT EXISTS idx_voters_name ON voters(last_name, first_name)',
        'CREATE INDEX IF NOT EXISTS idx_voters_email ON voters(email)',
        'CREATE INDEX IF NOT EXISTS idx_voters_precinct ON voters(precinct_id)',
        'CREATE INDEX IF NOT EXISTS idx_voters_party ON voters(party_affiliation)',
        'CREATE INDEX IF NOT EXISTS idx_voting_history_voter_year ON voting_history(voter_id, election_year)',
        'CREATE INDEX IF NOT EXISTS idx_canvassing_voter ON canvassing_activities(voter_id)',
        'CREATE INDEX IF NOT EXISTS idx_canvassing_created ON canvassing_activities(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_turnout_precinct_year ON turnout_history(precinct_id, election_year)',
        'CREATE INDEX IF NOT EXISTS idx_sms_blasts_sender ON sms_blasts(sender_id)',
        'CREATE INDEX IF NOT EXISTS idx_sms_blasts_created ON sms_blasts(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_email_blasts_sender ON email_blasts(sender_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_blasts_created ON email_blasts(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_email_blasts_scheduled ON email_blasts(scheduled_at)',
        'CREATE INDEX IF NOT EXISTS idx_email_blasts_ab_test ON email_blasts(ab_test_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_recipients_blast ON email_recipients(blast_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_recipients_email ON email_recipients(email)',
        'CREATE INDEX IF NOT EXISTS idx_email_recipients_ses_message_id ON email_recipients(ses_message_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_recipients_unsub ON email_recipients(unsubscribed_at)',
        'CREATE INDEX IF NOT EXISTS idx_email_recipients_delivered ON email_recipients(delivered_at)',
        'CREATE INDEX IF NOT EXISTS idx_email_subscribers_list ON email_subscribers(list_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email)',
        'CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status)',
        'CREATE INDEX IF NOT EXISTS idx_email_segments_list ON email_segments(list_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_volunteers_user ON volunteers(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_volunteers_precinct ON volunteers(precinct_id)',
        'CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer ON volunteer_assignments(volunteer_id)',
        'CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_voter ON volunteer_assignments(voter_id)',
        'CREATE INDEX IF NOT EXISTS idx_volunteer_gps_volunteer ON volunteer_gps(volunteer_id)',
        'CREATE INDEX IF NOT EXISTS idx_volunteer_gps_recorded ON volunteer_gps(recorded_at)',
        'CREATE INDEX IF NOT EXISTS idx_referrals_status ON voter_referrals(status)',
        'CREATE INDEX IF NOT EXISTS idx_referrals_created ON voter_referrals(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_referrals_referrer_voter ON voter_referrals(referrer_voter_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire)',
    ]

    for index in indexes:
        try:
            cursor.execute(index)
        except sqlite3.OperationalError:
            pass  # Index already exists

    # Create admin user
    print("Creating admin user...")
    admin_email = 'admin@test.com'
    admin_password = 'Admin123!'
    admin_hash = hash_password(admin_password)

    try:
        cursor.execute('''
            DELETE FROM users WHERE email = ?
        ''', (admin_email,))

        cursor.execute('''
            INSERT INTO users (email, name, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (admin_email, 'Admin User', admin_hash, 'admin', datetime.now().isoformat()))
    except sqlite3.IntegrityError as e:
        print(f"Warning: Could not create admin user: {e}")

    # Commit and close
    conn.commit()
    conn.close()

    print(f"✅ SQLite database initialized: {DB_PATH}")
    print(f"📧 Admin credentials: {admin_email} / {admin_password}")

if __name__ == '__main__':
    init_database()
