# Backend Update Code: Delete Inventory Items (Uniform No 3, PVC Shoes, Beret)

## 🎯 Overview

This document provides complete implementation code for deleting inventory items, with special handling for:
- **Uniform No 3** (all sizes: XS, S, M, L, XL, 2XL, 3XL)
- **PVC Shoes** (sizes: 4-12, with UK prefix normalization)
- **Beret** (fractional sizes: 6 1/2, 6 5/8, 6 3/4, etc. - requires EXACT match)

---

## 📋 API Endpoints Required

### 1. Delete by ID
**Endpoint:** `DELETE /api/inventory/:id`

### 2. Delete by Attributes
**Endpoint:** `DELETE /api/inventory/by-attributes`

**Route Order:** Place `DELETE /api/inventory/by-attributes` BEFORE `DELETE /api/inventory/:id` to avoid route conflicts.

---

## 🔧 Implementation Code

### MongoDB Implementation

```javascript
const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory'); // Your Inventory model
const authenticateToken = require('../middleware/authenticateToken'); // Your auth middleware

// ============================================
// DELETE BY ATTRIBUTES (SPECIFIC ROUTE - MUST BE FIRST)
// ============================================
router.delete('/api/inventory/by-attributes', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { category, type, size } = req.body;

    if (!category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Category and type are required'
      });
    }

    // CRITICAL: Size normalization for PVC Shoes and Boot
    let normalizedSize = size;
    if (type === "PVC Shoes" || type === "Boot") {
      // Remove "UK" prefix if present: "UK 7" → "7", "7" → "7"
      normalizedSize = (size || "").replace(/^UK\s*/i, "").trim() || null;
    }
    // CRITICAL: For Beret, use EXACT match (no normalization)
    else if (type === "Beret") {
      // Keep exact size as-is: "6 3/4" must match "6 3/4" exactly
      normalizedSize = size || null;
    }
    // For other items (Uniform No 3, etc.), use as-is
    else {
      normalizedSize = size || null;
    }

    // Build query object
    const query = {
      category: category.trim(),
      type: type.trim()
    };

    // Add size to query
    if (normalizedSize !== null && normalizedSize !== undefined) {
      query.size = normalizedSize;
    } else {
      query.size = null;
    }

    // Try exact match first
    let inventoryItem = await Inventory.findOne(query);

    // If not found and it's a shoe/boot, try with "UK" prefix (for backward compatibility)
    if (!inventoryItem && (type === "PVC Shoes" || type === "Boot") && normalizedSize) {
      const queryWithUK = {
        category: category.trim(),
        type: type.trim(),
        size: `UK ${normalizedSize}`
      };
      inventoryItem = await Inventory.findOne(queryWithUK);
    }

    // CRITICAL: For Beret, DO NOT try alternative formats - if exact match fails, return 404
    if (!inventoryItem && type === "Beret") {
      console.log(`❌ Beret size not found - EXACT match required:`, {
        requestedSize: size,
        category: category,
        type: type,
        message: "Beret sizes must match exactly (e.g., '6 3/4' ≠ '6 5/8')"
      });
      return res.status(404).json({
        success: false,
        message: `Inventory item not found: ${type} size "${size}"`
      });
    }

    // If still not found (for non-Beret items), try original size
    if (!inventoryItem && size && type !== "Beret") {
      const queryOriginal = {
        category: category.trim(),
        type: type.trim(),
        size: size
      };
      inventoryItem = await Inventory.findOne(queryOriginal);
    }

    // If item not found, return 404
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // CRITICAL: PERMANENTLY DELETE the record (not soft delete, not set quantity to 0)
    const result = await Inventory.deleteOne({ _id: inventoryItem._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Success - item permanently deleted
    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory by attributes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  }
});

// ============================================
// DELETE BY ID (GENERIC ROUTE - MUST BE LAST)
// ============================================
router.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { id } = req.params;

    // Validate ID format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    // CRITICAL: PERMANENTLY DELETE the record
    const result = await Inventory.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Success - item permanently deleted
    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  }
});

module.exports = router;
```

---

### PostgreSQL Implementation

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Your database connection
const authenticateToken = require('../middleware/authenticateToken');

// ============================================
// DELETE BY ATTRIBUTES (SPECIFIC ROUTE - MUST BE FIRST)
// ============================================
router.delete('/api/inventory/by-attributes', authenticateToken, async (req, res) => {
  const client = await db.getClient();
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { category, type, size } = req.body;

    if (!category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Category and type are required'
      });
    }

    // CRITICAL: Size normalization for PVC Shoes and Boot
    let normalizedSize = size;
    if (type === "PVC Shoes" || type === "Boot") {
      // Remove "UK" prefix if present
      normalizedSize = (size || "").replace(/^UK\s*/i, "").trim() || null;
    }
    // CRITICAL: For Beret, use EXACT match (no normalization)
    else if (type === "Beret") {
      // Keep exact size as-is
      normalizedSize = size || null;
    }
    // For other items, use as-is
    else {
      normalizedSize = size || null;
    }

    // Try exact match first
    let inventoryResult = await client.query(
      `SELECT id, quantity FROM inventory 
       WHERE category = $1 AND type = $2 AND size = $3`,
      [category.trim(), type.trim(), normalizedSize || null]
    );

    // If not found and it's a shoe/boot, try with "UK" prefix
    if (inventoryResult.rows.length === 0 && (type === "PVC Shoes" || type === "Boot") && normalizedSize) {
      inventoryResult = await client.query(
        `SELECT id, quantity FROM inventory 
         WHERE category = $1 AND type = $2 AND size = $3`,
        [category.trim(), type.trim(), `UK ${normalizedSize}`]
      );
    }

    // CRITICAL: For Beret, DO NOT try alternative formats
    if (inventoryResult.rows.length === 0 && type === "Beret") {
      console.log(`❌ Beret size not found - EXACT match required:`, {
        requestedSize: size,
        category: category,
        type: type
      });
      return res.status(404).json({
        success: false,
        message: `Inventory item not found: ${type} size "${size}"`
      });
    }

    // If still not found (for non-Beret items), try original size
    if (inventoryResult.rows.length === 0 && size && type !== "Beret") {
      inventoryResult = await client.query(
        `SELECT id, quantity FROM inventory 
         WHERE category = $1 AND type = $2 AND size = $3`,
        [category.trim(), type.trim(), size]
      );
    }

    // If item not found, return 404
    if (inventoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const inventoryItem = inventoryResult.rows[0];

    // CRITICAL: PERMANENTLY DELETE the record
    await client.query(
      `DELETE FROM inventory WHERE id = $1`,
      [inventoryItem.id]
    );

    // Success - item permanently deleted
    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory by attributes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  } finally {
    client.release();
  }
});

// ============================================
// DELETE BY ID (GENERIC ROUTE - MUST BE LAST)
// ============================================
router.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  const client = await db.getClient();
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { id } = req.params;

    // Validate ID format (UUID or integer)
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    // Check if item exists
    const checkResult = await client.query(
      `SELECT id FROM inventory WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // CRITICAL: PERMANENTLY DELETE the record
    await client.query(
      `DELETE FROM inventory WHERE id = $1`,
      [id]
    );

    // Success - item permanently deleted
    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
```

---

### MySQL Implementation

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Your database connection
const authenticateToken = require('../middleware/authenticateToken');

// ============================================
// DELETE BY ATTRIBUTES (SPECIFIC ROUTE - MUST BE FIRST)
// ============================================
router.delete('/api/inventory/by-attributes', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { category, type, size } = req.body;

    if (!category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Category and type are required'
      });
    }

    // CRITICAL: Size normalization for PVC Shoes and Boot
    let normalizedSize = size;
    if (type === "PVC Shoes" || type === "Boot") {
      // Remove "UK" prefix if present
      normalizedSize = (size || "").replace(/^UK\s*/i, "").trim() || null;
    }
    // CRITICAL: For Beret, use EXACT match (no normalization)
    else if (type === "Beret") {
      // Keep exact size as-is
      normalizedSize = size || null;
    }
    // For other items, use as-is
    else {
      normalizedSize = size || null;
    }

    // Try exact match first
    let [inventoryRows] = await connection.query(
      `SELECT id, quantity FROM inventory 
       WHERE category = ? AND type = ? AND size = ?`,
      [category.trim(), type.trim(), normalizedSize || null]
    );

    // If not found and it's a shoe/boot, try with "UK" prefix
    if (inventoryRows.length === 0 && (type === "PVC Shoes" || type === "Boot") && normalizedSize) {
      [inventoryRows] = await connection.query(
        `SELECT id, quantity FROM inventory 
         WHERE category = ? AND type = ? AND size = ?`,
        [category.trim(), type.trim(), `UK ${normalizedSize}`]
      );
    }

    // CRITICAL: For Beret, DO NOT try alternative formats
    if (inventoryRows.length === 0 && type === "Beret") {
      console.log(`❌ Beret size not found - EXACT match required:`, {
        requestedSize: size,
        category: category,
        type: type
      });
      return res.status(404).json({
        success: false,
        message: `Inventory item not found: ${type} size "${size}"`
      });
    }

    // If still not found (for non-Beret items), try original size
    if (inventoryRows.length === 0 && size && type !== "Beret") {
      [inventoryRows] = await connection.query(
        `SELECT id, quantity FROM inventory 
         WHERE category = ? AND type = ? AND size = ?`,
        [category.trim(), type.trim(), size]
      );
    }

    // If item not found, return 404
    if (inventoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const inventoryItem = inventoryRows[0];

    // CRITICAL: PERMANENTLY DELETE the record
    await connection.query(
      `DELETE FROM inventory WHERE id = ?`,
      [inventoryItem.id]
    );

    // Success - item permanently deleted
    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory by attributes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  } finally {
    connection.release();
  }
});

// ============================================
// DELETE BY ID (GENERIC ROUTE - MUST BE LAST)
// ============================================
router.delete('/api/inventory/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { id } = req.params;

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    // Check if item exists
    const [checkRows] = await connection.query(
      `SELECT id FROM inventory WHERE id = ?`,
      [id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // CRITICAL: PERMANENTLY DELETE the record
    await connection.query(
      `DELETE FROM inventory WHERE id = ?`,
      [id]
    );

    // Success - item permanently deleted
    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
```

---

## 🔑 Key Features

### 1. Route Order (CRITICAL)
- `DELETE /api/inventory/by-attributes` must be defined **BEFORE** `DELETE /api/inventory/:id`
- This prevents "by-attributes" from being treated as an ID parameter

### 2. Size Normalization

**PVC Shoes and Boot:**
- Frontend may send: `"UK 7"`, `"UK7"`, or `"7"`
- Backend normalizes to: `"7"` (removes "UK" prefix)
- Tries both formats: `"7"` first, then `"UK 7"` if not found

**Beret (Fractional Sizes):**
- Frontend sends: `"6 3/4"` (exact string with space)
- Backend uses: **EXACT match only** (no normalization)
- **DO NOT** try alternative formats if exact match fails
- Returns 404 if exact match not found

**Uniform No 3 (XS, S, M, L, XL, 2XL, 3XL):**
- Frontend sends: `"XL"`, `"2XL"`, etc.
- Backend uses: Exact match (case-sensitive)

### 3. Permanent Deletion
- Uses `deleteOne()` (MongoDB) or `DELETE FROM` (SQL)
- **NOT** soft delete (setting `deleted: true`)
- **NOT** setting quantity to 0
- Record is **permanently removed** from database

### 4. Error Handling
- Returns 404 if item not found
- Returns 403 if user is not admin
- Returns 400 if required fields missing
- Returns 500 for server errors

---

## 📝 Request/Response Examples

### Delete by Attributes - PVC Shoes

**Request:**
```http
DELETE /api/inventory/by-attributes
Content-Type: application/json
Authorization: Bearer <token>

{
  "category": "Uniform No 3",
  "type": "PVC Shoes",
  "size": "UK 7"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

### Delete by Attributes - Beret

**Request:**
```http
DELETE /api/inventory/by-attributes
Content-Type: application/json
Authorization: Bearer <token>

{
  "category": "Uniform No 3",
  "type": "Beret",
  "size": "6 3/4"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

**Response (404 Not Found - if exact match fails):**
```json
{
  "success": false,
  "message": "Inventory item not found: Beret size \"6 3/4\""
}
```

### Delete by Attributes - Uniform No 3 Female

**Request:**
```http
DELETE /api/inventory/by-attributes
Content-Type: application/json
Authorization: Bearer <token>

{
  "category": "Uniform No 3",
  "type": "Uniform No 3 Female",
  "size": "XL"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

### Delete by ID

**Request:**
```http
DELETE /api/inventory/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

---

## ⚠️ Important Notes

### 1. Beret Size Matching (CRITICAL)
- **MUST** use exact string matching: `size = "6 3/4"` (not `LIKE '%6%3/4%'`)
- **DO NOT** normalize fractional sizes
- **DO NOT** convert to decimal (e.g., "6 3/4" ≠ 6.75)
- **DO NOT** try alternative formats if exact match fails
- If "6 3/4" is requested but only "6 5/8" exists, return 404 (don't deduct from wrong size)

### 2. PVC Shoes Size Matching
- Normalize by removing "UK" prefix: `"UK 7"` → `"7"`
- Try both formats: `"7"` first, then `"UK 7"` if not found
- This handles backward compatibility if database has mixed formats

### 3. Route Order
```javascript
// ✅ CORRECT ORDER
router.delete('/api/inventory/by-attributes', ...);  // Specific route first
router.delete('/api/inventory/:id', ...);            // Generic route last

// ❌ WRONG ORDER (will cause "by-attributes" to be treated as ID)
router.delete('/api/inventory/:id', ...);            // Generic route first
router.delete('/api/inventory/by-attributes', ...);   // Specific route last
```

### 4. Permanent Deletion
```javascript
// ✅ CORRECT - Permanent deletion
await Inventory.deleteOne({ _id: id });
// or
await client.query(`DELETE FROM inventory WHERE id = $1`, [id]);

// ❌ WRONG - Soft delete (record still exists)
await Inventory.updateOne({ _id: id }, { deleted: true });

// ❌ WRONG - Setting quantity to 0 (record still exists)
await Inventory.updateOne({ _id: id }, { quantity: 0 });
```

---

## 🧪 Testing

### Test Case 1: Delete PVC Shoes UK 7
```
1. Create inventory: "PVC Shoes" size "7" = 10
2. Call DELETE /api/inventory/by-attributes with:
   {
     "category": "Uniform No 3",
     "type": "PVC Shoes",
     "size": "UK 7"
   }
3. Expected: Item deleted, GET /api/inventory no longer returns this item
4. Verify: Database query shows item is gone
```

### Test Case 2: Delete Beret 6 3/4 (Exact Match)
```
1. Create inventory:
   - "Beret" size "6 3/4" = 10
   - "Beret" size "6 5/8" = 5
2. Call DELETE /api/inventory/by-attributes with:
   {
     "category": "Uniform No 3",
     "type": "Beret",
     "size": "6 3/4"
   }
3. Expected: Only "6 3/4" is deleted
4. Verify: "6 5/8" still exists with quantity 5
5. If "6 5/8" was deleted: Size matching is WRONG ❌
```

### Test Case 3: Delete Uniform No 3 Female XL
```
1. Create inventory: "Uniform No 3 Female" size "XL" = 10
2. Call DELETE /api/inventory/by-attributes with:
   {
     "category": "Uniform No 3",
     "type": "Uniform No 3 Female",
     "size": "XL"
   }
3. Expected: Item deleted
4. Verify: GET /api/inventory no longer returns this item
```

### Test Case 4: Delete by ID
```
1. Get inventory item ID (e.g., "507f1f77bcf86cd799439011")
2. Call DELETE /api/inventory/507f1f77bcf86cd799439011
3. Expected: Item deleted
4. Verify: GET /api/inventory/:id returns 404
```

---

## ✅ Implementation Checklist

- [ ] Add `DELETE /api/inventory/by-attributes` route (before `/:id` route)
- [ ] Add `DELETE /api/inventory/:id` route (after `by-attributes` route)
- [ ] Implement size normalization for PVC Shoes/Boot (remove "UK" prefix)
- [ ] Implement exact size matching for Beret (no normalization)
- [ ] Use permanent deletion (deleteOne/DELETE FROM, not soft delete)
- [ ] Add admin authentication check
- [ ] Add error handling (404, 403, 400, 500)
- [ ] Test PVC Shoes deletion with "UK 7" and "7"
- [ ] Test Beret deletion with exact match ("6 3/4" only matches "6 3/4")
- [ ] Test Uniform No 3 deletion with sizes (XS, S, M, L, XL, 2XL, 3XL)
- [ ] Verify deleted items don't reappear after page refresh

---

## 📞 Support

If you encounter issues:
1. Check route order (by-attributes before :id)
2. Verify size normalization logic for PVC Shoes
3. Verify exact matching for Beret (no LIKE queries)
4. Check database logs to see what query is executed
5. Verify permanent deletion (not soft delete or quantity = 0)

---

**Last Updated:** 2024
**Version:** 1.0
