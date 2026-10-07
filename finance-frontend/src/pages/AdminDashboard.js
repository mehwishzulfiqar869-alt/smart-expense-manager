import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminExpenseReview from '../components/AdminExpenseReview';
import UserManagement from '../components/UserManagement';
import ReportsPage from '../pages/ReportsPage';
import GroupList from './split/Grouplist';
import InventoryAssets from '../components/InventoryAssets';
import InventoryStock from '../components/InventoryStock';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExpenses: 0,
    totalAmount: 0,
    totalCategories: 0,
    pendingExpenses: 0,
    lowStockCount: 0,
    totalAssets: 0
  });

  useEffect(() => {
    fetchStats();
    fetchInventoryStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const expensesResponse = await axios.get('http://localhost:5000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const expenses = expensesResponse.data.expenses || [];
      const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const pendingCount = expenses.filter(exp => exp.status === 'pending').length;

      const categoriesResponse = await axios.get('http://localhost:5000/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(prev => ({
        ...prev,
        totalUsers: 3,
        totalExpenses: expenses.length,
        totalAmount: totalAmount,
        totalCategories: categoriesResponse.data.categories?.length || 0,
        pendingExpenses: pendingCount
      }));
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/inventory/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats(prev => ({
        ...prev,
        lowStockCount: response.data.stats?.low_stock_count || 0,
        totalAssets: response.data.stats?.total_assets || 0
      }));
    } catch (err) {
      console.error('Error fetching inventory stats:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
    <p className="text-cyan-200 text-xs -mt-1">Admin Dashboard</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && (
          <>
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl shadow-xl p-6 text-white mb-8">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Welcome back, Admin {user?.firstName}! 👋</h2>
                  <p className="text-cyan-100 mt-1">Manage expenses, inventory, and system settings</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
                  <p className="text-2xl font-bold">{stats.pendingExpenses}</p>
                  <p className="text-xs text-cyan-100">Pending Approvals</p>
                </div>
              </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* Stats Card 1 - Users */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card 2 - Expenses */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalExpenses}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card 3 - Amount */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-800">${stats.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card 4 - Assets */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total Assets</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalAssets}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card 5 - Low Stock Alerts */}
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Low Stock Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{stats.lowStockCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - All Buttons Same Color */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span>⚡</span> Admin Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => setActiveView('expenses')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Review Expenses
                  {stats.pendingExpenses > 0 && (
                    <span className="ml-1 bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full text-xs font-bold">
                      {stats.pendingExpenses}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveView('users')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Manage Users
                </button>

                <button
                  onClick={() => setActiveView('assets')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Assets
                </button>

                <button
                  onClick={() => setActiveView('stock')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Stock Management
                </button>

                <button
                  onClick={() => setActiveView('reports')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  System Reports
                </button>

                <button
                  onClick={() => setActiveView('splits')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Split Management
                </button>
              </div>
            </div>
          </>
        )}

        {/* Expense Review View */}
        {activeView === 'expenses' && (
          <div className="space-y-4">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); fetchInventoryStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <AdminExpenseReview />
          </div>
        )}

        {/* User Management View */}
        {activeView === 'users' && (
          <div className="space-y-4">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); fetchInventoryStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <UserManagement />
          </div>
        )}

        {/* Assets View */}
        {activeView === 'assets' && (
          <div className="space-y-4">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); fetchInventoryStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <InventoryAssets />
          </div>
        )}

        {/* Stock Management View */}
        {activeView === 'stock' && (
          <div className="space-y-4">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); fetchInventoryStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <InventoryStock />
          </div>
        )}

        {/* Reports Page View */}
        {activeView === 'reports' && (
          <div className="space-y-4">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); fetchInventoryStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <ReportsPage />
          </div>
        )}

        {/* Split Management View */}
        {activeView === 'splits' && (
          <div className="space-y-4">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); fetchInventoryStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <GroupList isAdmin={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;