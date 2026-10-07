const pool = require('../config/database');

const expenseModel = {
  // Get all expenses with filters (for admin)
getAllExpenses: async (filters = {}) => {
  try {
    let query = `
      SELECT 
        e.*,
        u.first_name, u.last_name, u.email,
        r.first_name as reviewer_first_name,
        r.last_name as reviewer_last_name,
        COALESCE(
          (SELECT ic.name FROM expense_items ei 
           LEFT JOIN inventory_categories ic ON ic.id = ei.category_id 
           WHERE ei.expense_id = e.id LIMIT 1),
          c.name
        ) as category_name
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND e.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND e.expense_date >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND e.expense_date <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    if (filters.categoryId) {
      query += ` AND e.category_id = $${paramCount}`;
      params.push(filters.categoryId);
      paramCount++;
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
},

  // Get expenses by user ID
getExpensesByUserId: async (userId, filters = {}) => {
  try {
    let query = `
      SELECT 
        e.*,
        r.first_name as reviewer_first_name,
        r.last_name as reviewer_last_name,
        COALESCE(
          (SELECT ic.name FROM expense_items ei 
           LEFT JOIN inventory_categories ic ON ic.id = ei.category_id 
           WHERE ei.expense_id = e.id LIMIT 1),
          c.name
        ) as category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE e.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND e.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND e.expense_date >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND e.expense_date <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    if (filters.categoryId) {
      query += ` AND e.category_id = $${paramCount}`;
      params.push(filters.categoryId);
      paramCount++;
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
},

  // Get expense by ID
  getExpenseById: async (id) => {
    try {
      const query = `
        SELECT 
          e.*,
          u.first_name, u.last_name, u.email,
          c.name as category_name,
          r.first_name as reviewer_first_name,
          r.last_name as reviewer_last_name
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users r ON e.reviewed_by = r.id
        WHERE e.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Create new expense
  createExpense: async (expenseData) => {
    try {
      const query = `
        INSERT INTO expenses (user_id, amount, description, expense_date, receipt_path, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        expenseData.userId,
        expenseData.totalAmount,
        expenseData.description,
        expenseData.expenseDate,
        expenseData.receiptPath,
        expenseData.status || 'pending'
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

 // Create expense item (line item)
createExpenseItem: async (itemData) => {
  try {
    const query = `
      INSERT INTO expense_items (expense_id, category_id, amount, description, inventory_type, inventory_details, quantity, unit_price, total_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const quantity = itemData.quantity || 1;
    const totalPrice = itemData.amount;
    const unitPrice = totalPrice / quantity;
    
    const values = [
      itemData.expenseId,
      itemData.categoryId,
      totalPrice,
      itemData.description || '',
      itemData.inventoryType || 'asset',
      itemData.inventoryDetails ? JSON.stringify(itemData.inventoryDetails) : null,
      quantity,
      unitPrice,
      totalPrice
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Create expense item error:', error);
    throw error;
  }
},
  // Update expense
  updateExpense: async (id, updateData) => {
    try {
      const query = `
        UPDATE expenses
        SET 
          category_id = COALESCE($1, category_id),
          amount = COALESCE($2, amount),
          description = COALESCE($3, description),
          expense_date = COALESCE($4, expense_date),
          receipt_path = COALESCE($5, receipt_path),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;
      
      const values = [
        updateData.categoryId,
        updateData.amount,
        updateData.description,
        updateData.expenseDate,
        updateData.receiptPath,
        id
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Delete expense
  deleteExpense: async (id) => {
    try {
      const query = 'DELETE FROM expenses WHERE id = $1';
      await pool.query(query, [id]);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Review expense (approve/reject)
  reviewExpense: async (id, reviewData) => {
    try {
      const query = `
        UPDATE expenses
        SET 
          status = $1,
          reviewed_by = $2,
          review_notes = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      
      const values = [
        reviewData.status,
        reviewData.reviewedBy,
        reviewData.reviewNotes,
        id
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get expense with all line items
  getExpenseWithItems: async (expenseId) => {
    try {
      const expenseQuery = `
        SELECT e.*, u.first_name, u.last_name, u.email
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        WHERE e.id = $1
      `;
      const expenseResult = await pool.query(expenseQuery, [expenseId]);
      
      if (expenseResult.rows.length === 0) return null;
      
      const itemsQuery = `
        SELECT ei.*, c.name as category_name
        FROM expense_items ei
        JOIN categories c ON ei.category_id = c.id
        WHERE ei.expense_id = $1
      `;
      const itemsResult = await pool.query(itemsQuery, [expenseId]);
      
      return {
        ...expenseResult.rows[0],
        items: itemsResult.rows
      };
    } catch (error) {
      throw error;
    }
  },

  // Review expense and create inventory items if approved (FIXED - Handles both Assets and Stock)
reviewExpenseWithInventory: async (id, reviewData) => {
  const client = await pool.connect();
  try {
    console.log('reviewExpenseWithInventory started for ID:', id);
    await client.query('BEGIN');
    
    // Update expense status
    const updateQuery = `
      UPDATE expenses
      SET status = $1, reviewed_by = $2, review_notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const updateValues = [reviewData.status, reviewData.reviewedBy, reviewData.reviewNotes, id];
    const expenseResult = await client.query(updateQuery, updateValues);
    
    const expense = expenseResult.rows[0];
    console.log('Expense updated:', expense);
    
    // If approved, create inventory items
    if (reviewData.status === 'approved') {
      console.log('Status is approved, checking for expense items...');
      
      const itemsQuery = `
        SELECT * FROM expense_items WHERE expense_id = $1
      `;
      const itemsResult = await client.query(itemsQuery, [id]);
      console.log('Found expense items:', itemsResult.rows.length);
      
      for (const item of itemsResult.rows) {
        console.log('Processing item:', item);
        
        if (item.inventory_details) {
          // Parse inventory details (handle both string and object)
          const details = typeof item.inventory_details === 'string' 
            ? JSON.parse(item.inventory_details) 
            : item.inventory_details;
          
          console.log('Inventory details:', details);
          
          // Check if it's a consumable
          if (details.is_consumable === true) {
            // ============================================
            // HANDLE CONSUMABLES (Go to Stock Management)
            // ============================================
            console.log('Processing consumable:', details.item_name);
            
            const consumableCheck = await client.query(`
              SELECT id, current_quantity FROM inventory_consumables 
              WHERE name ILIKE $1
            `, [`%${details.item_name}%`]);
            
            if (consumableCheck.rows.length > 0) {
              const newQuantity = consumableCheck.rows[0].current_quantity + (details.quantity || 1);
              await client.query(`
                UPDATE inventory_consumables 
                SET current_quantity = $1, updated_at = NOW(),
                    last_restocked = NOW()
                WHERE id = $2
              `, [newQuantity, consumableCheck.rows[0].id]);
              console.log('Updated consumable quantity to:', newQuantity);
            } else {
              console.log('Consumable not found, creating new one');
              await client.query(`
                INSERT INTO inventory_consumables (name, description, current_quantity, minimum_threshold, sub_category_id)
                VALUES ($1, $2, $3, $4, $5)
              `, [details.item_name, item.description || '', details.quantity || 1, 5, details.sub_category_id || null]);
              console.log('Created new consumable:', details.item_name);
            }
          } else {
            // ============================================
            // HANDLE ASSETS (Hardware, Peripherals, Networking)
            // ============================================
            console.log('Processing asset:', details.item_name);
            console.log('Quantity:', details.quantity);
            console.log('Asset prefix:', details.asset_prefix);
            
            const quantity = details.quantity || 1;
            const unitPrice = item.amount / quantity;
            const assetPrefix = details.asset_prefix || 'AST';
            
            // Get current timestamp for unique asset tags
            const timestamp = Date.now();
            
            // Create individual assets for each unit
            for (let i = 1; i <= quantity; i++) {
              const assetTag = `${assetPrefix}${timestamp}${i}`;
              
              await client.query(`
                INSERT INTO inventory_assets (
                  asset_tag, name, description, category_id, sub_category_id, 
                  status, location, purchase_price, expense_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              `, [
                assetTag,
                `${details.item_name} #${i}`,
                item.description || details.item_name,
                details.category_id || item.category_id,
                details.sub_category_id || null,
                'procured',
                details.location || 'Store',
                unitPrice,
                id
              ]);
              console.log(`Created asset: ${assetTag}`);
            }
            console.log(`Created ${quantity} asset(s) for ${details.item_name}`);
          }
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    return expense;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('reviewExpenseWithInventory error:', error);
    throw error;
  } finally {
    client.release();
  }
},
};

module.exports = expenseModel;