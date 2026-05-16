import React, { lazy, Suspense, useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import store from './redux/store';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import { setCredentials } from './redux/slices/authSlice';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AssignedVoters = lazy(() => import('./pages/AssignedVoters'));
const VoterDetail = lazy(() => import('./pages/VoterDetail'));

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch(setCredentials({ user, token }));
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    }
  }, [dispatch]);

  return (
    <Router>
      <Navigation />
      <Suspense fallback={<div style={{ padding: '2rem', color: '#EEF2F7' }}>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/voters" element={<ProtectedRoute><AssignedVoters /></ProtectedRoute>} />
          <Route path="/voters/:assignmentId" element={<ProtectedRoute><VoterDetail /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return <AppContent />;
}

export default App;
