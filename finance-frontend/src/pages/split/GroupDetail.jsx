import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddExpense from './AddExpense';
import SettleUp from './settleup';
// eslint-disable-next-line
import AddMemberModal from './AddMemberModal';
 
const GroupDetail = ({ group, isAdmin, onBack }) => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  // eslint-disable-next-line
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
 
  useEffect(() => {
    fetchGroupData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);
 
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
 
      const [expRes, balRes, memRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/split-expenses/group/${group.id}`, { headers }),
        axios.get(`http://localhost:5000/api/balances/${group.id}`, { headers }),
        axios.get(`http://localhost:5000/api/groups/${group.id}/members`, { headers }),
      ]);
 
      setExpenses(expRes.data.expenses || []);
      setBalances(balRes.data || []);
      setMembers(memRes.data.members || []);
    } catch (err) {
      setError('Failed to load group data.');
    } finally {
      setLoading(false);
    }
  };
 
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroupData();
    } catch {
      setError('Failed to delete expense.');
    }
  };
 
  const handleSettleUp = (balance) => {
    setSettleTarget(balance);
    setShowSettleUp(true);
  };
 
  if (showAddExpense) {
    return (
      <AddExpense
        group={group}
        members={members}
        onExpenseAdded={() => {
          setShowAddExpense(false);
          fetchGroupData();
        }}
        onCancel={() => setShowAddExpense(false)}
      />
    );
  }
 
  if (showSettleUp) {
    return (
      <SettleUp
        group={group}
        balance={settleTarget}
        onSettled={() => {
          setShowSettleUp(false);
          setSettleTarget(null);
          fetchGroupData();
        }}
        onCancel={() => {
          setShowSettleUp(false);
          setSettleTarget(null);
        }}
      />
    );
  }
   if (showAddMemberModal) {
    return (
      <AddMemberModal
        group={group}
        onMembersAdded={() => {
          setShowAddMemberModal(false);
          fetchGroupData();
        }}
        onClose={() => setShowAddMemberModal(false)}
      />
    );
  }
 
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Groups
      </button>
 
      {/* Group Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{group.name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''} · Created {new Date(group.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setShowAddExpense(true)}
            className="bg-cyan-600 text-white px-5 py-2 rounded-lg hover:bg-cyan-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        </div>
      </div>
 
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
 
      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          {['expenses', 'balances', 'members'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-cyan-600 text-cyan-600 bg-cyan-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
 
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <div className="space-y-3">
                  {expenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No expenses yet. Add one to get started!</p>
                    </div>
                  ) : (
                    expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            Paid by <span className="font-medium text-cyan-600">{expense.paid_by_name}</span> · {new Date(expense.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-800">${parseFloat(expense.amount).toFixed(2)}</span>
                          {(isAdmin) && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
 
              {/* Balances Tab */}
              {activeTab === 'balances' && (
                <div className="space-y-3">
                  {balances.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">All settled up! No outstanding balances.</p>
                    </div>
                  ) : (
                    balances.map((bal, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">
                            <span className="text-red-500">{bal.owes_user_name}</span>
                            {' '}owes{' '}
                            <span className="text-green-600">{bal.to_user_name}</span>
                          </p>
                          <p className="text-sm text-gray-500">Unsettled balance</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-800">
                            ${parseFloat(bal.total_owed).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleSettleUp(bal)}
                            className="bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                          >
                            Settle Up
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
 
              
                    {/* Members Tab */}
              {activeTab === 'members' && (
                <div>
                  {/* Add Members Button - at the top of Members tab */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Group Members</h3>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Members
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {members.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No members found. Click "Add Members" to add teachers to this group.</p>
                      </div>
                    ) : (
                      members.map((member) => (
                        <div key={member.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 bg-cyan-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{member.first_name} {member.last_name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                          <span className="ml-auto text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full font-medium capitalize">
                            {member.role}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
 
export default GroupDetail;