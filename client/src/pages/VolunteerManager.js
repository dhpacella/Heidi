import React, { useEffect, useState } from 'react';
import { volunteerService } from '../services/api';

function VolunteerManager() {
  const [volunteers, setVolunteers] = useState([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState(null);

  const [filters, setFilters] = useState({
    precinct: '',
    party: '',
    votedInYears: 3
  });

  useEffect(() => {
    loadVolunteers();
  }, []);

  const loadVolunteers = async () => {
    try {
      const data = await volunteerService.getAll();
      setVolunteers(data.volunteers || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load volunteers' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVolunteer = async (volunteer) => {
    setSelectedVolunteer(volunteer);
    setMessage(null);
  };

  const handleAssignVoters = async (replaceExisting = false) => {
    if (!selectedVolunteer) return;
    setAssigning(true);
    setMessage(null);

    try {
      const result = await volunteerService.assign(
        selectedVolunteer.id,
        filters,
        replaceExisting
      );
      setMessage({
        type: 'success',
        text: `Assigned ${result.assignedCount || 0} voters to ${selectedVolunteer.name}`
      });
      loadVolunteers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to assign voters' });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#EEF2F7' }}>Loading...</div>;
  }

  const pendingCount = selectedVolunteer?.assignments?.filter(a => a.status === 'pending').length || 0;
  const visitedCount = selectedVolunteer?.assignments?.filter(a => a.status === 'visited').length || 0;
  const totalCount = selectedVolunteer?.assignments?.length || 0;

  return (
    <div style={{
      fontFamily: "'Barlow', sans-serif",
      background: '#0B1929',
      minHeight: '100vh',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#EEF2F7',
          marginBottom: '1.5rem'
        }}>
          Volunteer Manager
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
          {/* Left Panel - Volunteer List */}
          <div style={{
            background: '#122338',
            border: '1px solid #243D56',
            borderRadius: 8,
            padding: '1.5rem',
            maxHeight: 'calc(100vh - 150px)',
            overflowY: 'auto'
          }}>
            <h2 style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#F5A623',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              marginBottom: '1rem',
              margin: '0 0 1rem 0'
            }}>
              Volunteers
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {volunteers.length === 0 ? (
                <p style={{ color: '#8BA3BE', fontSize: 12 }}>No volunteers yet</p>
              ) : (
                volunteers.map((vol) => {
                  const pending = vol.assignments?.filter(a => a.status === 'pending').length || 0;
                  const visited = vol.assignments?.filter(a => a.status === 'visited').length || 0;
                  const total = vol.assignments?.length || 0;
                  const pct = total > 0 ? Math.round((visited / total) * 100) : 0;

                  return (
                    <div
                      key={vol.id}
                      onClick={() => handleSelectVolunteer(vol)}
                      style={{
                        padding: '12px',
                        background: selectedVolunteer?.id === vol.id ? '#1A3550' : '#0B1929',
                        border: `1px solid ${selectedVolunteer?.id === vol.id ? '#F5A623' : '#243D56'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all .15s'
                      }}
                      onMouseEnter={e => {
                        if (selectedVolunteer?.id !== vol.id) {
                          e.currentTarget.style.borderColor = '#8BA3BE';
                        }
                      }}
                      onMouseLeave={e => {
                        if (selectedVolunteer?.id !== vol.id) {
                          e.currentTarget.style.borderColor = '#243D56';
                        }
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#EEF2F7', margin: '0 0 4px 0' }}>
                        {vol.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#8BA3BE', margin: '0 0 6px 0' }}>
                        📱 {vol.phone}
                      </p>
                      <div style={{
                        height: 4,
                        background: '#0B1929',
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 6
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: '#F5A623',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <p style={{ fontSize: 11, color: '#8BA3BE', margin: 0 }}>
                        {visited}/{total} visited ({pct}%)
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Detail & Assign */}
          <div>
            {selectedVolunteer ? (
              <div style={{
                background: '#122338',
                border: '1px solid #243D56',
                borderRadius: 8,
                padding: '1.5rem'
              }}>
                <h2 style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#EEF2F7',
                  marginBottom: '0.5rem'
                }}>
                  {selectedVolunteer.name}
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {[
                    { label: 'Total Assigned', value: totalCount },
                    { label: 'Visited', value: visitedCount },
                    { label: 'Pending', value: pendingCount }
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: '#0B1929',
                        border: '1px solid #243D56',
                        borderRadius: 6,
                        padding: '1rem',
                        textAlign: 'center'
                      }}
                    >
                      <p style={{ fontSize: 11, color: '#8BA3BE', textTransform: 'uppercase', margin: 0, letterSpacing: '.03em' }}>
                        {label}
                      </p>
                      <p style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: '#F5A623',
                        margin: '8px 0 0 0'
                      }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#0B1929',
                  border: '1px solid #243D56',
                  borderRadius: 8,
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#F5A623',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                    marginBottom: '1rem',
                    margin: '0 0 1rem 0'
                  }}>
                    Filter &amp; Assign Voters
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#8BA3BE',
                        textTransform: 'uppercase',
                        letterSpacing: '.03em',
                        marginBottom: 6
                      }}>
                        Precinct
                      </label>
                      <input
                        type="text"
                        value={filters.precinct}
                        onChange={(e) => setFilters({ ...filters, precinct: e.target.value })}
                        placeholder="e.g. Precinct 1"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: '#122338',
                          color: '#EEF2F7',
                          border: '1px solid #243D56',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#8BA3BE',
                        textTransform: 'uppercase',
                        letterSpacing: '.03em',
                        marginBottom: 6
                      }}>
                        Party
                      </label>
                      <select
                        value={filters.party}
                        onChange={(e) => setFilters({ ...filters, party: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: '#122338',
                          color: '#EEF2F7',
                          border: '1px solid #243D56',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      >
                        <option value="">All Parties</option>
                        <option value="democrat">Democrat</option>
                        <option value="republican">Republican</option>
                        <option value="independent">Independent</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#8BA3BE',
                        textTransform: 'uppercase',
                        letterSpacing: '.03em',
                        marginBottom: 6
                      }}>
                        Voted In Last N Years
                      </label>
                      <input
                        type="number"
                        value={filters.votedInYears}
                        onChange={(e) => setFilters({ ...filters, votedInYears: parseInt(e.target.value) })}
                        min="1"
                        max="10"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: '#122338',
                          color: '#EEF2F7',
                          border: '1px solid #243D56',
                          borderRadius: 6,
                          fontSize: 13
                        }}
                      />
                    </div>
                  </div>

                  {message && (
                    <div style={{
                      padding: 12,
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => handleAssignVoters(false)}
                      disabled={assigning}
                      style={{
                        padding: 12,
                        background: '#243D56',
                        color: '#8BA3BE',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        transition: 'all .15s'
                      }}
                    >
                      Add to Existing
                    </button>
                    <button
                      onClick={() => handleAssignVoters(true)}
                      disabled={assigning}
                      style={{
                        padding: 12,
                        background: '#F5A623',
                        color: '#0B1929',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        transition: 'all .15s'
                      }}
                    >
                      Replace &amp; Assign
                    </button>
                  </div>
                </div>

                {/* Assignments List */}
                <div>
                  <h3 style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#F5A623',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                    marginBottom: '1rem'
                  }}>
                    Assigned Voters
                  </h3>

                  <div style={{
                    maxHeight: 300,
                    overflowY: 'auto',
                    display: 'grid',
                    gap: '8px'
                  }}>
                    {selectedVolunteer.assignments && selectedVolunteer.assignments.length > 0 ? (
                      selectedVolunteer.assignments
                        .sort((a, b) => {
                          if (a.status === 'pending' && b.status !== 'pending') return -1;
                          if (a.status !== 'pending' && b.status === 'pending') return 1;
                          return 0;
                        })
                        .map((assignment) => (
                          <div
                            key={assignment.id}
                            style={{
                              padding: '10px 12px',
                              background: '#0B1929',
                              border: '1px solid #243D56',
                              borderRadius: 6,
                              fontSize: 12
                            }}
                          >
                            <div style={{ color: '#EEF2F7', fontWeight: 600, marginBottom: 4 }}>
                              {assignment.voter?.first_name} {assignment.voter?.last_name}
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ color: '#8BA3BE' }}>
                                {assignment.voter?.address}
                              </span>
                              <span style={{
                                fontSize: 10,
                                padding: '4px 8px',
                                background: assignment.status === 'visited' ? '#22C55E' : '#F59E0B',
                                color: '#fff',
                                borderRadius: 3,
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}>
                                {assignment.status === 'visited' ? '✅ Visited' : '⏳ Pending'}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p style={{ color: '#8BA3BE', fontSize: 12 }}>No assignments yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#122338',
                border: '1px solid #243D56',
                borderRadius: 8,
                padding: '2rem',
                textAlign: 'center',
                color: '#8BA3BE'
              }}>
                Select a volunteer to view details and assign voters
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VolunteerManager;
