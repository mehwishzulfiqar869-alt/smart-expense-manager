// routes/group.routes.js
// ============================================

const router = require("express").Router();
const pool = require("../config/database");
const { protect } = require("../middleware/authMiddleware");
 
router.use(protect);
 
// ── GET /api/groups — list my groups ──
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT g.*,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.userId]
    );
 
    res.json({ groups: result.rows });
  } catch (err) {
    next(err);
  }
});
 
// ── POST /api/groups — create group ──
router.post("/", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, member_ids } = req.body;
 
    if (!name) return res.status(400).json({ error: "Group name is required" });
 
    await client.query("BEGIN");
 
    // Create group
    const groupResult = await client.query(
      `INSERT INTO groups (name, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [name, req.user.userId]
    );
 
    const group = groupResult.rows[0];
 
    // Add creator as admin member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [group.id, req.user.userId]
    );
 
    // Add other members if provided
    if (member_ids && member_ids.length > 0) {
      const uniqueMembers = [...new Set(member_ids.filter((id) => id !== req.user.id))];
      for (const userId of uniqueMembers) {
        await client.query(
          `INSERT INTO group_members (group_id, user_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (group_id, user_id) DO NOTHING`,
          [group.id, userId]
        );
      }
    }
 
    await client.query("COMMIT");
 
    res.status(201).json(group);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});
 
// ── GET /api/groups/:id — group details + members ──
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
 
    // Verify membership
    const memberCheck = await pool.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, req.user.userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }
 
    const groupResult = await pool.query(
      "SELECT * FROM groups WHERE id = $1",
      [id]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
 
    const membersResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at`,
      [id]
    );
 
    res.json({
      ...groupResult.rows[0],
      members: membersResult.rows,
    });
  } catch (err) {
    next(err);
  }
});
 
// ── GET /api/groups/:id/members — get members list ──
router.get("/:id/members", async (req, res, next) => {
  try {
    const { id } = req.params;
 
    const membersResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at`,
      [id]
    );
 
    res.json({ members: membersResult.rows });
  } catch (err) {
    next(err);
  }
});
 
// ── POST /api/groups/:id/members — add multiple members ──
router.post("/:id/members", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { member_ids } = req.body;
 
    // Check if requester is admin of this group
    const adminCheck = await pool.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'admin'",
      [id, req.user.userId]
    );
    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: "Only admins can add members" });
    }
 
    // Check if member_ids is an array
    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: "member_ids array is required" });
    }
 
    let addedCount = 0;
 
    // Add each member
    for (const userId of member_ids) {
      if (!userId) continue;
      
      const result = await pool.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [id, userId]
      );
      
      if (result.rowCount > 0) addedCount++;
    }
 
    res.status(201).json({ 
      message: `${addedCount} member(s) added successfully`,
      added_count: addedCount
    });
  } catch (err) {
    console.error("Error adding members:", err);
    next(err);
  }
});
 
// ── DELETE /api/groups/:id/members/:userId — remove member ──
router.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    const { id, userId } = req.params;
 
    const adminCheck = await pool.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'admin'",
      [id, req.user.userId]
    );
    if (adminCheck.rows.length === 0 && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: "Only admins can remove other members" });
    }
 
    await pool.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, userId]
    );
 
    res.json({ message: "Member removed" });
  } catch (err) {
    next(err);
  }
});
 
// ── DELETE /api/groups/:id — delete group ──
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
 
    const adminCheck = await pool.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'admin'",
      [id, req.user.userId]
    );
    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: "Only admins can delete the group" });
    }
 
    await pool.query("DELETE FROM groups WHERE id = $1", [id]);
    res.json({ message: "Group deleted" });
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;