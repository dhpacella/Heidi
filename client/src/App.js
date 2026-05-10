import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import Dashboard from './pages/Dashboard';
import VoterFilter from './pages/VoterFilter';
import PrecinctPrioritization from './pages/PrecinctPrioritization';
import SuperPicks from './pages/SuperPicks';
import VoterImport from './pages/VoterImport';
import Canvassing from './pages/Canvassing';
import DataExport from './pages/DataExport';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Navigation />
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/voters" element={<VoterFilter />} />
            <Route path="/precincts" element={<PrecinctPrioritization />} />
            <Route path="/super-picks" element={<SuperPicks />} />
            <Route path="/import" element={<VoterImport />} />
            <Route path="/canvassing" element={<Canvassing />} />
            <Route path="/export" element={<DataExport />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
