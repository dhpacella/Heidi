import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/slices/authSlice';

function Navigation() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const [emailOpen, setEmailOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setEmailOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navStyle = {
    background: '#122338',
    borderBottom: '3px solid #F5A623',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontFamily: "'Barlow', sans-serif",
    flexWrap: 'wrap',
    minHeight: 52,
  };

  const brandStyle = {
    color: '#F5A623',
    textDecoration: 'none',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1.2rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    marginRight: '1rem',
    padding: '12px 0',
  };

  const linkStyle = {
    color: '#8BA3BE',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    letterSpacing: '.03em',
    transition: 'all .15s',
  };

  const emailPages = [
    { label: '📝 Compose', to: '/email' },
    { label: '📈 Analytics', to: '/analytics' },
    { label: '📊 Reports', to: '/reports' },
    { label: '🌐 Domain Setup', to: '/email-domain' },
    { label: '📋 Lists', to: '/lists' },
  ];

  return (
    <nav style={navStyle}>
      <Link to="/" style={brandStyle}>🗳 Heidi Dashboard</Link>

      <Link to="/" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        📊 Dashboard
      </Link>

      <Link to="/import" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        📥 Import
      </Link>

      <Link to="/voters" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        👥 Voters
      </Link>

      <Link to="/precincts" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        🗺️ Precincts
      </Link>

      <Link to="/super-picks" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        ⭐ Super Picks
      </Link>

      <Link to="/volunteers" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        🙋 Volunteers
      </Link>

      {/* Email Dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setEmailOpen(o => !o)}
          style={{
            ...linkStyle,
            background: emailOpen ? '#1A3550' : 'transparent',
            color: emailOpen ? '#F5A623' : '#8BA3BE',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          📧 Email Outreach
          <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.7 }}>{emailOpen ? '▲' : '▼'}</span>
        </button>

        {emailOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: '#122338',
            border: '1px solid #243D56',
            borderRadius: 8,
            minWidth: 180,
            zIndex: 1000,
            marginTop: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,.5)',
            overflow: 'hidden',
          }}>
            {emailPages.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setEmailOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  color: '#8BA3BE',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  borderBottom: '1px solid #1A3550',
                  transition: 'all .12s',
                }}
                onMouseEnter={e => { e.target.style.background = '#1A3550'; e.target.style.color = '#F5A623'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#8BA3BE'; }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link to="/sms-compose" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        💬 SMS
      </Link>

      <Link to="/canvassing" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        🚪 Canvassing
      </Link>

      <Link to="/export" style={linkStyle}
        onMouseEnter={e => { e.target.style.color = '#F5A623'; e.target.style.background = '#1A3550'; }}
        onMouseLeave={e => { e.target.style.color = '#8BA3BE'; e.target.style.background = 'transparent'; }}>
        📤 Export
      </Link>

      {isAuthenticated && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#8BA3BE' }}>{user?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: '#FF4D6D',
              border: '1px solid #FF4D6D',
              padding: '5px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Barlow', sans-serif",
              transition: 'all .2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,77,109,.15)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navigation;
