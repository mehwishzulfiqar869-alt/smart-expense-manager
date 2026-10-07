const expenseModel = require('../models/expenseModel');

const expenseController = {
  // Get expenses (employee sees their own, admin sees all)
  getExpenses: async (req, res) => {
    try {
      const { userId, role } = req.user;
      const { status, startDate, endDate, categoryId } = req.query;

      let expenses;
      if (role === 'admin') {
        // Admin can see all expenses
        expenses = await expenseModel.getAllExpenses({ status, startDate, endDate, categoryId });
      } else {
        // Employee sees only their expenses
        expenses = await expenseModel.getExpensesByUserId(userId, { status, startDate, endDate, categoryId });
      }

      res.json({
        success: true,
        expenses
      });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expenses'
      });
    }
  },

  // Get single expense by ID
  getExpenseById: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;

      const expense = await expenseModel.getExpenseById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check if user has permission to view this expense
      if (role !== 'admin' && expense.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        expense
      });
    } catch (error) {
      console.error('Get expense by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expense'
      });
    }
  },

  // CREATE NEW EXPENSE WITH LINE ITEMS
createExpense: async (req, res) => {
  try {
    const { userId } = req.user;
    console.log('Received request body:', req.body);
    
    const { line_items, receiptPath } = req.body;

    // Validate required fields
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      console.log('No line items found');
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one line item'
      });
    }

    console.log(`Processing ${line_items.length} line items`);

    // Calculate total amount and prepare expense data
    let totalAmount = 0;
    for (const item of line_items) {
      console.log('Processing item:', item);
      
      if (!item.categoryId || !item.amount) {
        console.log('Missing categoryId or amount');
        return res.status(400).json({
          success: false,
          message: 'Each line item requires category and amount'
        });
      }
      if (item.amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0 for all items'
        });
      }
      totalAmount += parseFloat(item.amount);
    }

    const expenseDate = new Date().toISOString().split('T')[0];

    // Create description from all line items
    const description = line_items.map(item => 
      item.description || item.inventoryDetails?.item_name || 'Item'
    ).join(', ');

    const expenseData = {
      userId,
      totalAmount,
      description: description,
      expenseDate,
      receiptPath: receiptPath || null,
      status: 'pending'
    };

    console.log('Creating expense with data:', expenseData);

    // Create the expense record
    const newExpense = await expenseModel.createExpense(expenseData);
    console.log('Expense created with ID:', newExpense.id);

    // Save each line item to expense_items table
    for (const item of line_items) {
      const itemData = {
        expenseId: newExpense.id,
        categoryId: parseInt(item.categoryId),
        amount: parseFloat(item.amount),
        description: item.description || item.inventoryDetails?.item_name || '',
        inventoryType: item.inventoryType || 'asset',
        inventoryDetails: item.inventoryDetails || null
      };
      console.log('Creating expense item:', itemData);
      await expenseModel.createExpenseItem(itemData);
    }

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: newExpense,
      line_items: line_items
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating expense',
      error: error.message
    });
  }
},

  // Update expense
  updateExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;
      const { categoryId, amount, description, expenseDate, receiptPath } = req.body;

      // Check if expense exists
      const expense = await expenseModel.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check permission (only owner or admin can update)
      if (role !== 'admin' && expense.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Employee can only update pending expenses
      if (role !== 'admin' && expense.status !== 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Cannot update approved or rejected expenses'
        });
      }

      const updateData = {
        categoryId,
        amount,
        description,
        expenseDate,
        receiptPath
      };

      const updatedExpense = await expenseModel.updateExpense(id, updateData);

      res.json({
        success: true,
        message: 'Expense updated successfully',
        expense: updatedExpense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating expense'
      });
    }
  },

  // Delete expense
  deleteExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;

      // Check if expense exists
      const expense = await expenseModel.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check permission
      if (role !== 'admin' && expense.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Employee can only delete pending expenses
      if (role !== 'admin' && expense.status !== 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete approved or rejected expenses'
        });
      }

      await expenseModel.deleteExpense(id);

      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting expense'
      });
    }
  },

  // REVIEW EXPENSE WITH INVENTORY HANDLING (Updated)
  reviewExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;
      const { status, reviewNotes } = req.body;

      console.log('=== REVIEW EXPENSE CALLED ===');
    console.log('Expense ID from params:', id);
    console.log('Status:', status);
    console.log('User ID:', userId);
    console.log('User Role:', role);


      // Only admin can review
      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can review expenses'
        });
      }

      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either approved or rejected'
        });
      }

      const expense = await expenseModel.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      const reviewData = {
        status,
        reviewedBy: userId,
        reviewNotes: reviewNotes || null
      };

      const updatedExpense = await expenseModel.reviewExpenseWithInventory(id, reviewData);

      res.json({
        success: true,
        message: `Expense ${status} successfully`,
        expense: updatedExpense
      });
    } catch (error) {
      console.error('Review expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error reviewing expense'
      });
    }
  }
};

module.exports = expenseController;