const router = require("express").Router();
const pool = require("../config/database");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// ── GET /api/settlements?group_id=xxx ──
router.get("/", async (req, res, next) => {
  try {
    const { group_id } = req.query;
    if (!group_id) return res.status(400).json({ error: "group_id is required" });

    const result = await pool.query(
      `SELECT s.*,
        payer.first_name || ' ' || payer.last_name AS paid_by_name,
        payee.first_name || ' ' || payee.last_name AS paid_to_name
      FROM settlements s
      JOIN users payer ON payer.id = s.paid_by
      JOIN users payee ON payee.id = s.paid_to
      WHERE s.group_id = $1
      ORDER BY s.settled_at DESC`,
      [group_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET settlements error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/settlements ──
router.post("/", async (req, res, next) => {
  try {
    const { group_id, paid_by, paid_to, amount } = req.body;

    console.log('Settlement request:', { group_id, paid_by, paid_to, amount });

    if (!group_id || !paid_by || !paid_to || !amount) {
      return res.status(400).json({ error: "group_id, paid_by, paid_to, and amount are required" });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    if (parseInt(paid_by) === parseInt(paid_to)) {
      return res.status(400).json({ error: "Cannot settle with yourself" });
    }

    // Verify both users are group members
    const memberCheck = await pool.query(
      `SELECT user_id FROM group_members
      WHERE group_id = $1 AND user_id IN ($2, $3)`,
      [group_id, paid_by, paid_to]
    );
    
    if (memberCheck.rows.length < 2) {
      return res.status(403).json({ error: "Both users must be group members" });
    }

    // Insert settlement record
    const result = await pool.query(
      `INSERT INTO settlements (group_id, paid_by, paid_to, amount, settled_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [group_id, paid_by, paid_to, amount]
    );

    console.log('Settlement recorded:', result.rows[0]);

    res.status(201).json({ 
      success: true,
      message: "Settlement recorded successfully",
      settlement: result.rows[0]
    });
  } catch (err) {
    console.error('POST settlement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/settlements/:id ──
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const check = await pool.query(
      "SELECT id FROM settlements WHERE id = $1 AND paid_by = $2",
      [id, userId]
    );
    
    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Only the payer can delete the settlement" });
    }

    await pool.query("DELETE FROM settlements WHERE id = $1", [id]);
    res.json({ success: true, message: "Settlement deleted" });
  } catch (err) {
    console.error('DELETE settlement error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;