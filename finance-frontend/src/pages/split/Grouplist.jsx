import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GroupDetail from './GroupDetail';

const GroupList = ({ isAdmin }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = 'http://localhost:5000/api/groups';

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(response.data.groups || []);
    } catch (err) {
      setError('Failed to load groups.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/groups',
        { name: newGroupName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewGroupName('');
      setShowCreateForm(false);
      fetchGroups();
    } catch (err) {
      setError('Failed to create group.');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups();
    } catch (err) {
      setError('Failed to delete group.');
    }
  };

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        isAdmin={isAdmin}
        onBack={() => {
          setSelectedGroup(null);
          fetchGroups();
        }}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          {isAdmin ? 'All Groups (Admin View)' : 'My Split Groups'}
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-cyan-600 text-white px-4 py-1.5 rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Group
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Create New Group</h3>
          <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-cyan-600 text-white px-4 py-1.5 rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm flex-1 sm:flex-none"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex-1 sm:flex-none"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups List - Responsive Grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500">No groups yet.</p>
          <p className="text-gray-400 text-sm">Create a group to start splitting expenses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group) => (
            <div key={group.id} className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 bg-cyan-600 rounded-md p-2">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{group.name}</h3>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                    title="Delete group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500">
                {group.member_count || 0} member{group.member_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Created {new Date(group.created_at).toLocaleDateString()}
              </p>

              {isAdmin && group.created_by_name && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  Created by: <span className="font-medium text-gray-600">{group.created_by_name}</span>
                </p>
              )}

              <button
                onClick={() => setSelectedGroup(group)}
                className="w-full mt-3 bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg hover:bg-cyan-100 transition-colors font-medium text-xs"
              >
                View Details →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupList;