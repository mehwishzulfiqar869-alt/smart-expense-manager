// routes/user.routes.js
// ============================================

const router = require("express").Router();
const { query } = require("../config/database");
const { protect } = require("../middleware/authMiddleware");

// GET /api/users/me — current user profile
router.get("/me", authenticate, async (req, res, next) => {
 try {
 const result = await query(
 "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
 [req.user.id]
 );

 if (result.rows.length === 0) {
 return res.status(404).json({ error: "User not found" });
 }

 res.json(result.rows[0]);
 } catch (err) {
 next(err);
 }
});

// PUT /api/users/me — update profile
router.put("/me", authenticate, async (req, res, next) => {
 try {
 const { name, avatar_url } = req.body;

 const result = await query(
 `UPDATE users SET
 name = COALESCE($1, name),
 avatar_url = COALESCE($2, avatar_url)
 WHERE id = $3
 RETURNING id, name, email, avatar_url, updated_at`,
 [name, avatar_url, req.user.id]
 );

 res.json(result.rows[0]);
 } catch (err) {
 next(err);
 }
});

// GET /api/users/search?q=john — search users by name or email
router.get("/search", authenticate, async (req, res, next) => {
 try {
 const { q } = req.query;
 if (!q || q.length < 2) {
 return res.status(400).json({ error: "Search query must be at least 2 characters" });
 }

 const result = await query(
 `SELECT id, name, email, avatar_url FROM users
 WHERE (name ILIKE $1 OR email ILIKE $1) AND id != $2
 LIMIT 20`,
 [`%${q}%`, req.user.id]
 );

 res.json(result.rows);
 } catch (err) {
 next(err);
 }
});

module.exports = router;