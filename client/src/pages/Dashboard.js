import React from 'react';

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Voter Tracking Dashboard</h1>
      <div className="dashboard-grid">
        <div className="card">
          <h2>Total Voters</h2>
          <p className="stat">0</p>
        </div>
        <div className="card">
          <h2>Voters (Last 3 Years)</h2>
          <p className="stat">0</p>
        </div>
        <div className="card">
          <h2>Precincts</h2>
          <p className="stat">0</p>
        </div>
        <div className="card">
          <h2>Canvassing Activities</h2>
          <p className="stat">0</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
