const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {protect} = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET /api/users - Get all users (admin only)
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Get single user
router.get('/:id', userController.getUserById);

// POST /api/users - Create new user (admin only)
router.post('/', userController.createUser);

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Delete/deactivate user (admin only)
router.delete('/:id', userController.deleteUser);
// Get all teachers (users with role = 'member')
router.get('/teachers', protect, async (req, res) => {
  try {
    // Only admin or employees can fetch teachers list
    if (!['admin', 'employee'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const result = await db.query(
      "SELECT id, first_name, last_name, email, role FROM users WHERE role = 'member' ORDER BY first_name"
    );
    
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;