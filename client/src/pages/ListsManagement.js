import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ListsManagement() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([
    { id: 1, name: '2024 General Election', subscriberCount: 45000, createdAt: '2025-01-15', status: 'active' },
    { id: 2, name: 'Newsletter Subscribers', subscriberCount: 12500, createdAt: '2024-12-01', status: 'active' },
    { id: 3, name: 'VIP Supporters', subscriberCount: 3200, createdAt: '2024-11-20', status: 'active' },
  ]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateList = () => {
    if (newListName.trim()) {
      const newList = {
        id: Math.max(...lists.map(l => l.id), 0) + 1,
        name: newListName,
        subscriberCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      setLists([newList, ...lists]);
      setNewListName('');
      setShowCreateForm(false);
    }
  };

  const handleDeleteList = (id) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      setLists(lists.filter(l => l.id !== id));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="lists-management-container">
      {/* Header */}
      <div className="lists-header">
        <div>
          <h1>Email Lists</h1>
          <p className="text-gray-600 dark:text-gray-400">{lists.length} total lists</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary-large"
        >
          + Create New List
        </button>
      </div>

      {/* Create List Form */}
      {showCreateForm && (
        <div className="create-list-form">
          <h3>Create New List</h3>
          <div className="form-group">
            <label>List Name</label>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., 2024 General Election"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
            />
          </div>
          <div className="form-actions">
            <button
              onClick={handleCreateList}
              className="btn-success"
            >
              Create List
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewListName('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="lists-search">
        <input
          type="text"
          placeholder="Search lists..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Lists Grid */}
      <div className="lists-grid">
        {filteredLists.length === 0 ? (
          <div className="empty-state">
            <p>No lists found</p>
          </div>
        ) : (
          filteredLists.map(list => (
            <div key={list.id} className="list-card">
              <div className="list-card-header">
                <h3>{list.name}</h3>
                <span className="status-badge">{list.status}</span>
              </div>
              <div className="list-card-body">
                <div className="stat">
                  <span className="stat-value">{list.subscriberCount.toLocaleString()}</span>
                  <span className="stat-label">Subscribers</span>
                </div>
                <p className="created-date">Created {formatDate(list.createdAt)}</p>
              </div>
              <div className="list-card-actions">
                <button
                  onClick={() => navigate(`/lists/${list.id}`)}
                  className="btn-view"
                >
                  Manage Subscribers
                </button>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  className="btn-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <div className="lists-stats">
        <div className="stat-box">
          <span className="stat-number">{lists.length}</span>
          <span className="stat-text">Total Lists</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{lists.reduce((sum, l) => sum + l.subscriberCount, 0).toLocaleString()}</span>
          <span className="stat-text">Total Subscribers</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{lists.filter(l => l.status === 'active').length}</span>
          <span className="stat-text">Active Lists</span>
        </div>
      </div>
    </div>
  );
}

export default ListsManagement;
