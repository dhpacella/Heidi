import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { volunteerService } from '../services/api';

function AssignedVoters() {
  const user = useSelector(state => state.auth.user);
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVolunteer = async () => {
      try {
        const data = await volunteerService.getAll();
        const myVolunteer = data.volunteers?.find(v => v.user_id === user.id) || data.volunteers?.[0];
        if (myVolunteer) {
          const detail = await volunteerService.getById(myVolunteer.id);
          setVolunteer(detail);
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

  const assignments = volunteer?.assignments || [];
  const filteredAssignments = assignments.filter(a => a.status === activeTab);

  return (
    <div style={{
      fontFamily: "'Barlow', sans-serif",
      background: '#0B1929',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {['pending', 'visited'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? '#F5A623' : '#122338',
                color: activeTab === tab ? '#0B1929' : '#8BA3BE',
                border: `1px solid ${activeTab === tab ? '#F5A623' : '#243D56'}`,
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all .2s'
              }}
            >
              {tab === 'pending' ? '⏳ Pending' : '✅ Visited'} ({filteredAssignments.length})
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map(assignment => (
              <div
                key={assignment.id}
                onClick={() => navigate(`/voters/${assignment.id}`, { state: { assignment } })}
                style={{
                  padding: '1rem',
                  background: '#122338',
                  border: '1px solid #243D56',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all .15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#F5A623'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#243D56'}
              >
                <div style={{ color: '#EEF2F7', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {assignment.voter?.first_name} {assignment.voter?.last_name}
                </div>
                <div style={{ color: '#8BA3BE', fontSize: 12, marginBottom: '0.5rem' }}>
                  {assignment.voter?.address}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8BA3BE', fontSize: 11 }}>
                    {assignment.voter?.party || 'Party Unknown'}
                  </span>
                  <span style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: assignment.status === 'visited' ? '#22C55E' : '#F59E0B',
                    color: '#fff',
                    borderRadius: 3,
                    fontWeight: 600
                  }}>
                    {assignment.status === 'visited' ? '✅ Visited' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#8BA3BE', padding: '2rem' }}>
              No {activeTab} voters to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssignedVoters;
