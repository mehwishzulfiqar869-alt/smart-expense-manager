import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const InventoryAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', location: '', notes: '' });

  // Wrap fetchAssets in useCallback to use it in useEffect
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`http://localhost:5000/api/inventory/assets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(response.data.assets || []);
      setError('');
    } catch (err) {
      setError('Failed to load assets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const updateStatus = async (assetId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/inventory/assets/${assetId}/status`, statusUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowStatusModal(false);
      setSelectedAsset(null);
      setStatusUpdate({ status: '', location: '', notes: '' });
      fetchAssets();
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      procured: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800',
      disposed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Assets Management</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="procured">Procured</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, asset tag, or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Assets Table */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No assets found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono">{asset.asset_tag}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{asset.category_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{asset.location || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setStatusUpdate({ status: asset.status, location: asset.location || '', notes: '' });
                          setShowStatusModal(true);
                        }}
                        className="text-cyan-600 hover:text-cyan-800"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-cyan-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Update Asset Status</h3>
              <p className="text-cyan-100 text-sm">{selectedAsset.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="procured">Procured</option>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={statusUpdate.location}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, location: e.target.value })}
                  placeholder="e.g., CS Lab 101, Faculty Office"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  rows="3"
                  placeholder="Reason for status change..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button
                onClick={() => updateStatus(selectedAsset.id)}
                className="flex-1 bg-cyan-600 text-white py-2 rounded-md hover:bg-cyan-700"
              >
                Update
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAssets;