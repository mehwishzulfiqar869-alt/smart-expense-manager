const router = require("express").Router();
const pool = require("../config/database");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('=== CALCULATING BALANCES FOR GROUP:', groupId, '===');
    
    // Get all members
    const membersResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );
    
    if (membersResult.rows.length === 0) {
      return res.json([]);
    }
    
    // Initialize balances for each member
    let balances = {};
    for (const m of membersResult.rows) {
      balances[m.id] = {
        user_id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        balance: 0
      };
    }
    
    // 1. Calculate balances from expenses
    const expensesResult = await pool.query(
      `SELECT e.paid_by, es.user_id, es.amount_owed
       FROM split_expenses e
       JOIN expense_splits es ON es.expense_id = e.id
       WHERE e.group_id = $1`,
      [groupId]
    );
    
    console.log('Expenses found:', expensesResult.rows.length);
    
    for (const expense of expensesResult.rows) {
      // Payer gets positive balance (they are owed money)
      if (balances[expense.paid_by]) {
        balances[expense.paid_by].balance += parseFloat(expense.amount_owed);
      }
      // Person who owes gets negative balance (they owe money)
      if (balances[expense.user_id] && expense.user_id !== expense.paid_by) {
        balances[expense.user_id].balance -= parseFloat(expense.amount_owed);
      }
    }
    
    console.log('Balances after expenses:', JSON.stringify(balances, null, 2));
    
    // 2. Apply settlements to REDUCE debts
    const settlementsResult = await pool.query(
      `SELECT paid_by, paid_to, amount
       FROM settlements
       WHERE group_id = $1`,
      [groupId]
    );
    
    console.log('Settlements found:', settlementsResult.rows.length);
    
    for (const settlement of settlementsResult.rows) {
      const amount = parseFloat(settlement.amount);
      
      // Person who paid - their debt REDUCES (balance increases)
      if (balances[settlement.paid_by]) {
        balances[settlement.paid_by].balance += amount;
        console.log(`  ${balances[settlement.paid_by].name} paid ${amount}, balance: ${balances[settlement.paid_by].balance}`);
      }
      // Person who received - their owed amount REDUCES (balance decreases)
      if (balances[settlement.paid_to]) {
        balances[settlement.paid_to].balance -= amount;
        console.log(`  ${balances[settlement.paid_to].name} received ${amount}, balance: ${balances[settlement.paid_to].balance}`);
      }
    }
    
    console.log('Balances after settlements:', JSON.stringify(balances, null, 2));
    
    // 3. Generate debts (only where balance > 0)
    const debts = [];
    const positive = Object.values(balances).filter(b => b.balance > 0.01);
    const negative = Object.values(balances).filter(b => b.balance < -0.01);
    
    console.log('Positive balances:', positive.map(p => ({ name: p.name, balance: p.balance })));
    console.log('Negative balances:', negative.map(n => ({ name: n.name, balance: n.balance })));
    
    for (const pos of positive) {
      for (const neg of negative) {
        if (pos.balance > 0.01 && neg.balance < -0.01) {
          const amount = Math.min(pos.balance, Math.abs(neg.balance));
          if (amount > 0.01) {
            debts.push({
              owes_user: neg.user_id,
              owes_user_name: neg.name,
              to_user: pos.user_id,
              to_user_name: pos.name,
              total_owed: amount.toFixed(2)
            });
            pos.balance -= amount;
            neg.balance += amount;
          }
        }
      }
    }
    
    console.log('Final debts:', debts);
    res.json(debts);
    
  } catch (error) {
    console.error("Balance calculation error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;