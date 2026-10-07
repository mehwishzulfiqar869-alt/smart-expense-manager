const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
  // Login for all roles (Employee, Manager, Admin)
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // 1. Check if user exists
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // 2. Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // 3. Create JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          email: user.email 
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
      );

      // 4. Return user info and token
      res.json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error during login' 
      });
    }
  }
};

module.exports = authController;