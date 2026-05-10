import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import apiClient from '../services/apiClient';

function SuperPicks() {
  const [superPicks, setSuperPicks] = useState([]);
  const [categories, setCategories] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('allSuperPicks');
  const [minScore, setMinScore] = useState(70);
  const [precinct, setPrecinct] = useState('');

  useEffect(() => {
    fetchSuperPicks();
    fetchCategories();
    fetchStats();
  }, []);

  const fetchSuperPicks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/super-picks', {
        params: { minScore, precinct }
      });
      setSuperPicks(response.data.superPicks);
    } catch (error) {
      console.error('Error fetching super picks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/super-picks/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/super-picks/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const exportForCanvassing = async () => {
    try {
      const response = await apiClient.post('/super-picks/export-for-canvassing', {
        minScore,
        format: 'csv',
        precinct
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'super-picks.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleApplyFilters = () => {
    fetchSuperPicks();
  };

  return (
    <div className="super-picks">
      <h1>Super Picks - High Priority Voters</h1>

      {/* Statistics */}
      {stats && (
        <div className="super-picks-stats">
          <div className="stat-card">
            <h3>Total Super Picks</h3>
            <p className="stat-value">{stats.superPickCount}</p>
            <p className="stat-subtitle">{stats.superPickPercentage}% of all voters</p>
          </div>
          <div className="stat-card">
            <h3>Average Score</h3>
            <p className="stat-value">{stats.averageScore}</p>
            <p className="stat-subtitle">out of 100</p>
          </div>
          <div className="stat-card">
            <h3>Score Range</h3>
            <p className="stat-value">{stats.topScore} - {stats.bottomScore}</p>
            <p className="stat-subtitle">Top to Bottom</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="super-picks-filters">
        <div className="filter-group">
          <label>Minimum Score:</label>
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min="0"
            max="100"
            step="5"
          />
        </div>
        <div className="filter-group">
          <label>Precinct:</label>
          <input
            type="text"
            value={precinct}
            onChange={(e) => setPrecinct(e.target.value)}
            placeholder="Enter precinct name"
          />
        </div>
        <button onClick={handleApplyFilters} className="btn-primary">Apply Filters</button>
        <button onClick={exportForCanvassing} className="btn-secondary">Export for Door-Knocking</button>
      </div>

      {/* Categories */}
      {categories && (
        <div className="categories-section">
          <h2>Super Pick Categories</h2>
          <div className="category-buttons">
            <button 
              className={selectedCategory === 'consistentVoters' ? 'active' : ''}
              onClick={() => setSelectedCategory('consistentVoters')}
            >
              Consistent Voters ({categories.consistentVoters?.length || 0})
            </button>
            <button 
              className={selectedCategory === 'swingVoters' ? 'active' : ''}
              onClick={() => setSelectedCategory('swingVoters')}
            >
              Swing Voters ({categories.swingVoters?.length || 0})
            </button>
            <button 
              className={selectedCategory === 'persuadableVoters' ? 'active' : ''}
              onClick={() => setSelectedCategory('persuadableVoters')}
            >
              Persuadable ({categories.persuadableVoters?.length || 0})
            </button>
            <button 
              className={selectedCategory === 'recentVoters' ? 'active' : ''}
              onClick={() => setSelectedCategory('recentVoters')}
            >
              Recent Voters ({categories.recentVoters?.length || 0})
            </button>
            <button 
              className={selectedCategory === 'allSuperPicks' ? 'active' : ''}
              onClick={() => setSelectedCategory('allSuperPicks')}
            >
              All Super Picks ({categories.allSuperPicks?.length || 0})
            </button>
          </div>
        </div>
      )}

      {/* Super Picks Table */}
      <div className="super-picks-table">
        <h2>
          {selectedCategory === 'consistentVoters' && 'Consistent Voters'}
          {selectedCategory === 'swingVoters' && 'Swing Voters'}
          {selectedCategory === 'persuadableVoters' && 'Persuadable Voters'}
          {selectedCategory === 'recentVoters' && 'Recent Voters'}
          {selectedCategory === 'allSuperPicks' && 'All Super Picks'}
        </h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Precinct</th>
                <th>Score</th>
                <th>Consistency</th>
                <th>Swing Potential</th>
                <th>Persuadability</th>
                <th>Recency</th>
              </tr>
            </thead>
            <tbody>
              {superPicks.map((voter) => (
                <tr key={voter.id}>
                  <td>{voter.firstName} {voter.lastName}</td>
                  <td>{voter.phone}</td>
                  <td>{voter.precinct}</td>
                  <td><strong>{voter.superPickScore}</strong></td>
                  <td>{voter.consistencyScore.toFixed(0)}</td>
                  <td>{voter.swingScore.toFixed(0)}</td>
                  <td>{voter.persuasionScore.toFixed(0)}</td>
                  <td>{voter.recencyScore.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SuperPicks;
