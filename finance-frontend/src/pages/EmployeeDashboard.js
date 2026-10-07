import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddExpenseForm from '../components/AddExpenseFormWithItems.jsx';
import ExpenseList from '../components/ExpenseList';
import ReceiptScanner from '../components/ReceiptScanner';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleExpenseAdded = () => {
    setShowAddForm(false);
    setScannedData(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleScannedData = (data) => {
  console.log('Scanned data received in dashboard:', data);
  
  // Check if we have multiple items from the receipt scanner
  if (data.items && data.items.length > 0) {
    // Pass the multiple items directly to the form
    setScannedData(data);
  } else if (data.amount) {
    // Single item receipt
    setScannedData(data);
  }
  
  setShowScanner(false);
  setShowAddForm(true);
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Gradient */}
      <header className="bg-gradient-to-r from-cyan-700 to-blue-800 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section - Clean Text */}
<div className="flex items-center gap-2">
  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
    <span className="text-white font-bold text-lg">X</span>
  </div>
  <div>
    <h1 className="text-2xl font-bold text-white tracking-tight">
      Xpenza
    </h1>
    <p className="text-cyan-200 text-xs -mt-1">Teacher Dashboard</p>
  </div>
</div>

            {/* User Section */}
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-white font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-cyan-100 text-sm">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-2 border border-white/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Welcome Banner with Stats */}
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user?.firstName}! 👋</h2>
              <p className="text-cyan-100 mt-1">Manage your expenses and track reimbursements easily</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold">$0</p>
              <p className="text-xs text-cyan-100">Pending Amount</p>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        {!showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scan Receipt Card */}
            <div
              onClick={() => setShowScanner(true)}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Scan Receipt</h3>
                    <p className="text-gray-500 text-sm">Upload receipt & auto-fill expense details</p>
                    <span className="text-purple-600 text-xs font-medium mt-1 inline-block">Instant extraction →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Manually Card */}
            <div
              onClick={() => setShowAddForm(true)}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className="flex items-center gap-5">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Add Manually</h3>
                    <p className="text-gray-500 text-sm">Enter expense details manually</p>
                    <span className="text-cyan-600 text-xs font-medium mt-1 inline-block">Quick entry →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Form */}
        {showAddForm && (
          <div className="animate-fadeIn">
            <AddExpenseForm
              onExpenseAdded={handleExpenseAdded}
              onCancel={() => {
                setShowAddForm(false);
                setScannedData(null);
              }}
              initialData={scannedData}
            />
          </div>
        )}

        {/* Expense List Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span>📋</span> My Expenses
                </h3>
                <p className="text-sm text-gray-500">Track and manage your expense history</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">✅ Approved</span>
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">⏳ Pending</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">❌ Rejected</span>
              </div>
            </div>
          </div>
          <ExpenseList refreshTrigger={refreshTrigger} />
        </div>
      </main>

      {/* Receipt Scanner Modal */}
      {showScanner && (
        <ReceiptScanner
          onDataExtracted={handleScannedData}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Add Animation Style */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;