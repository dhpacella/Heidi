import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/public`
  : `http://${window.location.hostname}:5000/api/public`;

export default function Poll({ pollId = 1 }) {
  const [poll, setPoll]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [voted, setVoted]     = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`${API}/polls`)
      .then(r => r.json())
      .then(data => {
        const found = data.polls?.find(p => p.id === pollId);
        if (found) setPoll(found);
      })
      .catch(() => setError('Could not load poll.'));

    const stored = localStorage.getItem(`poll_voted_${pollId}`);
    if (stored) {
      setVoted(true);
      setResults(JSON.parse(stored));
    }
  }, [pollId]);

  async function submitVote() {
    if (selected === null) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex: selected })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vote failed');

      // Fetch updated results
      const r2 = await fetch(`${API}/polls`);
      const d2 = await r2.json();
      const updated = d2.polls?.find(p => p.id === pollId);
      if (updated) {
        setResults(updated.options);
        localStorage.setItem(`poll_voted_${pollId}`, JSON.stringify(updated.options));
      }
      setVoted(true);
    } catch (err) {
      setError(err.message === 'Already voted on this poll' ? 'You have already voted.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!poll) return (
    <div style={{
      background: '#fff', border: '2px solid #1b3a2b', borderRadius: '4px',
      padding: '28px', marginTop: '32px', textAlign: 'center'
    }}>
      {error
        ? <p style={{ color: '#c0392b', fontSize: '14px' }}>{error}</p>
        : <p style={{ color: '#888', fontSize: '14px' }}>Loading poll...</p>
      }
    </div>
  );

  const totalVotes = results ? results.reduce((s, o) => s + o.votes, 0) : 0;
  const colors = ['#1b3a2b', '#c9a84c', '#555'];

  return (
    <div style={{
      background: '#fff',
      border: '2px solid #1b3a2b',
      borderRadius: '4px',
      padding: 'clamp(20px, 5vw, 36px)',
      marginTop: '32px'
    }}>
      <p style={{
        fontSize: '11px', fontWeight: '700', letterSpacing: '3px',
        textTransform: 'uppercase', color: '#c9a84c', marginBottom: '14px'
      }}>
        Community Poll
      </p>
      <p style={{
        fontSize: '18px', fontWeight: '700', color: '#1b3a2b',
        lineHeight: '1.5', marginBottom: '24px'
      }}>
        {poll.question}
      </p>

      {!voted ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {poll.options.map((opt, i) => (
              <button key={i} onClick={() => setSelected(i)} style={{
                padding: '14px 20px',
                textAlign: 'left',
                fontSize: '15px',
                fontWeight: selected === i ? '700' : '500',
                background: selected === i ? '#1b3a2b' : '#f7f3eb',
                color: selected === i ? '#fff' : '#333',
                border: `2px solid ${selected === i ? '#1b3a2b' : '#e5ddd0'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}>
                {opt.text || opt}
              </button>
            ))}
          </div>
          {error && <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
          <button onClick={submitVote} disabled={selected === null || loading} style={{
            padding: '14px 32px',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            background: selected !== null ? '#c9a84c' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: selected !== null ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s'
          }}>
            {loading ? 'Submitting...' : 'Submit Vote'}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: '14px', color: '#1b3a2b', fontWeight: '600', marginBottom: '20px' }}>
            ✓ Thank you for voting! Here are the current results:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {results && results.map((opt, i) => {
              const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>{opt.text}</span>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: colors[i] }}>{pct}% <span style={{ fontWeight: '400', color: '#888', fontSize: '13px' }}>({opt.votes} votes)</span></span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: '2px', height: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: colors[i],
                      transition: 'width 0.6s ease',
                      borderRadius: '2px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '16px' }}>
            {totalVotes.toLocaleString()} total votes
          </p>
        </>
      )}
    </div>
  );
}
