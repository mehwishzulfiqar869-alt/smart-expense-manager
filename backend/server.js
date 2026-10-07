const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const fileUpload = require('express-fileupload');
const userRoutes = require('./routes/userRoutes');
const ocrRoutes = require('./routes/ocrRoutes');


const app = express();

app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ocr', ocrRoutes);

// Split Management Routes
const groupRoutes = require('./routes/groupRoute');
const splitExpRoutes = require('./routes/Exproute');
const settlementRoutes = require('./routes/SettlementRoute');
const balanceRoutes = require('./routes/Balanceroute');
const splitExpenseRoutes = require('./routes/splitExpenseRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

// USE THE ROUTES - ADD THESE LINES
app.use('/api/groups', groupRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/split-expenses', splitExpenseRoutes);
app.use('/api/inventory', inventoryRoutes);
// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.get('/testdb', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Database connection successful!',
      time: result.rows[0].now 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/test-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json({ 
      success: true,
      users: result.rows 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});