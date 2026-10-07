// routes/inventoryRoutes.js
// Inventory Management Routes (Assets + Consumables)

const router = require("express").Router();
const pool = require("../config/database");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// ============================================
// INVENTORY OVERVIEW DASHBOARD
// ============================================

// GET /api/inventory/dashboard - Get summary stats
router.get("/dashboard", async (req, res) => {
  try {
    const { role } = req.user;
    
    // Only admin and employees can access inventory
    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Total assets count by status
    const assetsResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM inventory_assets 
      GROUP BY status
    `);

    // Low stock alerts (unread)
    const alertsResult = await pool.query(`
      SELECT lsa.*, ic.name as consumable_name
      FROM low_stock_alerts lsa
      JOIN inventory_consumables ic ON ic.id = lsa.consumable_id
      WHERE lsa.is_read = false
      ORDER BY lsa.created_at DESC
    `);

    // Recent asset activity (last 10 changes)
    const recentActivity = await pool.query(`
      SELECT iah.*, u.first_name, u.last_name, ia.name as asset_name
      FROM inventory_asset_history iah
      JOIN inventory_assets ia ON ia.id = iah.asset_id
      JOIN users u ON u.id = iah.changed_by
      ORDER BY iah.created_at DESC
      LIMIT 10
    `);

    // Consumables below threshold
    const lowStockItems = await pool.query(`
      SELECT ic.*, isc.name as sub_category_name
      FROM inventory_consumables ic
      JOIN inventory_sub_categories isc ON isc.id = ic.sub_category_id
      WHERE ic.current_quantity <= ic.minimum_threshold
    `);

    res.json({
      success: true,
      stats: {
        assets_by_status: assetsResult.rows,
        unread_alerts: alertsResult.rows.length,
        low_stock_count: lowStockItems.rows.length,
        total_assets: assetsResult.rows.reduce((sum, a) => sum + parseInt(a.count), 0)
      },
      alerts: alertsResult.rows,
      recent_activity: recentActivity.rows,
      low_stock_items: lowStockItems.rows
    });
  } catch (error) {
    console.error("Inventory dashboard error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSETS MANAGEMENT (Hardware/Peripherals)
// ============================================

// GET /api/inventory/assets - Get all assets with filters
router.get("/assets", async (req, res) => {
  try {
    const { status, category_id, search } = req.query;
    const { role } = req.user;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    let query = `
      SELECT ia.*, 
             ic.name as category_name, 
             isc.name as sub_category_name,
             u.first_name as assigned_first_name,
             u.last_name as assigned_last_name
      FROM inventory_assets ia
      JOIN inventory_categories ic ON ic.id = ia.category_id
      JOIN inventory_sub_categories isc ON isc.id = ia.sub_category_id
      LEFT JOIN users u ON u.id = ia.assigned_to
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND ia.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (category_id) {
      query += ` AND ia.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (ia.name ILIKE $${paramCount} OR ia.asset_tag ILIKE $${paramCount} OR ia.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY ia.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, assets: result.rows });
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventory/assets/:id - Get single asset
router.get("/assets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(`
      SELECT ia.*, 
             ic.name as category_name, 
             isc.name as sub_category_name,
             u.first_name as assigned_first_name,
             u.last_name as assigned_last_name
      FROM inventory_assets ia
      JOIN inventory_categories ic ON ic.id = ia.category_id
      JOIN inventory_sub_categories isc ON isc.id = ia.sub_category_id
      LEFT JOIN users u ON u.id = ia.assigned_to
      WHERE ia.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Get status history
    const historyResult = await pool.query(`
      SELECT iah.*, u.first_name, u.last_name
      FROM inventory_asset_history iah
      JOIN users u ON u.id = iah.changed_by
      WHERE iah.asset_id = $1
      ORDER BY iah.created_at DESC
    `, [id]);

    res.json({ 
      success: true, 
      asset: result.rows[0],
      history: historyResult.rows
    });
  } catch (error) {
    console.error("Get asset error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventory/assets/:id/status - Update asset status
router.put("/assets/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, assigned_to, notes } = req.body;
    const { userId, role } = req.user;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get current asset details
    const currentAsset = await pool.query(`
      SELECT status, location, assigned_to FROM inventory_assets WHERE id = $1
    `, [id]);

    if (currentAsset.rows.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const oldStatus = currentAsset.rows[0].status;
    const oldLocation = currentAsset.rows[0].location;
    const oldAssignedTo = currentAsset.rows[0].assigned_to;

    // Update asset
    await pool.query(`
      UPDATE inventory_assets 
      SET status = COALESCE($1, status),
          location = COALESCE($2, location),
          assigned_to = COALESCE($3, assigned_to),
          updated_at = NOW()
      WHERE id = $4
    `, [status, location, assigned_to, id]);

    // Record history
    await pool.query(`
      INSERT INTO inventory_asset_history (asset_id, old_status, new_status, old_location, new_location, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, oldStatus, status || oldStatus, oldLocation, location || oldLocation, userId, notes]);

    res.json({ success: true, message: "Asset status updated" });
  } catch (error) {
    console.error("Update asset status error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONSUMABLES STOCK MANAGEMENT
// ============================================

// GET /api/inventory/consumables - Get all consumables
router.get("/consumables", async (req, res) => {
  try {
    const { role } = req.user;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(`
      SELECT ic.*, isc.name as sub_category_name, 
             icc.name as category_name,
             CASE WHEN ic.current_quantity <= ic.minimum_threshold THEN true ELSE false END as is_low
      FROM inventory_consumables ic
      JOIN inventory_sub_categories isc ON isc.id = ic.sub_category_id
      JOIN inventory_categories icc ON icc.id = isc.category_id
      ORDER BY ic.current_quantity ASC
    `);

    res.json({ success: true, consumables: result.rows });
  } catch (error) {
    console.error("Get consumables error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventory/consumables/:id/stock - Update stock quantity
router.put("/consumables/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity_change, notes } = req.body;
    const { userId, role } = req.user;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get current quantity
    const current = await pool.query(`
      SELECT current_quantity, minimum_threshold, name FROM inventory_consumables WHERE id = $1
    `, [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Consumable not found" });
    }

    const newQuantity = current.rows[0].current_quantity + quantity_change;
    const transactionType = quantity_change > 0 ? 'restock' : 'usage';

    // Update quantity
    await pool.query(`
      UPDATE inventory_consumables 
      SET current_quantity = $1, updated_at = NOW(),
          last_restocked = CASE WHEN $2 > 0 THEN NOW() ELSE last_restocked END
      WHERE id = $3
    `, [newQuantity, quantity_change, id]);

    // Log transaction
    await pool.query(`
      INSERT INTO inventory_consumable_log (consumable_id, quantity_change, new_quantity, transaction_type, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, quantity_change, newQuantity, transactionType, notes, userId]);

    // Check if low stock alert needed
    if (newQuantity <= current.rows[0].minimum_threshold) {
      await pool.query(`
        INSERT INTO low_stock_alerts (consumable_id, alert_message)
        VALUES ($1, $2)
      `, [id, `${current.rows[0].name} is low on stock (${newQuantity} left)`]);
    }

    res.json({ success: true, message: "Stock updated", new_quantity: newQuantity });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventory/consumables/:id/threshold - Update minimum threshold
router.put("/consumables/:id/threshold", async (req, res) => {
  try {
    const { id } = req.params;
    const { threshold } = req.body;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: "Only admins can set thresholds" });
    }

    await pool.query(`
      UPDATE inventory_consumables 
      SET minimum_threshold = $1, updated_at = NOW()
      WHERE id = $2
    `, [threshold, id]);

    res.json({ success: true, message: "Threshold updated" });
  } catch (error) {
    console.error("Update threshold error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventory/categories - Get all inventory categories
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ic.*, 
        (SELECT json_agg(json_build_object('id', isc.id, 'name', isc.name, 'is_consumable', isc.is_consumable))
         FROM inventory_sub_categories isc WHERE isc.category_id = ic.id) as sub_categories
      FROM inventory_categories ic
      ORDER BY ic.name
    `);

    res.json({ success: true, categories: result.rows });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventory/alerts/:id/read - Mark alert as read
router.put("/alerts/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query(`
      UPDATE low_stock_alerts SET is_read = true WHERE id = $1
    `, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Mark alert read error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;