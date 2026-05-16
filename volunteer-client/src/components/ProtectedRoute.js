import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const user = useSelector(state => state.auth.user);

  if (!isAuthenticated || user?.role !== 'volunteer') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
