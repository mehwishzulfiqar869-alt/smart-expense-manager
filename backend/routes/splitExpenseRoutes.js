const router = require("express").Router();
const pool = require("../config/database");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// GET /api/split-expenses/group/:groupId
router.get("/group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // First check if user is a member of this group
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.user.userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }
    
    // Get all expenses with payer names
    const result = await pool.query(
      `SELECT e.id, e.group_id, e.paid_by, e.amount, e.description, e.created_at,
              u.first_name, u.last_name
       FROM split_expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1
       ORDER BY e.created_at DESC`,
      [groupId]
    );
    
    const expenses = result.rows.map(exp => ({
      id: exp.id,
      group_id: exp.group_id,
      paid_by: exp.paid_by,
      paid_by_name: `${exp.first_name} ${exp.last_name}`,
      amount: parseFloat(exp.amount).toFixed(2),
      description: exp.description,
      created_at: exp.created_at
    }));
    
    res.json({ expenses });
  } catch (error) {
    console.error("GET /split-expenses/group/:groupId error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/split-expenses
router.post("/", async (req, res) => {
  try {
    const { group_id, description, amount, split_with } = req.body;
    const paid_by = req.user.userId;
    
    // Verify membership
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [group_id, paid_by]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }
    
    // Calculate split amount per person (including payer)
    const totalPeople = split_with.length + 1;
    const splitAmount = amount / totalPeople;
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Insert expense
    const expenseResult = await pool.query(
      `INSERT INTO split_expenses (group_id, paid_by, amount, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [group_id, paid_by, amount, description]
    );
    
    const expense = expenseResult.rows[0];
    
    // Insert splits (for each person who owes)
    for (const userId of split_with) {
      await pool.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
         VALUES ($1, $2, $3)`,
        [expense.id, userId, splitAmount]
      );
    }
    
    await pool.query('COMMIT');
    
    res.json({ 
      success: true, 
      expense: {
        id: expense.id,
        amount: parseFloat(expense.amount),
        description: expense.description,
        created_at: expense.created_at
      }
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("POST /split-expenses error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;