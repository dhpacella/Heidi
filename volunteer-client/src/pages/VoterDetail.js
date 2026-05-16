import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { volunteerService } from '../services/api';

function VoterDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(state => state.auth.user);
  const [assignment, setAssignment] = useState(location.state?.assignment || null);
  const [notes, setNotes] = useState(assignment?.notes || '');
  const [concerns, setConcerns] = useState(assignment?.concerns || '');
  const [alreadyCanvassed, setAlreadyCanvassed] = useState(assignment?.already_canvassed || false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await volunteerService.updateAssignment(
        assignment.volunteer_id,
        assignmentId,
        {
          status: 'visited',
          notes,
          concerns,
          already_canvassed: alreadyCanvassed
        }
      );
      setMessage({ type: 'success', text: 'Voter marked as visited' });
      setTimeout(() => navigate('/voters'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  if (!assignment) {
    return <div style={{ padding: '2rem', color: '#EEF2F7' }}>Loading...</div>;
  }

  const voter = assignment.voter || {};

  return (
    <div style={{
      fontFamily: "'Barlow', sans-serif",
      background: '#0B1929',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/voters')}
          style={{
            background: 'transparent',
            color: '#8BA3BE',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: '1.5rem',
            padding: '6px 12px'
          }}
        >
          ← Back to List
        </button>

        <div style={{
          background: '#122338',
          border: '1px solid #243D56',
          borderRadius: 8,
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#EEF2F7',
            margin: '0 0 1rem 0'
          }}>
            {voter.first_name} {voter.last_name}
          </h1>

          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <p style={{ color: '#8BA3BE', fontSize: 12, margin: 0 }}>
              <span style={{ color: '#F5A623', fontWeight: 600 }}>Address:</span> {voter.address}
            </p>
            <p style={{ color: '#8BA3BE', fontSize: 12, margin: 0 }}>
              <span style={{ color: '#F5A623', fontWeight: 600 }}>Phone:</span> {voter.phone}
            </p>
            <p style={{ color: '#8BA3BE', fontSize: 12, margin: 0 }}>
              <span style={{ color: '#F5A623', fontWeight: 600 }}>Party:</span> {voter.party || 'Unknown'}
            </p>
            <p style={{ color: '#8BA3BE', fontSize: 12, margin: 0 }}>
              <span style={{ color: '#F5A623', fontWeight: 600 }}>Precinct:</span> {voter.precinct || 'Unknown'}
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #243D56', margin: '1.5rem 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="canvassed"
              checked={alreadyCanvassed}
              onChange={(e) => setAlreadyCanvassed(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="canvassed" style={{ color: '#8BA3BE', fontSize: 12, cursor: 'pointer', margin: 0 }}>
              Already canvassed by another volunteer
            </label>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#8BA3BE',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
              letterSpacing: '.03em'
            }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this conversation"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0B1929',
                color: '#EEF2F7',
                border: '1px solid #243D56',
                borderRadius: 6,
                fontSize: 12,
                minHeight: '80px',
                fontFamily: "'Barlow', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#8BA3BE',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
              letterSpacing: '.03em'
            }}>
              Concerns/Questions
            </label>
            <textarea
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="Any concerns or follow-up items"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0B1929',
                color: '#EEF2F7',
                border: '1px solid #243D56',
                borderRadius: 6,
                fontSize: 12,
                minHeight: '80px',
                fontFamily: "'Barlow', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>

          {message && (
            <div style={{
              padding: '12px',
              background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 77, 109, 0.15)',
              border: `1px solid ${message.type === 'success' ? '#22C55E' : '#FF4D6D'}`,
              borderRadius: 6,
              fontSize: 12,
              color: message.type === 'success' ? '#86EFAC' : '#FF6B7F',
              marginBottom: '1rem'
            }}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              width: '100%',
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
            {loading ? 'Saving...' : '✅ Mark as Visited & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoterDetail;
