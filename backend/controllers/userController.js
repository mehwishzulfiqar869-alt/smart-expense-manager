const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

const userController = {
  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      const { role } = req.user;

      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const users = await userModel.getAllUsers();

      res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching users'
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;

      // Users can view their own profile, admins can view any
      if (role !== 'admin' && parseInt(id) !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const user = await userModel.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }
  },

  // Create new user (admin only)
  createUser: async (req, res) => {
    try {
      const { role } = req.user;

      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const { email, password, firstName, lastName, userRole } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !userRole) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      // Validate password strength
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
if (!passwordRegex.test(password)) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number'
  });
}

      // Validate role
      if (!['admin', 'employee', 'member'].includes(userRole)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin, employee or member' });
      }
      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const userData = {
        email,
        passwordHash,
        firstName,
        lastName,
        role: userRole
      };

      const newUser = await userModel.createUser(userData);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user'
      });
    }
  },

  // Update user (admin only)
  updateUser: async (req, res) => {
    try {
      const { role } = req.user;
      const { id } = req.params;

      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const { email, firstName, lastName, userRole, password } = req.body;

      // Check if user exists
      const user = await userModel.getUserById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validate role if provided
      if (userRole && !['admin', 'employee', 'member'].includes(userRole)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin , member or employee'
        });
      }

      // Check if email is taken by another user
      if (email && email !== user.email) {
        const existingUser = await userModel.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      const updateData = {
        email,
        firstName,
        lastName,
        role: userRole
      };

      // Hash new password if provided
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters'
          });
        }
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }

      const updatedUser = await userModel.updateUser(id, updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user'
      });
    }
  },

  // Delete/deactivate user (admin only)
  deleteUser: async (req, res) => {
    try {
      const { role, userId } = req.user;
      const { id } = req.params;

      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      // Prevent admin from deleting themselves
      if (parseInt(id) === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account'
        });
      }

      // Check if user exists
      const user = await userModel.getUserById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await userModel.deleteUser(id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  }
};
// Add this function to userController.js
getAllTeachers: async (req, res) => {
  try {
    const { role } = req.user;

    // Only admin or employees can fetch teachers list
    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or employee only.'
      });
    }

    const result = await userModel.getAllTeachers();

    res.json({
      success: true,
      users: result
    });
  } catch (error) {
    console.error('Get all teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers'
    });
  }
},

module.exports = userController;