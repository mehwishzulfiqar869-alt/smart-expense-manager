import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GroupList from './split/Grouplist';

const MemberDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalOwe: 0,
    totalOwed: 0
  });

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = user?.id || JSON.parse(localStorage.getItem('user'))?.id;
      
      const groupsResponse = await axios.get('http://localhost:5000/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const groups = groupsResponse.data.groups || [];
      
      let totalOwe = 0;
      let totalOwed = 0;
      
      for (const group of groups) {
        try {
          const balanceResponse = await axios.get(`http://localhost:5000/api/balances/${group.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const balances = balanceResponse.data || [];
          for (const balance of balances) {
            if (balance.owes_user === userId) {
              totalOwe += parseFloat(balance.total_owed) || 0;
            }
            if (balance.to_user === userId) {
              totalOwed += parseFloat(balance.total_owed) || 0;
            }
          }
        } catch (balanceErr) {
          console.error(`Error fetching balance for group ${group.id}:`, balanceErr);
        }
      }
      
      setStats({
        totalGroups: groups.length,
        totalOwe: totalOwe,
        totalOwed: totalOwed
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-700 to-blue-800 shadow-md">
        <div className="w-full px-4 py-2">
          <div className="flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">X</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Xpenza</h1>
                <p className="text-cyan-200 text-[10px] -mt-0.5">Split Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white text-xs font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-cyan-100 text-[10px]">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <div className="w-full px-4 py-4">
        {activeView === 'dashboard' && (
          <>
            {/* Welcome Banner - Full Width */}
            <div className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl shadow-md p-4 text-white mb-4">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Welcome back, {user?.firstName}! 🎉</h2>
                  <p className="text-cyan-100 text-xs sm:text-sm">Track your shared expenses</p>
                </div>
                <div className="bg-white/20 rounded-lg px-4 py-1.5 text-center mt-2 sm:mt-0">
                  <p className="text-xl font-bold">{stats.totalGroups}</p>
                  <p className="text-[10px] text-cyan-100">Groups</p>
                </div>
              </div>
            </div>

            {/* Stats Cards - Vertical Layout */}
            <div className="w-full space-y-3 mb-4">
              {/* I Owe Card */}
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 rounded-full p-2">
                      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">I Owe</p>
                      <p className="text-lg font-bold text-gray-800">${stats.totalOwe.toFixed(2)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${stats.totalOwe > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {stats.totalOwe > 0 ? 'Need to Pay' : 'All Settled ✅'}
                  </span>
                </div>
              </div>

              {/* Owed to Me Card */}
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 rounded-full p-2">
                      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Owed to Me</p>
                      <p className="text-lg font-bold text-gray-800">${stats.totalOwed.toFixed(2)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${stats.totalOwed > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {stats.totalOwed > 0 ? 'To Receive' : 'No pending'}
                  </span>
                </div>
              </div>

              {/* Groups Card */}
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-cyan-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-cyan-100 rounded-full p-2">
                      <svg className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">My Groups</p>
                      <p className="text-lg font-bold text-gray-800">{stats.totalGroups}</p>
                    </div>
                  </div>
                  <span className="bg-cyan-100 text-cyan-700 text-[10px] px-2.5 py-1 rounded-full font-medium">Active</span>
                </div>
              </div>
            </div>

            {/* Net Balance Summary - Full Width */}
            <div className="w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-sm p-3 mb-4 border border-gray-200">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Net Balance</p>
                  <p className={`text-lg font-bold ${stats.totalOwe > stats.totalOwed ? 'text-red-600' : stats.totalOwed > stats.totalOwe ? 'text-green-600' : 'text-gray-600'}`}>
                    ${(stats.totalOwed - stats.totalOwe).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">
                    {stats.totalOwe > stats.totalOwed ? 'You owe more' : 
                     stats.totalOwed > stats.totalOwe ? 'You are owed more' : 
                     'All settled!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button - Full Width */}
            <div className="w-full">
              <button
                onClick={() => setActiveView('splits')}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-xl hover:shadow-md transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Split Management
              </button>
            </div>
          </>
        )}

        {/* Split Management View */}
        {activeView === 'splits' && (
          <div className="w-full">
            <button
              onClick={() => { setActiveView('dashboard'); fetchStats(); }}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium text-sm mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <GroupList isAdmin={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDashboard;