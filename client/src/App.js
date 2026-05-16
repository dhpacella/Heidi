import React, { lazy, Suspense } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import store from './redux/store';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const VoterFilter = lazy(() => import('./pages/VoterFilter'));
const PrecinctPrioritization = lazy(() => import('./pages/PrecinctPrioritization'));
const SuperPicks = lazy(() => import('./pages/SuperPicks'));
const VoterImport = lazy(() => import('./pages/VoterImport'));
const EmailCampaigns = lazy(() => import('./pages/EmailCampaigns'));
const SMSCompose = lazy(() => import('./pages/SMSCompose'));
const CampaignAnalytics = lazy(() => import('./pages/CampaignAnalytics'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ListsManagement = lazy(() => import('./pages/ListsManagement'));
const ListDetails = lazy(() => import('./pages/ListDetails'));
const EmailDomainConfig = lazy(() => import('./pages/EmailDomainConfig'));
const Canvassing = lazy(() => import('./pages/Canvassing'));
const DataExport = lazy(() => import('./pages/DataExport'));
const VolunteerManager = lazy(() => import('./pages/VolunteerManager'));
const Login = lazy(() => import('./pages/Login'));

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Navigation />
        <div className="app-container">
          <ErrorBoundary>
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/voters" element={<ProtectedRoute><VoterFilter /></ProtectedRoute>} />
                <Route path="/precincts" element={<ProtectedRoute><PrecinctPrioritization /></ProtectedRoute>} />
                <Route path="/super-picks" element={<ProtectedRoute><SuperPicks /></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><VoterImport /></ProtectedRoute>} />
                <Route path="/email" element={<ProtectedRoute><EmailCampaigns /></ProtectedRoute>} />
                <Route path="/email-compose" element={<ProtectedRoute><EmailCampaigns /></ProtectedRoute>} />
                <Route path="/email-outreach" element={<ProtectedRoute><EmailCampaigns /></ProtectedRoute>} />
                <Route path="/sms-compose" element={<ProtectedRoute><SMSCompose /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><CampaignAnalytics /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                <Route path="/lists" element={<ProtectedRoute><ListsManagement /></ProtectedRoute>} />
                <Route path="/lists/:listId" element={<ProtectedRoute><ListDetails /></ProtectedRoute>} />
                <Route path="/email-domain" element={<ProtectedRoute><EmailDomainConfig /></ProtectedRoute>} />
                <Route path="/canvassing" element={<ProtectedRoute><Canvassing /></ProtectedRoute>} />
                <Route path="/export" element={<ProtectedRoute><DataExport /></ProtectedRoute>} />
                <Route path="/volunteers" element={<ProtectedRoute><VolunteerManager /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
