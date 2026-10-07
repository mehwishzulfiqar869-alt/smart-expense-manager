import React, { useState } from 'react';
import axios from 'axios';
 
const AddExpense = ({ group, members, onExpenseAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    split_with: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
 
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
 
  // Members excluding current user (they are the one paying)
  const otherMembers = members.filter((m) => m.id !== currentUserId);
 
  const handleCheckbox = (userId) => {
    setFormData((prev) => ({
      ...prev,
      split_with: prev.split_with.includes(userId)
        ? prev.split_with.filter((id) => id !== userId)
        : [...prev.split_with, userId],
    }));
  };
 
  const splitAmount =
    formData.amount && formData.split_with.length > 0
      ? (parseFloat(formData.amount) / (formData.split_with.length + 1)).toFixed(2)
      : null;
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) return setError('Please enter a description.');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return setError('Please enter a valid amount.');
    if (formData.split_with.length === 0) return setError('Please select at least one person to split with.');
 
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/split-expenses',
        {
          group_id: group.id,
          description: formData.description,
          amount: parseFloat(formData.amount),
          split_with: formData.split_with,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onExpenseAdded();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Group
      </button>
 
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Add Expense to <span className="text-cyan-600">{group.name}</span>
        </h2>
 
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
 
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Team lunch, Office supplies"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
 
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
 
          {/* Split With */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split With <span className="text-red-500">*</span>
            </label>
            {otherMembers.length === 0 ? (
              <p className="text-gray-500 text-sm">No other members in this group yet.</p>
            ) : (
              <div className="space-y-2">
                {otherMembers.map((member) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.split_with.includes(member.id)
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.split_with.includes(member.id)}
                      onChange={() => handleCheckbox(member.id)}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <div className="flex-shrink-0 bg-cyan-600 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold">
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <span className="font-medium text-gray-700">
                      {member.first_name} {member.last_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
 
          {/* Split Preview */}
          {splitAmount && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <p className="text-sm text-cyan-800 font-medium">
                💡 Split Preview: Each person pays{' '}
                <span className="font-bold text-cyan-700">${splitAmount}</span>
                {' '}({formData.split_with.length + 1} people total)
              </p>
            </div>
          )}
 
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
 
export default AddExpense;