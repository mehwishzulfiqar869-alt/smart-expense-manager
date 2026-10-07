const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

module.exports = router;