const pool = require('../config/database');

const userModel = {
  // Find user by email (for login)
  findByEmail: async (email) => {
    try {
      const result = await pool.query(
        `SELECT id, email, password_hash, first_name, last_name, role 
         FROM users 
         WHERE email = $1 AND is_active = true`,
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get user by ID (for authentication)
  findById: async (id) => {
    try {
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, role 
         FROM users 
         WHERE id = $1 AND is_active = true`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get all employees for manager
  getEmployees: async (managerId) => {
    try {
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, role 
         FROM users 
         WHERE manager_id = $1 AND is_active = true`,
        [managerId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Get all users
  getAllUsers: async () => {
    try {
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, role, is_active, created_at 
         FROM users 
         ORDER BY created_at DESC`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  },
     // Get all teachers (users with role = 'member')
  getAllTeachers: async () => {
    try {
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, role 
         FROM users 
         WHERE role = 'member' 
         ORDER BY first_name`
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, role, is_active, created_at 
         FROM users 
         WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Create new user
  createUser: async (userData) => {
    try {
      const query = `
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, first_name, last_name, role, created_at
      `;
      
      const values = [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.role
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Update user
  updateUser: async (id, updateData) => {
    try {
      const query = `
        UPDATE users
        SET 
          email = COALESCE($1, email),
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          role = COALESCE($4, role),
          password_hash = COALESCE($5, password_hash)
        WHERE id = $6
        RETURNING id, email, first_name, last_name, role
      `;
      
      const values = [
        updateData.email,
        updateData.firstName,
        updateData.lastName,
        updateData.role,
        updateData.passwordHash,
        id
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Delete user
  deleteUser: async (id) => {
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
};


module.exports = userModel;


/*
const pool = require('../config/database');
What it does: This line imports the database connection pool from another file.

pool.query( ... )
What it does: This method instructs the connection pool to send a SQL 
command to the database. It's saying, "Hey database, run this query for me."

HERE manager_id = $1 AND is_active = true: This is the filter or condition.

manager_id = $1: It only selects users whose manager_id matches a value we will provide. 
The $1 is a placeholder for security.

await
What it does: This keyword pauses the execution of the function
until the pool.query operation is complete and returns a result.

const result = ...

What it does: This stores the entire response we get back from the database into
a constant variable named result.

Creating new database connections is slow and expensive (like buying new computers)
A pool maintains a set of pre-established connections ready to use

await = "Pause here until this slow operation completes, but let other code run"
async = "This function contains await calls"
*/