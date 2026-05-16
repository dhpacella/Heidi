import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ListDetails() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState({
    id: 1,
    name: '2024 General Election',
    subscriberCount: 45000,
    createdAt: '2025-01-15'
  });

  const [subscribers, setSubscribers] = useState([
    { id: 1, name: 'John Smith', email: 'john@example.com', status: 'active', lastActivity: '2 hours ago', joinedDate: '2024-12-01' },
    { id: 2, name: 'Jane Doe', email: 'jane@example.com', status: 'active', lastActivity: '1 day ago', joinedDate: '2024-11-15' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'unsubscribed', lastActivity: '5 days ago', joinedDate: '2024-10-20' },
    { id: 4, name: 'Alice Williams', email: 'alice@example.com', status: 'active', lastActivity: '10 mins ago', joinedDate: '2024-09-10' },
    { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', status: 'bounced', lastActivity: '20 days ago', joinedDate: '2024-08-05' },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubscriber, setNewSubscriber] = useState({ name: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'lastActivity', direction: 'desc' });

  const filteredSubscribers = subscribers.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedSubscribers = [...filteredSubscribers].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal == null || bVal == null) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleAddSubscriber = () => {
    if (newSubscriber.name.trim() && newSubscriber.email.trim()) {
      const subscriber = {
        id: Math.max(...subscribers.map(s => s.id), 0) + 1,
        name: newSubscriber.name,
        email: newSubscriber.email,
        status: 'active',
        lastActivity: 'just now',
        joinedDate: new Date().toISOString().split('T')[0]
      };
      setSubscribers([subscriber, ...subscribers]);
      setNewSubscriber({ name: '', email: '' });
      setShowAddForm(false);
    }
  };

  const handleDeleteSubscriber = (id) => {
    if (window.confirm('Delete this subscriber?')) {
      setSubscribers(subscribers.filter(s => s.id !== id));
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#27ae60';
      case 'unsubscribed':
        return '#e74c3c';
      case 'bounced':
        return '#34495e';
      default:
        return '#95a5a6';
    }
  };

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const unsubscribedCount = subscribers.filter(s => s.status === 'unsubscribed').length;
  const bouncedCount = subscribers.filter(s => s.status === 'bounced').length;

  return (
    <div className="list-details-container">
      {/* Header */}
      <div className="list-details-header">
        <button onClick={() => navigate('/lists')} className="back-button">
          ← Back to Lists
        </button>
        <div>
          <h1>{list.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">{subscribers.length} subscribers</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="list-actions">
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          + Add Subscriber
        </button>
        <button className="btn-secondary">📥 Import CSV</button>
        <button className="btn-secondary">📤 Export List</button>
        <button className="btn-secondary">🔧 Segments</button>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search subscribers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Add Subscriber Form */}
      {showAddForm && (
        <div className="add-subscriber-form">
          <h3>Add Subscriber</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newSubscriber.name}
                onChange={(e) => setNewSubscriber({ ...newSubscriber, name: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={newSubscriber.email}
                onChange={(e) => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="form-actions">
            <button onClick={handleAddSubscriber} className="btn-success">
              Add Subscriber
            </button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="status-summary">
        <div className="status-item">
          <span className="status-label">All</span>
          <span className="status-count">{subscribers.length}</span>
        </div>
        <div className="status-item active">
          <span className="status-label">Active</span>
          <span className="status-count">{activeCount}</span>
        </div>
        <div className="status-item unsubscribed">
          <span className="status-label">Unsubscribed</span>
          <span className="status-count">{unsubscribedCount}</span>
        </div>
        <div className="status-item bounced">
          <span className="status-label">Bounced</span>
          <span className="status-count">{bouncedCount}</span>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="subscribers-table-container">
        <table className="subscribers-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('email')} className="sortable">
                Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('lastActivity')} className="sortable">
                Last Activity {sortConfig.key === 'lastActivity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubscribers.map(subscriber => (
              <tr key={subscriber.id}>
                <td className="subscriber-name">{subscriber.name}</td>
                <td className="subscriber-email">{subscriber.email}</td>
                <td className="subscriber-activity">{subscriber.lastActivity}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(subscriber.status) }}
                  >
                    {subscriber.status}
                  </span>
                </td>
                <td className="action-buttons">
                  <button
                    onClick={() => handleDeleteSubscriber(subscriber.id)}
                    className="btn-delete-small"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ListDetails;
