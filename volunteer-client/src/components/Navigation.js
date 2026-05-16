import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { stopGpsTracking } from '../services/gps';

function Navigation() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);

  const handleSignOut = () => {
    stopGpsTracking();
    dispatch(logout());
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navStyle = {
    background: '#122338',
    borderBottom: '3px solid #F5A623',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: "'Barlow', sans-serif",
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
    padding: '12px 0',
  };

  return (
    <nav style={navStyle}>
      <span style={brandStyle}>🗳 Heidi Campaign</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && <span style={{ fontSize: 11, color: '#8BA3BE' }}>{user.email}</span>}
        <button
          onClick={handleSignOut}
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
    </nav>
  );
}

export default Navigation;
