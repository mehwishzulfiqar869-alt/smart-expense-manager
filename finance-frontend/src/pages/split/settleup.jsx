import React, { useState } from 'react';
import axios from 'axios';

const SettleUp = ({ group, balance, onSettled, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState(
    balance ? parseFloat(balance.total_owed).toFixed(2) : ''
  );

  const handleSettle = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      // Get current user ID
      const userData = JSON.parse(localStorage.getItem('user'));
      const currentUserId = userData.id;
      
      console.log('Current user:', currentUserId);
      console.log('Balance:', balance);
      
      // Determine who is paying whom
      // The person who owes (owes_user) pays the person who is owed (to_user)
      const paid_by = balance.owes_user;
      const paid_to = balance.to_user;
      
      console.log('Paid by (owes):', paid_by);
      console.log('Paid to (owed):', paid_to);
      
      // Check if trying to settle with yourself
      if (paid_by === paid_to) {
        setError('Cannot settle with yourself. Please check the debt details.');
        return;
      }
      
      const requestData = {
        group_id: group.id,
        paid_by: paid_by,
        paid_to: paid_to,
        amount: parseFloat(amount)
      };
      
      console.log('Sending request:', requestData);

      const response = await axios.post(
        'http://localhost:5000/api/settlements',
        requestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Settlement response:', response.data);
      
      alert('✅ Settlement recorded successfully!');
      
      if (onSettled) {
        onSettled();
      }
    } catch (err) {
      console.error('Settlement error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Group
      </button>

      <div className="bg-white shadow rounded-lg p-6 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="flex-shrink-0 bg-green-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Settle Up</h2>
          <p className="text-gray-500 text-sm mt-1">Record a payment in <span className="font-medium text-cyan-600">{group.name}</span></p>
        </div>

        {balance && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">From</p>
                <p className="font-semibold text-red-500">{balance.owes_user_name}</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="text-right">
                <p className="text-sm text-gray-500">To</p>
                <p className="font-semibold text-green-600">{balance.to_user_name}</p>
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-500">Outstanding balance</p>
              <p className="text-2xl font-bold text-gray-800">{parseFloat(balance.total_owed).toFixed(2)}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSettle} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount to Settle ($)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center text-xl font-bold"
            />
            <p className="text-xs text-gray-400 mt-1 text-center">
              You can settle partially or in full
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Recording...' : '✓ Mark as Settled'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettleUp;