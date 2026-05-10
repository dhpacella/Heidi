import React, { useState } from 'react';

function VoterFilter() {
  const [filters, setFilters] = useState({
    precinct: '',
    votedInYears: 3,
    ageRange: '',
    party: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    // TODO: Apply filters and fetch voters
    console.log('Applying filters:', filters);
  };

  return (
    <div className="voter-filter">
      <h1>Voter Filter</h1>
      <div className="filter-panel">
        <div className="filter-group">
          <label>Precinct:</label>
          <input 
            type="text" 
            name="precinct"
            value={filters.precinct}
            onChange={handleFilterChange}
            placeholder="Enter precinct"
          />
        </div>
        <div className="filter-group">
          <label>Voted in Last Years:</label>
          <input 
            type="number" 
            name="votedInYears"
            value={filters.votedInYears}
            onChange={handleFilterChange}
            min="1"
            max="10"
          />
        </div>
        <div className="filter-group">
          <label>Age Range:</label>
          <input 
            type="text" 
            name="ageRange"
            value={filters.ageRange}
            onChange={handleFilterChange}
            placeholder="e.g., 18-35"
          />
        </div>
        <div className="filter-group">
          <label>Party:</label>
          <select name="party" value={filters.party} onChange={handleFilterChange}>
            <option value="">All</option>
            <option value="democrat">Democrat</option>
            <option value="republican">Republican</option>
            <option value="independent">Independent</option>
          </select>
        </div>
        <button onClick={handleApplyFilters} className="btn-primary">Apply Filters</button>
      </div>
      <div className="voters-list">
        {/* TODO: Display filtered voters */}
      </div>
    </div>
  );
}

export default VoterFilter;
