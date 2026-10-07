const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET /api/expenses - Get user's expenses (employee gets their own, admin gets all)
router.get('/', expenseController.getExpenses);

// GET /api/expenses/:id - Get single expense
router.get('/:id', expenseController.getExpenseById);

// POST /api/expenses - Create new expense
router.post('/', expenseController.createExpense);

// PUT /api/expenses/:id - Update expense
router.put('/:id', expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', expenseController.deleteExpense);

// PUT /api/expenses/:id/review - Admin approve/reject expense
router.put('/:id/review', expenseController.reviewExpense);

module.exports = router;