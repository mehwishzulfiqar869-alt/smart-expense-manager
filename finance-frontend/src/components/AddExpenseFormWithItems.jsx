import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AddExpenseFormWithItems = ({ onExpenseAdded, onCancel, initialData }) => {
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Line items state
  const [lineItems, setLineItems] = useState([
    {
      id: Date.now(),
      categoryId: '',
      amount: '',
      description: '',
      inventoryDetails: {
        item_name: '',
        quantity: 1,
        location: 'Store',
        asset_prefix: '',
        is_consumable: false,
        category_id: '',
        sub_category_id: ''
      }
    }
  ]);

  useEffect(() => {
    fetchInventoryCategories();
  }, []);

  // Populate from receipt scan if available - FIXED to handle multiple items
  useEffect(() => {
    if (initialData) {
      console.log('Initial data received:', initialData);
      
      // Check if this is a multi-item receipt (has items array)
      if (initialData.items && initialData.items.length > 0) {
        // Create multiple line items from the receipt
        const newLineItems = initialData.items.map((item, index) => ({
          id: Date.now() + index,
          categoryId: '',
          amount: item.amount,
          description: item.description || `Receipt item: ${item.name}`,
          inventoryDetails: {
            item_name: item.name,
            quantity: 1,
            location: 'Store',
            asset_prefix: '',
            is_consumable: false,
            category_id: '',
            sub_category_id: ''
          }
        }));
        setLineItems(newLineItems);
        console.log('Created multiple line items:', newLineItems);
      } 
      // Single item receipt
      else if (initialData.amount) {
        setLineItems([{
          id: Date.now(),
          categoryId: '',
          amount: initialData.amount || '',
          description: initialData.description || `Receipt from ${initialData.merchant || 'Store'}`,
          inventoryDetails: {
            item_name: initialData.description || 'Receipt item',
            quantity: 1,
            location: 'Store',
            asset_prefix: '',
            is_consumable: false,
            category_id: '',
            sub_category_id: ''
          }
        }]);
        console.log('Created single line item');
      }
    }
  }, [initialData]);

  const fetchInventoryCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/inventory/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventoryCategories(response.data.categories || []);
      console.log('Categories loaded:', response.data.categories);
    } catch (err) {
      console.error('Error fetching inventory categories:', err);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now(),
      categoryId: '',
      amount: '',
      description: '',
      inventoryDetails: {
        item_name: '',
        quantity: 1,
        location: 'Store',
        asset_prefix: '',
        is_consumable: false,
        category_id: '',
        sub_category_id: ''
      }
    }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length === 1) {
      setError('You need at least one line item');
      return;
    }
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        if (field === 'categoryId') {
          const selectedCategory = inventoryCategories.find(c => c.id === parseInt(value));
          const isConsumable = selectedCategory?.type === 'consumable';
          
          return { 
            ...item, 
            categoryId: value,
            inventoryDetails: {
              ...item.inventoryDetails,
              category_id: value,
              is_consumable: isConsumable
            }
          };
        }
        if (field === 'inventoryDetails') {
          return { ...item, inventoryDetails: { ...item.inventoryDetails, ...value } };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const updateInventoryDetails = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          inventoryDetails: { ...item.inventoryDetails, [field]: value }
        };
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return lineItems.reduce((total, item) => total + (parseFloat(item.amount) || 0), 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('=== SUBMIT STARTED ===');
    console.log('Line items:', lineItems);
    
    for (const item of lineItems) {
      console.log('Validating item:', item);
      if (!item.categoryId || !item.amount) {
        console.log('Validation failed: missing categoryId or amount');
        setError('All line items require category and amount');
        return;
      }
      if (parseFloat(item.amount) <= 0) {
        console.log('Validation failed: amount <= 0');
        setError('Amount must be greater than 0 for all items');
        return;
      }
      if (!item.inventoryDetails.item_name) {
        console.log('Validation failed: missing item_name');
        setError('Please provide item name for each line item');
        return;
      }
    }

    console.log('Validation passed!');
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const preparedItems = lineItems.map(item => ({
        categoryId: parseInt(item.categoryId),
        amount: parseFloat(item.amount),
        description: item.description,
        expenseDate: new Date().toISOString().split('T')[0],
        inventoryType: item.inventoryDetails.is_consumable ? 'consumable' : 'asset',
        inventoryDetails: {
          ...item.inventoryDetails,
          category_id: parseInt(item.categoryId)
        }
      }));

      console.log('Prepared items:', preparedItems);

      const response = await axios.post('http://localhost:5000/api/expenses', {
        line_items: preparedItems,
        receiptPath: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('API Response:', response.data);

      if (response.data.success) {
        console.log('Success! Calling onExpenseAdded');
        if (onExpenseAdded) onExpenseAdded();
      }
    } catch (err) {
      console.error('Submit error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Error creating expense');
    } finally {
      setLoading(false);
    }
  };

  const getSubCategories = (categoryId) => {
    const category = inventoryCategories.find(c => c.id === parseInt(categoryId));
    return category?.sub_categories || [];
  };

  const isCategoryConsumable = (categoryId) => {
    const category = inventoryCategories.find(c => c.id === parseInt(categoryId));
    return category?.type === 'consumable';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add New Expense</h2>
          <p className="text-sm text-gray-500 mt-1">Add multiple items from a single receipt</p>
          {initialData && initialData.items && initialData.items.length > 0 && (
            <p className="text-sm text-purple-600 mt-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {initialData.items.length} items loaded from receipt scan
            </p>
          )}
          {initialData && !initialData.items && initialData.amount && (
            <p className="text-sm text-purple-600 mt-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Data loaded from receipt scan
            </p>
          )}
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {lineItems.map((item, index) => {
          const isConsumable = isCategoryConsumable(item.categoryId);
          const subCategories = getSubCategories(item.categoryId);
          
          return (
            <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Item {index + 1}</h3>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.categoryId}
                    onChange={(e) => updateLineItem(item.id, 'categoryId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">Select category</option>
                    {inventoryCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {item.categoryId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Type: {isConsumable ? 'Consumable (stock tracked)' : 'Asset (individual tracking)'}
                    </p>
                  )}
                </div>

                {subCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub-Category
                    </label>
                    <select
                      value={item.inventoryDetails.sub_category_id || ''}
                      onChange={(e) => updateInventoryDetails(item.id, 'sub_category_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Select sub-category</option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.inventoryDetails.item_name}
                    onChange={(e) => updateInventoryDetails(item.id, 'item_name', e.target.value)}
                    placeholder="e.g., Dell Desktop, Printer Paper"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                    placeholder="Item price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    rows="2"
                    placeholder="Additional details about this item"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.inventoryDetails.quantity}
                    onChange={(e) => updateInventoryDetails(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {isConsumable ? 'Number of units to add to stock' : 'Number of individual items'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={item.inventoryDetails.location}
                    onChange={(e) => updateInventoryDetails(item.id, 'location', e.target.value)}
                    placeholder="e.g., CS Lab 101, Store Room"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {!isConsumable && item.inventoryDetails.quantity > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asset ID Prefix
                    </label>
                    <input
                      type="text"
                      value={item.inventoryDetails.asset_prefix}
                      onChange={(e) => updateInventoryDetails(item.id, 'asset_prefix', e.target.value)}
                      placeholder="e.g., LAB, LAPTOP, SERVER"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Assets will be tagged as: PREFIX_TIMESTAMP_1, PREFIX_TIMESTAMP_2, etc.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addLineItem}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-cyan-500 hover:text-cyan-600 transition-colors"
        >
          + Add Another Item
        </button>

        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total Amount:</span>
            <span className="text-2xl font-bold text-cyan-600">${getTotalAmount()}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Expense for Approval'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddExpenseFormWithItems;