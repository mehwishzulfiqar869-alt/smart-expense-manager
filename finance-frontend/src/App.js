import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import ReceiptScanner from './components/ReceiptScanner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppContent() {
  return (
    <Routes>
      {/* Public route - Login */}
      <Route path="/" element={<Login />} />
      
      {/* Employee route */}
      <Route 
        path="/employee" 
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Member route - Split Management only */}
      <Route 
        path="/member" 
        element={
          <ProtectedRoute allowedRoles={['member']}>
            <MemberDashboard />
          </ProtectedRoute>
        } 
      />

      <Route path="/receipt-scanner" element={<ReceiptScanner />} />
      
      {/* Admin route */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;