require('dotenv').config();
const { Pool } = require('pg');
require('dotenv').config(); // Add this line

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Expense', // Use your actual database name
  password: process.env.DB_PASSWORD || '12345',
  port: process.env.DB_PORT || 5432,
});

// Test the connection
pool.on('connect', () => {
  console.log(' Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error(' Database connection error:', err);
});

module.exports = pool;