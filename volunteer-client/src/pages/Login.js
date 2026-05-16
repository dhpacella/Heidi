import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/slices/authSlice';
import { authService } from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      
      if (data.user.role !== 'volunteer') {
        setError('This portal is for volunteers only');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "'Barlow', sans-serif",
      background: 'linear-gradient(135deg,#0B1929 0%,#122338 40%,#1A3550 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: '#122338',
        border: '1px solid #243D56',
        borderRadius: 12,
        padding: '2rem',
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>🗳</div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#EEF2F7',
            textTransform: 'uppercase',
            letterSpacing: '.02em',
            margin: '0 0 0.5rem 0'
          }}>
            Heidi Campaign
          </h1>
          <p style={{ color: '#8BA3BE', fontSize: 12, margin: 0 }}>Volunteer Portal</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,77,109,.15)',
            border: '1px solid #FF4D6D',
            borderRadius: 6,
            padding: '12px',
            color: '#FF6B7F',
            fontSize: 12,
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8BA3BE', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.03em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0B1929',
                color: '#EEF2F7',
                border: '1px solid #243D56',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8BA3BE', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.03em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0B1929',
                color: '#EEF2F7',
                border: '1px solid #243D56',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: '#F5A623',
              color: '#0B1929',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all .2s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={e => !loading && (e.target.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.target.style.filter = 'none')}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
