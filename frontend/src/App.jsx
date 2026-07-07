import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import CashierPOS from './pages/CashierPOS';
import AdminDashboard from './pages/AdminDashboard';

// A simple default route handler that redirects users depending on their role
const HomeRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={user.role === 'owner' ? '/dashboard' : '/pos'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Secure Cashier POS billing screen (both cashiers and owner can access) */}
          <Route 
            path="/pos" 
            element={
              <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                <CashierPOS />
              </ProtectedRoute>
            } 
          />

          {/* Secure Owner Admin Dashboard screen (only owner can access) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Root fallback redirects */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
