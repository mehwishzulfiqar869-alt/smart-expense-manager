//  routes/expense.routes.js
//  Core logic: create expenses with equal,
//  exact, or percentage splits
// ============================================

const router = require("express").Router();
const pool = require("../config/database");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// ── GET /api/expenses?group_id=xxx — list expenses in a group ──
router.get("/", async (req, res, next) => {
 try {
 const { group_id, page = 1, limit = 20 } = req.query;

 if (!group_id) return res.status(400).json({ error: "group_id is required" });

 const offset = (page - 1) * limit;

 const result = await query(
 `SELECT e.*,
 u.name AS paid_by_name,
 u.avatar_url AS paid_by_avatar,
 json_agg(
 json_build_object(
 'user_id', es.user_id,
 'user_name', su.name,
 'owed_amount', es.owed_amount,
 'percentage', es.percentage,
 'is_settled', es.is_settled
 ) ORDER BY su.name
 ) AS splits
 FROM expenses e
 JOIN users u ON u.id = e.paid_by
 LEFT JOIN expense_splits es ON es.expense_id = e.id
 LEFT JOIN users su ON su.id = es.user_id
 WHERE e.group_id = $1
 GROUP BY e.id, u.name, u.avatar_url
 ORDER BY e.expense_date DESC, e.created_at DESC
 LIMIT $2 OFFSET $3`,
 [group_id, limit, offset]
 );

 // Total count for pagination
 const countResult = await query(
 "SELECT COUNT(*) FROM expenses WHERE group_id = $1",
 [group_id]
 );

 res.json({
 expenses: result.rows,
 total: parseInt(countResult.rows[0].count),
 page: parseInt(page),
 limit: parseInt(limit),
 });
 } catch (err) {
 next(err);
 }
});

// ── POST /api/expenses — create expense with splits ──
router.post("/", async (req, res, next) => {
 const client = await getClient();
 try {
 const {
 group_id,
 title,
 description,
 total_amount,
 currency,
 category,
 split_method, // 'equal' | 'exact' | 'percentage'
 expense_date,
 splits, // array of { user_id, amount?, percentage? }
 } = req.body;

 // ── Validation ──
 if (!group_id || !title || !total_amount || !splits || splits.length === 0) {
 return res.status(400).json({
 error: "group_id, title, total_amount, and splits are required",
 });
 }

 // Verify the payer is a group member
 const memberCheck = await client.query(
 "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
 [group_id, req.user.id]
 );
 if (memberCheck.rows.length === 0) {
 return res.status(403).json({ error: "Not a member of this group" });
 }

 // ── Calculate split amounts ──
 const method = split_method || "equal";
 const calculatedSplits = calculateSplits(method, total_amount, splits);

 // Verify splits add up
 const splitSum = calculatedSplits.reduce((sum, s) => sum + s.owed_amount, 0);
 if (Math.abs(splitSum - total_amount) > 0.01) {
 return res.status(400).json({
 error: `Split amounts (${splitSum.toFixed(2)}) don't match total (${total_amount})`,
 });
 }

 await client.query("BEGIN");

 // Insert expense
 const expenseResult = await client.query(
 `INSERT INTO expenses (group_id, paid_by, title, description, total_amount, currency, category, split_method, expense_date)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
 RETURNING *`,
 [
 group_id,
 req.user.id,
 title,
 description || null,
 total_amount,
 currency || "USD",
 category || "general",
 method,
 expense_date || new Date(),
 ]
 );

 const expense = expenseResult.rows[0];

 // Insert each split
 for (const split of calculatedSplits) {
 await client.query(
 `INSERT INTO expense_splits (expense_id, user_id, owed_amount, percentage)
 VALUES ($1, $2, $3, $4)`,
 [expense.id, split.user_id, split.owed_amount, split.percentage || null]
 );
 }

 await client.query("COMMIT");

 // Return full expense with splits
 const fullExpense = await query(
 `SELECT e.*,
 json_agg(
 json_build_object(
 'user_id', es.user_id,
 'user_name', u.name,
 'owed_amount', es.owed_amount,
 'percentage', es.percentage
 )
 ) AS splits
 FROM expenses e
 LEFT JOIN expense_splits es ON es.expense_id = e.id
 LEFT JOIN users u ON u.id = es.user_id
 WHERE e.id = $1
 GROUP BY e.id`,
 [expense.id]
 );

 res.status(201).json(fullExpense.rows[0]);
 } catch (err) {
 await client.query("ROLLBACK");
 next(err);
 } finally {
 client.release();
 }
});

// ── PUT /api/expenses/:id — update expense ──
router.put("/:id", async (req, res, next) => {
 const client = await getClient();
 try {
 const { id } = req.params;
 const { title, description, total_amount, category, split_method, splits, expense_date } = req.body;

 // Verify ownership
 const expenseCheck = await client.query(
 "SELECT * FROM expenses WHERE id = $1 AND paid_by = $2",
 [id, req.user.id]
 );
 if (expenseCheck.rows.length === 0) {
 return res.status(403).json({ error: "Only the payer can edit the expense" });
 }

 await client.query("BEGIN");

 // Update expense
 const expenseResult = await client.query(
 `UPDATE expenses SET
 title = COALESCE($1, title),
 description = COALESCE($2, description),
 total_amount = COALESCE($3, total_amount),
 category = COALESCE($4, category),
 split_method = COALESCE($5, split_method),
 expense_date = COALESCE($6, expense_date)
 WHERE id = $7
 RETURNING *`,
 [title, description, total_amount, category, split_method, expense_date, id]
 );

 const expense = expenseResult.rows[0];

 // Recalculate splits if provided
 if (splits && splits.length > 0) {
 await client.query("DELETE FROM expense_splits WHERE expense_id = $1", [id]);

 const method = split_method || expense.split_method;
 const amount = total_amount || expense.total_amount;
 const calculatedSplits = calculateSplits(method, amount, splits);

 for (const split of calculatedSplits) {
 await client.query(
 `INSERT INTO expense_splits (expense_id, user_id, owed_amount, percentage)
 VALUES ($1, $2, $3, $4)`,
 [id, split.user_id, split.owed_amount, split.percentage || null]
 );
 }
 }

 await client.query("COMMIT");

 res.json(expense);
 } catch (err) {
 await client.query("ROLLBACK");
 next(err);
 } finally {
 client.release();
 }
});

// ── DELETE /api/expenses/:id ──
router.delete("/:id", async (req, res, next) => {
 try {
 const { id } = req.params;

 const expenseCheck = await query(
 "SELECT id FROM expenses WHERE id = $1 AND paid_by = $2",
 [id, req.user.id]
 );
 if (expenseCheck.rows.length === 0) {
 return res.status(403).json({ error: "Only the payer can delete the expense" });
 }

 await query("DELETE FROM expenses WHERE id = $1", [id]);
 res.json({ message: "Expense deleted" });
 } catch (err) {
 next(err);
 }
});

// ============================================
// Split Calculation Engine
// ============================================

function calculateSplits(method, totalAmount, splits) {
 const total = parseFloat(totalAmount);

 switch (method) {
 // ── Equal split among all participants ──
 case "equal": {
 const count = splits.length;
 const perPerson = Math.floor((total * 100) / count) / 100;
 const remainder = Math.round((total - perPerson * count) * 100) / 100;

 return splits.map((s, i) => ({
 user_id: s.user_id,
 owed_amount: i === 0 ? perPerson + remainder : perPerson,
 percentage: parseFloat((100 / count).toFixed(2)),
 }));
 }

 // ── Exact amounts specified per person ──
 case "exact": {
 return splits.map((s) => ({
 user_id: s.user_id,
 owed_amount: parseFloat(s.amount),
 percentage: parseFloat(((s.amount / total) * 100).toFixed(2)),
 }));
 }

 // ── Percentage-based split ──
 case "percentage": {
 return splits.map((s) => ({
 user_id: s.user_id,
 owed_amount: parseFloat(((s.percentage / 100) * total).toFixed(2)),
 percentage: parseFloat(s.percentage),
 }));
 }

 default:
 throw new Error(`Unknown split method: ${method}`);
 }
}
// GET /api/expenses/group/:groupId - Alternative endpoint for easier frontend use
router.get("/group/:groupId", async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, u.first_name, u.last_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1
       ORDER BY e.created_at DESC`,
      [groupId]
    );
    
    const expenses = result.rows.map(exp => ({
      ...exp,
      paid_by_name: `${exp.first_name} ${exp.last_name}`
    }));
    
    res.json({ expenses });
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/group/:groupId/splits - Get expense splits
router.get("/group/:groupId/splits", async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    const result = await pool.query(
      `SELECT es.*, u.first_name, u.last_name, e.title, e.total_amount, e.paid_by
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       JOIN users u ON u.id = es.user_id
       WHERE e.group_id = $1
       ORDER BY e.created_at DESC`,
      [groupId]
    );
    
    res.json({ splits: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;