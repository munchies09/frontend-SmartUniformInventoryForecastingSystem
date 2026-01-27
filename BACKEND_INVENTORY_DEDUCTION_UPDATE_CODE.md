# Backend Update Code: Inventory Deduction (Uniform No 3, PVC Shoes, Beret)

## 🎯 Overview

This document provides complete implementation code for **deducting inventory quantities** when users submit their uniform data. Special handling for:
- **Uniform No 3** (all sizes: XS, S, M, L, XL, 2XL, 3XL)
- **PVC Shoes** (sizes: 4-12, with UK prefix normalization)
- **Beret** (fractional sizes: 6 1/2, 6 5/8, 6 3/4, etc. - requires EXACT match)

**CRITICAL:** Inventory should be **DECREASED by 1** (not increased) when user submits with status "Available".

---

## 📋 API Endpoint

**Endpoint:** `PUT /api/members/uniform`

**Purpose:** Save user uniform data AND deduct inventory quantities for items with status "Available"

---

## 🔧 Implementation Code

### MongoDB Implementation

```javascript
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const MemberUniform = require('../models/MemberUniform');
const authenticateToken = require('../middleware/authenticateToken');

router.put('/api/members/uniform', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items } = req.body;
    const sispaId = req.user.sispaId || req.user.id; // From JWT token
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    // 1. Save/update uniform data
    const uniform = await MemberUniform.findOneAndUpdate(
      { sispaId },
      { 
        sispaId,
        items,
        updatedAt: new Date()
      },
      { upsert: true, new: true, session }
    );
    
    // 2. Deduct inventory ONLY for items with status "Available"
    for (const item of items) {
      // CRITICAL: Only deduct if status is "Available"
      if (item.status === "Available" || !item.status) {
        
        // CRITICAL: Size normalization depends on item type
        let normalizedSize = item.size;
        
        // For PVC Shoes and Boot: Remove "UK" prefix if present
        if (item.type === "PVC Shoes" || item.type === "Boot") {
          // Frontend sends "7" but might also send "UK 7" - normalize to "7"
          normalizedSize = (item.size || "").replace(/^UK\s*/i, "").trim() || null;
        }
        // For Beret: Use EXACT match (no normalization)
        else if (item.type === "Beret") {
          // Keep exact size as-is: "6 3/4" must match "6 3/4" exactly
          normalizedSize = item.size || null;
        }
        // For other items (Uniform No 3, etc.): Use as-is
        else {
          normalizedSize = item.size || null;
        }
        
        // Find matching inventory item - try exact match first
        let inventoryItem = await Inventory.findOne({
          category: item.category,
          type: item.type,
          size: normalizedSize || null
        }).session(session);
        
        // If not found and it's a shoe/boot, try with "UK" prefix (for backward compatibility)
        if (!inventoryItem && (item.type === "PVC Shoes" || item.type === "Boot") && normalizedSize) {
          inventoryItem = await Inventory.findOne({
            category: item.category,
            type: item.type,
            size: `UK ${normalizedSize}`
          }).session(session);
        }
        
        // CRITICAL: For Beret, DO NOT try alternative formats - if exact match fails, log error
        if (!inventoryItem && item.type === "Beret") {
          console.error(`❌ Beret size not found - EXACT match required:`, {
            requestedSize: item.size,
            category: item.category,
            type: item.type,
            message: "Beret sizes must match exactly (e.g., '6 3/4' ≠ '6 5/8')"
          });
          // Continue to next item - don't throw error, just log
          continue;
        }
        
        // If still not found (for non-Beret items), try the original size
        if (!inventoryItem && item.size && item.type !== "Beret") {
          inventoryItem = await Inventory.findOne({
            category: item.category,
            type: item.type,
            size: item.size
          }).session(session);
        }
        
        // If inventory item found, deduct quantity
        if (inventoryItem) {
          // CRITICAL: SUBTRACT 1, not add 1
          const newQuantity = Math.max(0, inventoryItem.quantity - 1);
          
          await Inventory.updateOne(
            { _id: inventoryItem._id },
            { 
              quantity: newQuantity,
              updatedAt: new Date()
            },
            { session }
          );
          
          console.log(`✅ Deducted inventory:`, {
            category: item.category,
            type: item.type,
            size: item.size,
            oldQuantity: inventoryItem.quantity,
            newQuantity: newQuantity
          });
        } else {
          // Item not found - log for debugging
          console.warn(`⚠️ Inventory item not found for deduction:`, {
            category: item.category,
            type: item.type,
            size: item.size,
            normalizedSize: normalizedSize
          });
        }
      }
      // If status is "Not Available" or "Missing", skip deduction
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: "Uniform data saved successfully",
      uniform
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error saving uniform:', error);
    res.status(500).json({
      success: false,
      message: "Failed to save uniform data"
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;
```

---

### PostgreSQL Implementation

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/authenticateToken');

router.put('/api/members/uniform', authenticateToken, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { items } = req.body;
    const sispaId = req.user.sispaId || req.user.id;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    // 1. Save/update uniform data
    await client.query(
      `INSERT INTO member_uniforms (sispa_id, items, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (sispa_id) 
       DO UPDATE SET items = $2, updated_at = NOW()`,
      [sispaId, JSON.stringify(items)]
    );
    
    // 2. Deduct inventory ONLY for items with status "Available"
    for (const item of items) {
      // CRITICAL: Only deduct if status is "Available"
      if (item.status === "Available" || !item.status) {
        
        // CRITICAL: Size normalization depends on item type
        let normalizedSize = item.size;
        
        // For PVC Shoes and Boot: Remove "UK" prefix if present
        if (item.type === "PVC Shoes" || item.type === "Boot") {
          normalizedSize = (item.size || "").replace(/^UK\s*/i, "").trim() || null;
        }
        // For Beret: Use EXACT match (no normalization)
        else if (item.type === "Beret") {
          normalizedSize = item.size || null; // Keep exact: "6 3/4" must match "6 3/4"
        }
        // For other items: Use as-is
        else {
          normalizedSize = item.size || null;
        }
        
        // Find matching inventory item - try exact match first
        let inventoryResult = await client.query(
          `SELECT id, quantity FROM inventory 
           WHERE category = $1 AND type = $2 AND size = $3`,
          [item.category, item.type, normalizedSize || null]
        );
        
        // If not found and it's a shoe/boot, try with "UK" prefix
        if (inventoryResult.rows.length === 0 && (item.type === "PVC Shoes" || item.type === "Boot") && normalizedSize) {
          inventoryResult = await client.query(
            `SELECT id, quantity FROM inventory 
             WHERE category = $1 AND type = $2 AND size = $3`,
            [item.category, item.type, `UK ${normalizedSize}`]
          );
        }
        
        // CRITICAL: For Beret, DO NOT try alternative formats
        if (inventoryResult.rows.length === 0 && item.type === "Beret") {
          console.error(`❌ Beret size not found - EXACT match required:`, {
            requestedSize: item.size,
            category: item.category,
            type: item.type
          });
          continue; // Skip to next item
        }
        
        // If still not found (for non-Beret items), try original size
        if (inventoryResult.rows.length === 0 && item.size && item.type !== "Beret") {
          inventoryResult = await client.query(
            `SELECT id, quantity FROM inventory 
             WHERE category = $1 AND type = $2 AND size = $3`,
            [item.category, item.type, item.size]
          );
        }
        
        // If inventory item found, deduct quantity
        if (inventoryResult.rows.length > 0) {
          const inventoryItem = inventoryResult.rows[0];
          
          // CRITICAL: SUBTRACT 1, not add 1
          const newQuantity = Math.max(0, inventoryItem.quantity - 1);
          
          await client.query(
            `UPDATE inventory 
             SET quantity = $1, updated_at = NOW()
             WHERE id = $2`,
            [newQuantity, inventoryItem.id]
          );
          
          console.log(`✅ Deducted inventory:`, {
            category: item.category,
            type: item.type,
            size: item.size,
            oldQuantity: inventoryItem.quantity,
            newQuantity: newQuantity
          });
        } else {
          console.warn(`⚠️ Inventory item not found for deduction:`, {
            category: item.category,
            type: item.type,
            size: item.size
          });
        }
      }
      // If status is "Not Available" or "Missing", skip deduction
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      success: true,
      message: "Uniform data saved successfully"
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving uniform:', error);
    res.status(500).json({
      success: false,
      message: "Failed to save uniform data"
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
const db = require('../config/database');
const authenticateToken = require('../middleware/authenticateToken');

router.put('/api/members/uniform', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { items } = req.body;
    const sispaId = req.user.sispaId || req.user.id;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    // 1. Save/update uniform data
    await connection.query(
      `INSERT INTO member_uniforms (sispa_id, items, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE items = ?, updated_at = NOW()`,
      [sispaId, JSON.stringify(items), JSON.stringify(items)]
    );
    
    // 2. Deduct inventory ONLY for items with status "Available"
    for (const item of items) {
      // CRITICAL: Only deduct if status is "Available"
      if (item.status === "Available" || !item.status) {
        
        // CRITICAL: Size normalization depends on item type
        let normalizedSize = item.size;
        
        // For PVC Shoes and Boot: Remove "UK" prefix if present
        if (item.type === "PVC Shoes" || item.type === "Boot") {
          normalizedSize = (item.size || "").replace(/^UK\s*/i, "").trim() || null;
        }
        // For Beret: Use EXACT match (no normalization)
        else if (item.type === "Beret") {
          normalizedSize = item.size || null; // Keep exact: "6 3/4" must match "6 3/4"
        }
        // For other items: Use as-is
        else {
          normalizedSize = item.size || null;
        }
        
        // Find matching inventory item - try exact match first
        let [inventoryRows] = await connection.query(
          `SELECT id, quantity FROM inventory 
           WHERE category = ? AND type = ? AND size = ?`,
          [item.category, item.type, normalizedSize || null]
        );
        
        // If not found and it's a shoe/boot, try with "UK" prefix
        if (inventoryRows.length === 0 && (item.type === "PVC Shoes" || item.type === "Boot") && normalizedSize) {
          [inventoryRows] = await connection.query(
            `SELECT id, quantity FROM inventory 
             WHERE category = ? AND type = ? AND size = ?`,
            [item.category, item.type, `UK ${normalizedSize}`]
          );
        }
        
        // CRITICAL: For Beret, DO NOT try alternative formats
        if (inventoryRows.length === 0 && item.type === "Beret") {
          console.error(`❌ Beret size not found - EXACT match required:`, {
            requestedSize: item.size,
            category: item.category,
            type: item.type
          });
          continue; // Skip to next item
        }
        
        // If still not found (for non-Beret items), try original size
        if (inventoryRows.length === 0 && item.size && item.type !== "Beret") {
          [inventoryRows] = await connection.query(
            `SELECT id, quantity FROM inventory 
             WHERE category = ? AND type = ? AND size = ?`,
            [item.category, item.type, item.size]
          );
        }
        
        // If inventory item found, deduct quantity
        if (inventoryRows.length > 0) {
          const inventoryItem = inventoryRows[0];
          
          // CRITICAL: SUBTRACT 1, not add 1
          const newQuantity = Math.max(0, inventoryItem.quantity - 1);
          
          await connection.query(
            `UPDATE inventory 
             SET quantity = ?, updated_at = NOW()
             WHERE id = ?`,
            [newQuantity, inventoryItem.id]
          );
          
          console.log(`✅ Deducted inventory:`, {
            category: item.category,
            type: item.type,
            size: item.size,
            oldQuantity: inventoryItem.quantity,
            newQuantity: newQuantity
          });
        } else {
          console.warn(`⚠️ Inventory item not found for deduction:`, {
            category: item.category,
            type: item.type,
            size: item.size
          });
        }
      }
      // If status is "Not Available" or "Missing", skip deduction
    }
    
    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: "Uniform data saved successfully"
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving uniform:', error);
    res.status(500).json({
      success: false,
      message: "Failed to save uniform data"
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
```

---

## 🔑 Key Features

### 1. Status Check (CRITICAL)
- **ONLY deduct** if `status === "Available"` or `status` is `undefined`/`null`
- **DO NOT deduct** if `status === "Not Available"` or `status === "Missing"`
- Still save uniform data even if status is "Not Available" (for tracking)

### 2. Size Normalization

**PVC Shoes and Boot:**
- Frontend sends: `"UK 7"`, `"UK7"`, or `"7"`
- Backend normalizes to: `"7"` (removes "UK" prefix)
- Tries both formats: `"7"` first, then `"UK 7"` if not found

**Beret (Fractional Sizes):**
- Frontend sends: `"6 3/4"` (exact string with space)
- Backend uses: **EXACT match only** (no normalization)
- **DO NOT** try alternative formats if exact match fails
- Logs error if exact match not found (but continues processing other items)

**Uniform No 3 (XS, S, M, L, XL, 2XL, 3XL):**
- Frontend sends: `"XL"`, `"2XL"`, etc.
- Backend uses: Exact match (case-sensitive)

### 3. Quantity Deduction (CRITICAL)
- **SUBTRACT 1**: `newQuantity = currentQuantity - 1`
- **NOT ADD 1**: `newQuantity = currentQuantity + 1` ❌
- Ensure quantity doesn't go below 0: `Math.max(0, newQuantity)`

### 4. Transaction Safety
- Uses database transactions to ensure atomicity
- If uniform save fails, don't deduct inventory
- If inventory deduction fails, rollback uniform save
- All operations succeed or all fail together

---

## 📝 Request/Response Examples

### User Submits Uniform No 3 Female XL (Available)

**Request:**
```http
PUT /api/members/uniform
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Uniform No 3 Female",
      "size": "XL",
      "quantity": 1,
      "status": "Available"
    }
  ]
}
```

**Backend Action:**
1. Saves uniform data to database
2. Finds inventory: `category="Uniform No 3"`, `type="Uniform No 3 Female"`, `size="XL"`
3. Deducts 1 from quantity: `10 → 9`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Uniform data saved successfully",
  "uniform": { ... }
}
```

### User Submits PVC Shoes UK 7 (Available)

**Request:**
```http
PUT /api/members/uniform
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "PVC Shoes",
      "size": "UK 7",
      "quantity": 1,
      "status": "Available"
    }
  ]
}
```

**Backend Action:**
1. Saves uniform data
2. Normalizes size: `"UK 7"` → `"7"`
3. Finds inventory: `category="Uniform No 3"`, `type="PVC Shoes"`, `size="7"`
4. If not found, tries: `size="UK 7"`
5. Deducts 1 from quantity: `10 → 9`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Uniform data saved successfully"
}
```

### User Submits Beret 6 3/4 (Available)

**Request:**
```http
PUT /api/members/uniform
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Beret",
      "size": "6 3/4",
      "quantity": 1,
      "status": "Available"
    }
  ]
}
```

**Backend Action:**
1. Saves uniform data
2. Uses exact size: `"6 3/4"` (no normalization)
3. Finds inventory: `category="Uniform No 3"`, `type="Beret"`, `size="6 3/4"` (EXACT match)
4. Deducts 1 from quantity: `10 → 9`
5. **If "6 3/4" not found but "6 5/8" exists:** Logs error, does NOT deduct from "6 5/8"

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Uniform data saved successfully"
}
```

### User Submits with Status "Not Available"

**Request:**
```http
PUT /api/members/uniform
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Uniform No 3 Female",
      "size": "XL",
      "quantity": 1,
      "status": "Not Available"
    }
  ]
}
```

**Backend Action:**
1. Saves uniform data (with "Not Available" status)
2. **SKIPS inventory deduction** (status is "Not Available")
3. Inventory quantity stays unchanged

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Uniform data saved successfully"
}
```

---

## ⚠️ Critical Bugs to Avoid

### Bug 1: Adding Instead of Subtracting

```javascript
// ❌ WRONG - This ADDS instead of SUBTRACTS
const newQuantity = inventoryItem.quantity + 1;

// ✅ CORRECT - This SUBTRACTS
const newQuantity = Math.max(0, inventoryItem.quantity - 1);
```

### Bug 2: Using $inc with Positive Value (MongoDB)

```javascript
// ❌ WRONG - This ADDS 1
await Inventory.updateOne(
  { _id: inventoryItem._id },
  { $inc: { quantity: 1 } }
);

// ✅ CORRECT - This SUBTRACTS 1
await Inventory.updateOne(
  { _id: inventoryItem._id },
  { $inc: { quantity: -1 } }
);
```

### Bug 3: Approximate Matching for Beret

```javascript
// ❌ WRONG - Using LIKE (approximate match)
const inventoryItem = await Inventory.findOne({
  category: item.category,
  type: item.type,
  size: { $regex: item.size }  // ❌ Might match "6 5/8" when searching for "6 3/4"
});

// ✅ CORRECT - Exact match
const inventoryItem = await Inventory.findOne({
  category: item.category,
  type: item.type,
  size: item.size  // ✅ Exact match: "6 3/4" only matches "6 3/4"
});
```

### Bug 4: Deducting When Status is "Not Available"

```javascript
// ❌ WRONG - Deducts even when "Not Available"
for (const item of items) {
  deductInventory(item);  // ❌ Always deducts
}

// ✅ CORRECT - Only deducts when "Available"
for (const item of items) {
  if (item.status === "Available" || !item.status) {
    deductInventory(item);  // ✅ Only deducts when available
  }
}
```

---

## 🧪 Testing

### Test Case 1: Deduct Uniform No 3 Female XL
```
1. Set inventory: "Uniform No 3 Female" size "XL" = 10
2. User submits: "Uniform No 3 Female" size "XL" status "Available"
3. Expected: Inventory becomes 9 (10 - 1)
4. Verify: Check database, quantity should be 9
```

### Test Case 2: Deduct PVC Shoes UK 7
```
1. Set inventory: "PVC Shoes" size "7" = 10
2. User submits: "PVC Shoes" size "UK 7" status "Available"
3. Expected: Inventory becomes 9 (10 - 1)
4. Verify: Check database, quantity should be 9
```

### Test Case 3: Deduct Beret 6 3/4 (Exact Match)
```
1. Set inventory:
   - "Beret" size "6 3/4" = 10
   - "Beret" size "6 5/8" = 5
2. User submits: "Beret" size "6 3/4" status "Available"
3. Expected: 
   - "6 3/4" becomes 9 (10 - 1) ✅
   - "6 5/8" stays 5 (no change) ✅
4. Verify: 
   - "6 3/4" quantity should be 9
   - "6 5/8" quantity should still be 5
5. If "6 5/8" changed: Size matching is WRONG ❌
```

### Test Case 4: Don't Deduct When "Not Available"
```
1. Set inventory: "Uniform No 3 Female" size "XL" = 10
2. User submits: "Uniform No 3 Female" size "XL" status "Not Available"
3. Expected: Inventory stays 10 (no change)
4. Verify: Check database, quantity should still be 10
```

### Test Case 5: Don't Go Below Zero
```
1. Set inventory: "Uniform No 3 Female" size "XL" = 0
2. User submits: "Uniform No 3 Female" size "XL" status "Available"
3. Expected: Inventory stays 0 (doesn't go negative)
4. Verify: Check database, quantity should be 0
```

---

## ✅ Implementation Checklist

- [ ] Update PUT /api/members/uniform endpoint
- [ ] Add status check: only deduct if `status === "Available"`
- [ ] Implement size normalization for PVC Shoes/Boot (remove "UK" prefix)
- [ ] Implement exact size matching for Beret (no normalization)
- [ ] Use SUBTRACTION: `quantity - 1` (not `quantity + 1`)
- [ ] Use `Math.max(0, newQuantity)` to prevent negative quantities
- [ ] Use database transactions for atomicity
- [ ] Add logging for successful deductions
- [ ] Add warning logs when inventory item not found
- [ ] Test Uniform No 3 Female deduction
- [ ] Test PVC Shoes deduction with "UK 7" and "7"
- [ ] Test Beret deduction with exact match ("6 3/4" only matches "6 3/4")
- [ ] Test "Not Available" status (should not deduct)
- [ ] Test quantity doesn't go below 0

---

## 📞 Support

If you encounter issues:
1. Check if deduction is using subtraction (not addition)
2. Verify status check: only deduct when "Available"
3. Check size normalization for PVC Shoes
4. Verify exact matching for Beret (no LIKE queries)
5. Check database logs to see what query is executed
6. Verify transaction is working (all or nothing)

---

**Last Updated:** 2024
**Version:** 1.0
