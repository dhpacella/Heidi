import React from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/">Voter Tracking System</Link>
      </div>
      <ul className="nav-links">
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/import">Import Data</Link></li>
        <li><Link to="/super-picks">Super Picks</Link></li>
        <li><Link to="/voters">Voter Filter</Link></li>
        <li><Link to="/precincts">Precinct Prioritization</Link></li>
        <li><Link to="/canvassing">Canvassing</Link></li>
        <li><Link to="/export">Data Export</Link></li>
      </ul>
    </nav>
  );
}

export default Navigation;
