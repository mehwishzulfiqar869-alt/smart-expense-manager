import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const InventoryStock = () => {
  const [consumables, setConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [stockUpdate, setStockUpdate] = useState({ quantity_change: 0, notes: '' });
  const [thresholdUpdate, setThresholdUpdate] = useState({ threshold: 0 });

  const fetchConsumables = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/inventory/consumables', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsumables(response.data.consumables || []);
      setError('');
    } catch (err) {
      setError('Failed to load stock items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsumables();
  }, [fetchConsumables]);

  const updateStock = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/inventory/consumables/${itemId}/stock`, stockUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowStockModal(false);
      setSelectedItem(null);
      setStockUpdate({ quantity_change: 0, notes: '' });
      fetchConsumables();
    } catch (err) {
      setError('Failed to update stock');
      console.error(err);
    }
  };

  const updateThreshold = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/inventory/consumables/${itemId}/threshold`, thresholdUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowThresholdModal(false);
      setSelectedItem(null);
      setThresholdUpdate({ threshold: 0 });
      fetchConsumables();
    } catch (err) {
      setError('Failed to update threshold');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Stock Management</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading stock...</div>
      ) : consumables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No stock items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {consumables.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.sub_category_name}</p>
                </div>
                {item.is_low && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    Low Stock
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Quantity:</span>
                  <span className={`text-xl font-bold ${item.is_low ? 'text-red-600' : 'text-green-600'}`}>
                    {item.current_quantity} {item.unit || 'units'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Min Threshold:</span>
                  <span className="text-gray-800">{item.minimum_threshold} {item.unit || 'units'}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setStockUpdate({ quantity_change: 0, notes: '' });
                    setShowStockModal(true);
                  }}
                  className="flex-1 bg-cyan-600 text-white py-2 rounded-md hover:bg-cyan-700 text-sm"
                >
                  Update Stock
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setThresholdUpdate({ threshold: item.minimum_threshold });
                    setShowThresholdModal(true);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 text-sm"
                >
                  Set Threshold
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-cyan-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Update Stock</h3>
              <p className="text-cyan-100 text-sm">{selectedItem.name}</p>
              <p className="text-cyan-200 text-xs">Current: {selectedItem.current_quantity} units</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Change (+ for restock, - for usage)
                </label>
                <input
                  type="number"
                  value={stockUpdate.quantity_change}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, quantity_change: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 10 or -5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={stockUpdate.notes}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, notes: e.target.value })}
                  rows="3"
                  placeholder="Reason for stock change..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button
                onClick={() => updateStock(selectedItem.id)}
                className="flex-1 bg-cyan-600 text-white py-2 rounded-md hover:bg-cyan-700"
              >
                Update
              </button>
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Update Modal */}
      {showThresholdModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-cyan-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Set Minimum Threshold</h3>
              <p className="text-cyan-100 text-sm">{selectedItem.name}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Quantity Before Alert
              </label>
              <input
                type="number"
                min="0"
                value={thresholdUpdate.threshold}
                onChange={(e) => setThresholdUpdate({ threshold: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-400 mt-2">
                When stock drops below this number, an alert will appear on the dashboard.
              </p>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button
                onClick={() => updateThreshold(selectedItem.id)}
                className="flex-1 bg-cyan-600 text-white py-2 rounded-md hover:bg-cyan-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowThresholdModal(false)}
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

export default InventoryStock;