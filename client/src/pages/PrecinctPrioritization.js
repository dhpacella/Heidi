import React from 'react';

function PrecinctPrioritization() {
  return (
    <div className="precinct-prioritization">
      <h1>Precinct Prioritization</h1>
      <div className="priority-factors">
        <h2>Priority Factors</h2>
        <ul>
          <li>Partisan Lean</li>
          <li>Registration Potential</li>
          <li>Turnout History</li>
          <li>Win Number</li>
          <li>Persuasion Opportunity</li>
        </ul>
      </div>
      <div className="precincts-table">
        {/* TODO: Display prioritized precincts table */}
      </div>
    </div>
  );
}

export default PrecinctPrioritization;
