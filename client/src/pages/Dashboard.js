import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { campaignService } from '../services/api';

function Dashboard() {
  const user = useSelector(state => state.auth.user);
  const [stats, setStats] = useState({
    totalVoters: 0,
    voters3Years: 0,
    precincts: 0,
    canvassingActivities: 0
  });
  const [loading, setLoading] = useState(true);
  const [daysToElection, setDaysToElection] = useState(null);

  const ELECTION_DATE = new Date('2027-04-06');

  useEffect(() => {
    const diff = Math.ceil((ELECTION_DATE - new Date()) / (1000 * 60 * 60 * 24));
    setDaysToElection(diff);

    const fetchStats = async () => {
      try {
        const data = await campaignService.getStats();
        if (data) setStats(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const tabs = [
    { label: 'Filter & search', to: '/voters' },
    { label: 'Upload & import', to: '/import' },
    { label: 'Map view', to: '/precincts' },
    { label: 'Export & walk lists', to: '/export' },
    { label: '🏆 Ground game', to: '/canvassing' },
    { label: '🎯 Smart targeting', to: '/super-picks' },
    { label: '📧 Email campaigns', to: '/email' },
    { label: '💬 SMS', to: '/sms-compose' },
  ];

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", background: '#0B1929', minHeight: '100vh', color: '#EEF2F7' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1.5rem', position: 'relative' }}>

        {/* ── BANNER ── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg,#0B1929 0%,#122338 40%,#1A3550 100%)',
          border: '1px solid #243D56',
          borderRadius: 16,
          marginBottom: '1.5rem',
          boxShadow: '0 8px 40px rgba(0,0,0,.5)'
        }}>
          {/* gold gradient bottom line */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#F5A623,transparent)' }} />
          {/* gold glow top-right */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, background: 'radial-gradient(circle,rgba(245,166,35,.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', gap: 16, flexWrap: 'wrap' }}>
            {/* Left: icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 36, filter: 'drop-shadow(0 2px 8px rgba(245,166,35,.4))' }}>🗳</div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '.02em', color: '#fff', textTransform: 'uppercase', lineHeight: 1, marginBottom: 5 }}>
                  Heidi Pacella <span style={{ color: '#F5A623' }}>for Mayor</span>
                </div>
                <div style={{ fontSize: 12, color: '#8BA3BE', letterSpacing: '.03em' }}>
                  <strong style={{ color: '#EEF2F7' }}>Homer Glen, IL</strong>
                  &nbsp;·&nbsp; {loading ? '—' : stats.totalVoters.toLocaleString()} registered voters
                  &nbsp;·&nbsp; {loading ? '—' : stats.precincts} precincts
                  &nbsp;·&nbsp; April 6, 2027
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: '#243D56', height: 50, flexShrink: 0 }} />

            {/* Right: days counter */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 42, fontWeight: 800, color: '#F5A623', lineHeight: 1, textShadow: '0 0 30px rgba(245,166,35,.4)' }}>
                {daysToElection !== null ? daysToElection : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#8BA3BE', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>
                days to election
              </div>
              {user && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#8BA3BE' }}>
                  Signed in as <span style={{ color: '#EEF2F7', fontWeight: 600 }}>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{
          display: 'flex', gap: 2,
          background: '#122338',
          border: '1px solid #243D56',
          borderRadius: 12,
          padding: 4,
          marginBottom: '1.25rem',
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <Link
              key={tab.to}
              to={tab.to}
              style={{
                padding: '8px 18px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: '#8BA3BE',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.target.style.color = '#EEF2F7'; e.target.style.background = '#1A3550'; }}
              onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* ── STATS GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { icon: '👥', label: 'Total Voters', value: stats.totalVoters, sub: 'Registered in database' },
            { icon: '🗳', label: 'Active Voters', value: stats.voters3Years, sub: 'Voted in last 3 years' },
            { icon: '🗺️', label: 'Precincts', value: stats.precincts, sub: 'Active precincts' },
            { icon: '🚪', label: 'Canvassing', value: stats.canvassingActivities, sub: 'Door-knock activities', gold: true },
          ].map(({ icon, label, value, sub, gold }) => (
            <div key={label} style={{
              background: '#122338',
              border: '1px solid #243D56',
              borderRadius: 10,
              padding: 16,
              cursor: 'default',
              transition: 'border-color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#F5A623'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#243D56'}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8BA3BE', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                {icon} {label}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800, color: gold ? '#F5A623' : '#fff' }}>
                {loading ? '—' : value.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#8BA3BE', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── QUICK ACCESS ── */}
        <div style={{
          background: '#122338',
          border: '1px solid #243D56',
          borderRadius: 10,
          padding: 16,
          marginBottom: '1.25rem'
        }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>
            Quick access
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: '🚪 Door-knock list', to: '/voters' },
              { label: '📊 Reports', to: '/reports' },
              { label: '📧 New email campaign', to: '/email' },
              { label: '💬 Send SMS', to: '/sms-compose' },
              { label: '⭐ Super Picks', to: '/super-picks' },
              { label: '📥 Import voters', to: '/import' },
              { label: '📋 Email lists', to: '/lists' },
              { label: '📈 Analytics', to: '/analytics' },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                style={{
                  fontSize: 12, padding: '6px 16px',
                  border: '1px solid #243D56', borderRadius: 20,
                  background: '#0B1929', cursor: 'pointer', color: '#8BA3BE',
                  fontWeight: 600, textDecoration: 'none', transition: 'all .12s',
                  display: 'inline-block',
                }}
                onMouseEnter={e => { e.target.style.background = '#F5A623'; e.target.style.color = '#0B1929'; e.target.style.borderColor = '#F5A623'; }}
                onMouseLeave={e => { e.target.style.background = '#0B1929'; e.target.style.color = '#8BA3BE'; e.target.style.borderColor = '#243D56'; }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
