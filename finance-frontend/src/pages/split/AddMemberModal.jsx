import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const AddMemberModal = ({ group, onMembersAdded, onClose }) => {
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
      
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const users = response.data.users.filter(u => u.id !== currentUserId);
      setAllTeachers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    }
  };

  const handleCheckbox = (teacherId) => {
    setSelectedTeachers(prev => {
      if (prev.includes(teacherId)) {
        return prev.filter(id => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedTeachers.length === 0) {
      setError('Please select at least one teacher');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      await axios.post(
        `http://localhost:5000/api/groups/${group.id}/members`,
        { member_ids: selectedTeachers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onMembersAdded();
    } catch (error) {
      console.error('Error adding members:', error);
      setError(error.response?.data?.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return allTeachers;
    const search = searchTerm.toLowerCase();
    return allTeachers.filter(teacher => {
      const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
      const email = teacher.email.toLowerCase();
      return fullName.includes(search) || email.includes(search);
    });
  }, [allTeachers, searchTerm]);

  const selectedCount = selectedTeachers.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header - Fixed at top */}
        <div className="bg-cyan-600 px-6 py-4 rounded-t-lg flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">
            Add Members to {group.name}
          </h3>
          {selectedCount > 0 && (
            <p className="text-cyan-100 text-sm mt-1">
              {selectedCount} member{selectedCount > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        
        {/* Search - Fixed */}
        <div className="p-4 flex-shrink-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {filteredTeachers.length} user{filteredTeachers.length > 1 ? 's' : ''} found
          </p>
        </div>
        
        {/* Members List - Scrollable */}
        <div className="px-4 overflow-y-auto flex-1" style={{ maxHeight: '300px' }}>
          {filteredTeachers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No users found</p>
          ) : (
            <div className="space-y-2 pb-2">
              {filteredTeachers.map((teacher) => (
                <label
                  key={teacher.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTeachers.includes(teacher.id)
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTeachers.includes(teacher.id)}
                    onChange={() => handleCheckbox(teacher.id)}
                    className="w-4 h-4 text-cyan-600 accent-cyan-600 flex-shrink-0"
                  />
                  <div className="flex-shrink-0 bg-cyan-600 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold">
                    {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-700 truncate">
                      {teacher.first_name} {teacher.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* Buttons - Fixed at bottom */}
        <div className="border-t p-4 flex-shrink-0 bg-white rounded-b-lg">
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || selectedCount === 0}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                selectedCount > 0 && !loading
                  ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Adding...' : `Add ${selectedCount} Member${selectedCount !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;