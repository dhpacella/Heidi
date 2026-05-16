import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { volunteerService } from '../services/api';
import { startGpsTracking } from '../services/gps';

function Dashboard() {
  const user = useSelector(state => state.auth.user);
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVolunteer = async () => {
      try {
        const data = await volunteerService.getAll();
        const myVolunteer = data.volunteers?.find(v => v.user_id === user.id) || data.volunteers?.[0];
        if (myVolunteer) {
          const detail = await volunteerService.getById(myVolunteer.id);
          setVolunteer(detail);
          startGpsTracking(myVolunteer.id, volunteerService.logGps);
        }
      } catch (err) {
        console.error('Failed to load volunteer:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteer();
  }, [user.id]);

  if (loading) {
    return <div style={{ padding: '2rem', color: '#EEF2F7' }}>Loading...</div>;
  }

  const totalCount = volunteer?.assignments?.length || 0;
  const visitedCount = volunteer?.assignments?.filter(a => a.status === 'visited').length || 0;
  const pendingCount = totalCount - visitedCount;
  const percentage = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  return (
    <div style={{
      fontFamily: "'Barlow', sans-serif",
      background: '#0B1929',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {volunteer && (
          <>
            <div style={{
              background: 'linear-gradient(135deg,#0B1929 0%,#122338 40%,#1A3550 100%)',
              border: '1px solid #243D56',
              borderRadius: 12,
              padding: '2rem',
              marginBottom: '2rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#F5A623,transparent)' }} />
              <h1 style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#EEF2F7',
                margin: '0 0 0.5rem 0'
              }}>
                Welcome, {volunteer.name}!
              </h1>
              <p style={{ color: '#8BA3BE', margin: 0 }}>Homer Glen, IL • {volunteer.phone}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Assigned', value: totalCount },
                { label: 'Visited', value: visitedCount },
                { label: 'Pending', value: pendingCount }
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#122338',
                  border: '1px solid #243D56',
                  borderRadius: 8,
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: 11, color: '#8BA3BE', textTransform: 'uppercase', margin: 0, letterSpacing: '.03em' }}>
                    {label}
                  </p>
                  <p style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#F5A623',
                    margin: '0.5rem 0 0 0'
                  }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              background: '#122338',
              border: '1px solid #243D56',
              borderRadius: 8,
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#F5A623', textTransform: 'uppercase', margin: '0 0 1rem 0', letterSpacing: '.04em' }}>
                Progress
              </h2>
              <div style={{
                height: 8,
                background: '#0B1929',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: '#F5A623',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ color: '#8BA3BE', fontSize: 12, margin: 0 }}>
                {visitedCount} of {totalCount} visits completed ({percentage}%)
              </p>
            </div>

            <button
              onClick={() => navigate('/voters')}
              style={{
                padding: '12px 24px',
                background: '#F5A623',
                color: '#0B1929',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all .2s'
              }}
              onMouseEnter={e => e.target.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.target.style.filter = 'none'}
            >
              View My List →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
