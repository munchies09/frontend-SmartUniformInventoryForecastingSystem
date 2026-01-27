# Backend Bug Fix: Inventory Deduction Adding Instead of Subtracting

## 🐛 CRITICAL BUG - STILL OCCURRING

**Problem:** When a user submits their uniform data in the user UI, the inventory is being **INCREASED by 1** instead of **DECREASED by 1**.

**Current Status:** ⚠️ **BUG STILL EXISTS** - User reported on "Uniform No 3 Female" that inventory is adding +1 instead of deducting -1.

**Example:**
- Initial inventory: "Uniform No 3 Female" size "XL" = 10
- User submits uniform with size "XL" and status "Available"
- **Expected:** Inventory should become 9 (10 - 1)
- **Actual:** Inventory becomes 11 (10 + 1) ❌

**Affected Items:**
- "Uniform No 3 Female" (confirmed by user)
- Likely affects ALL uniform types when status is "Available"

---

## ✅ CORRECT BEHAVIOR

### When User Submits Uniform Data

1. **Check Status:**
   - **ONLY deduct inventory if `status === "Available"`**
   - **DO NOT deduct if `status === "Not Available"`**
   - **DO NOT deduct if `status === "Missing"`**

2. **Deduction Logic:**
   - Find the matching inventory item by: `category`, `type`, and `size`
   - **SUBTRACT 1** from the quantity: `newQuantity = currentQuantity - 1`
   - Ensure quantity doesn't go below 0: `newQuantity = Math.max(0, newQuantity)`
   - Update the inventory item

3. **Example:**
   ```
   User submits:
   - Uniform No 3 Female, Size: XL, Status: "Available"
   
   Backend should:
   - Find inventory: category="Uniform No 3", type="Uniform No 3 Female", size="XL"
   - Current quantity: 10
   - NEW quantity: 10 - 1 = 9 ✅
   - Update inventory: quantity = 9
   ```

---

## ❌ CURRENT BUG - ROOT CAUSE

The backend is likely doing one of these WRONG operations:

### Wrong Implementation 1: Addition Instead of Subtraction
```javascript
// ❌ WRONG - This ADDS instead of SUBTRACTS
newQuantity = currentQuantity + 1;  // ❌ WRONG!
```

### Wrong Implementation 2: Using $inc with Positive Value
```javascript
// ❌ WRONG - MongoDB $inc with +1 adds instead of subtracts
await Inventory.updateOne(
  { _id: inventoryItem._id },
  { $inc: { quantity: 1 } }  // ❌ WRONG - This ADDS 1
);
```

### Wrong Implementation 3: Wrong Sign in SQL
```javascript
// ❌ WRONG - SQL UPDATE with addition
await client.query(
  `UPDATE inventory SET quantity = quantity + 1 WHERE id = $1`,
  [inventoryItem.id]  // ❌ WRONG - This ADDS 1
);
```

**CORRECT Implementation:**
```javascript
// ✅ CORRECT - This SUBTRACTS
newQuantity = currentQuantity - 1;  // ✅ CORRECT!

// ✅ CORRECT - MongoDB $inc with -1 subtracts
await Inventory.updateOne(
  { _id: inventoryItem._id },
  { $inc: { quantity: -1 } }  // ✅ CORRECT - This SUBTRACTS 1
);

// ✅ CORRECT - SQL UPDATE with subtraction
await client.query(
  `UPDATE inventory SET quantity = quantity - 1 WHERE id = $1`,
  [inventoryItem.id]  // ✅ CORRECT - This SUBTRACTS 1
);
```

---

## 🔧 REQUIRED FIX

### Update PUT /api/members/uniform Endpoint

**Command:**
```
Fix the inventory deduction logic in PUT /api/members/uniform endpoint:

1. After saving uniform data, iterate through each item in uniform.items array

2. For EACH item, check the status:
   - If status === "Available" OR status is undefined/null:
     * Find matching inventory item by category, type, and size
     * DEDUCT 1 from quantity: newQuantity = currentQuantity - 1
     * Ensure quantity >= 0: newQuantity = Math.max(0, newQuantity)
     * Update inventory item
   
   - If status === "Not Available" OR status === "Missing":
     * DO NOT deduct inventory
     * Still save the uniform item (for tracking purposes)

3. Use database transaction to ensure atomicity:
   - All deductions happen together
   - If any deduction fails, rollback entire transaction

4. CRITICAL: Use SUBTRACTION, not addition:
   - ✅ CORRECT: quantity = quantity - 1
   - ❌ WRONG: quantity = quantity + 1
```

---

## 📝 Implementation Example

### MongoDB Example

```javascript
router.put('/api/members/uniform', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items } = req.body;
    const sispaId = req.user.sispaId; // From JWT token
    
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
          
          // For shoes/boots: Remove "UK" prefix if present
          if (item.type === "PVC Shoes" || item.type === "Boot") {
            normalizedSize = (item.size || "").replace(/^UK\s*/i, "").trim() || null;
          }
          // For Beret and other fractional sizes: Use EXACT match (no normalization)
          // DO NOT trim, normalize, or modify fractional sizes like "6 3/4"
          else if (item.type === "Beret") {
            // Keep exact size as-is (e.g., "6 3/4" must match "6 3/4" exactly)
            normalizedSize = item.size || null;
          }
          // For other items: Use as-is
          else {
            normalizedSize = item.size || null;
          }
          
          // Find matching inventory item
          // CRITICAL: Use EXACT match for all sizes (especially Beret fractional sizes)
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
          }
          
          // If still not found (for non-Beret items), try the original size
          if (!inventoryItem && item.size && item.type !== "Beret") {
            inventoryItem = await Inventory.findOne({
              category: item.category,
              type: item.type,
              size: item.size
            }).session(session);
          }
        
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
        } else {
          // Item not found - log for debugging
          console.warn(`Inventory item not found for deduction:`, {
            category: item.category,
            type: item.type,
            size: item.size
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
```

### PostgreSQL Example

```javascript
router.put('/api/members/uniform', authenticateToken, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { items } = req.body;
    const sispaId = req.user.sispaId;
    
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
        
        // For shoes/boots: Remove "UK" prefix if present
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
        
        // Find matching inventory item - CRITICAL: Use EXACT match (= not LIKE)
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
        
        // CRITICAL: For Beret, DO NOT try alternative formats - log error if not found
        if (inventoryResult.rows.length === 0 && item.type === "Beret") {
          console.error(`❌ Beret size not found - EXACT match required:`, {
            requestedSize: item.size,
            category: item.category,
            type: item.type,
            message: "Beret sizes must match exactly (e.g., '6 3/4' ≠ '6 5/8')"
          });
        }
        
        // If still not found (for non-Beret items), try original size
        if (inventoryResult.rows.length === 0 && item.size && item.type !== "Beret") {
          inventoryResult = await client.query(
            `SELECT id, quantity FROM inventory 
             WHERE category = $1 AND type = $2 AND size = $3`,
            [item.category, item.type, item.size]
          );
        }
        
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
```

### MySQL Example

```javascript
router.put('/api/members/uniform', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { items } = req.body;
    const sispaId = req.user.sispaId;
    
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
        
        // For shoes/boots: Remove "UK" prefix if present
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
        
        // Find matching inventory item - CRITICAL: Use EXACT match (= not LIKE)
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
        
        // CRITICAL: For Beret, DO NOT try alternative formats - log error if not found
        if (inventoryRows.length === 0 && item.type === "Beret") {
          console.error(`❌ Beret size not found - EXACT match required:`, {
            requestedSize: item.size,
            category: item.category,
            type: item.type,
            message: "Beret sizes must match exactly (e.g., '6 3/4' ≠ '6 5/8')"
          });
        }
        
        // If still not found (for non-Beret items), try original size
        if (inventoryRows.length === 0 && item.size && item.type !== "Beret") {
          [inventoryRows] = await connection.query(
            `SELECT id, quantity FROM inventory 
             WHERE category = ? AND type = ? AND size = ?`,
            [item.category, item.type, item.size]
          );
        }
        
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
```

---

## 🔍 Debugging Checklist

Check your backend code for:

- [ ] **Sign Error:** Look for `quantity + 1` - should be `quantity - 1`
- [ ] **Status Check:** Verify deduction only happens when `status === "Available"`
- [ ] **Type Matching:** Ensure "Uniform No 3 Female" matches correctly (not "Pants No 3")
- [ ] **Size Matching:** Ensure size "XL" matches exactly (case-sensitive)
- [ ] **Category Matching:** Ensure "Uniform No 3" matches exactly

---

## 📋 Common Mistakes to Avoid

1. **Wrong Operation:**
   ```javascript
   // ❌ WRONG
   quantity = quantity + 1;
   
   // ✅ CORRECT
   quantity = quantity - 1;
   ```

2. **Missing Status Check:**
   ```javascript
   // ❌ WRONG - Deducts even when "Not Available"
   for (const item of items) {
     deductInventory(item);
   }
   
   // ✅ CORRECT - Only deducts when "Available"
   for (const item of items) {
     if (item.status === "Available" || !item.status) {
       deductInventory(item);
     }
   }
   ```

3. **Type Name Mismatch:**
   ```javascript
   // ❌ WRONG - Old type name
   type: "Pants No 3"
   
   // ✅ CORRECT - New type name
   type: "Uniform No 3 Female"
   ```

---

## 🧪 Testing

### Test Case 1: Deduct When Available
```
1. Set inventory: "Uniform No 3 Female" size "XL" = 10
2. User submits: "Uniform No 3 Female" size "XL" status "Available"
3. Expected: Inventory becomes 9
4. Verify: Check database, quantity should be 9
```

### Test Case 2: Don't Deduct When Not Available
```
1. Set inventory: "Uniform No 3 Female" size "XL" = 10
2. User submits: "Uniform No 3 Female" size "XL" status "Not Available"
3. Expected: Inventory stays 10 (no change)
4. Verify: Check database, quantity should still be 10
```

### Test Case 3: Don't Go Below Zero
```
1. Set inventory: "Uniform No 3 Female" size "XL" = 0
2. User submits: "Uniform No 3 Female" size "XL" status "Available"
3. Expected: Inventory stays 0 (doesn't go negative)
4. Verify: Check database, quantity should be 0
```

---

## 📝 Frontend Status Values

The frontend sends these status values:
- `"Available"` - Item is available, inventory should be deducted
- `"Not Available"` - Item is not available, inventory should NOT be deducted
- `"Missing"` - Item is missing, inventory should NOT be deducted
- `undefined` or `null` - Treat as "Available" (deduct inventory)

---

## 🔍 CRITICAL: Size Matching Issues

### Issue 1: PVC Shoes/Boot Size Matching

### Issue 2: Beret Fractional Size Matching (EXACT MATCH REQUIRED)

**Problem:** When user submits Beret size "6 3/4", inventory deducts from wrong size "6 5/8".

**Root Cause:** 
- Backend is using approximate matching, LIKE queries, or fuzzy matching
- Backend might be trimming/normalizing fractional sizes incorrectly
- Backend might be finding "first match" instead of "exact match"

**CRITICAL Requirements:**
1. **EXACT string matching** for Beret sizes (case-sensitive, space-sensitive)
2. **DO NOT** use LIKE, CONTAINS, or fuzzy matching
3. **DO NOT** normalize, trim, or modify fractional sizes
4. **DO NOT** try alternative formats if exact match fails

**Example:**
- Frontend sends: `size: "6 3/4"` (with space between "6" and "3/4")
- Backend must find: `size: "6 3/4"` (exact match)
- **WRONG:** Finding `size: "6 5/8"` (different fraction)
- **WRONG:** Using `LIKE '%6%3/4%'` (approximate match)
- **WRONG:** Normalizing to `"6.75"` (converting fraction)

**Correct Implementation:**
```javascript
// ✅ CORRECT - Exact match for Beret
if (item.type === "Beret") {
  // Use exact size as-is, no normalization
  const inventoryItem = await Inventory.findOne({
    category: item.category,
    type: item.type,
    size: item.size  // Exact match: "6 3/4" must match "6 3/4"
  });
  
  if (!inventoryItem) {
    console.error(`❌ Beret size not found: "${item.size}"`);
    // DO NOT try alternative formats - log error instead
  }
}
```

**Wrong Implementations to Avoid:**
```javascript
// ❌ WRONG - Using LIKE (approximate match)
const inventoryItem = await Inventory.findOne({
  category: item.category,
  type: item.type,
  size: { $regex: item.size }  // ❌ WRONG - This might match "6 5/8" too
});

// ❌ WRONG - Normalizing fractional sizes
const normalizedSize = item.size.replace(/\s+/g, "");  // "6 3/4" → "63/4" ❌
const inventoryItem = await Inventory.findOne({
  size: normalizedSize  // ❌ WRONG - Won't match database
});

// ❌ WRONG - Converting to decimal
const decimalSize = parseFloat(item.size);  // "6 3/4" → NaN ❌
const inventoryItem = await Inventory.findOne({
  size: decimalSize  // ❌ WRONG
});

// ❌ WRONG - Finding "closest match"
const allBerets = await Inventory.find({ type: "Beret" });
const inventoryItem = allBerets.find(b => b.size.includes(item.size));  // ❌ WRONG
```

**SQL Examples:**
```sql
-- ✅ CORRECT - Exact match
SELECT * FROM inventory 
WHERE category = 'Uniform No 3' 
  AND type = 'Beret' 
  AND size = '6 3/4';  -- Exact match

-- ❌ WRONG - LIKE query (approximate)
SELECT * FROM inventory 
WHERE category = 'Uniform No 3' 
  AND type = 'Beret' 
  AND size LIKE '%6%3/4%';  -- ❌ WRONG - Might match "6 5/8" too

-- ❌ WRONG - Case-insensitive (fractions are case-sensitive)
SELECT * FROM inventory 
WHERE category = 'Uniform No 3' 
  AND type = 'Beret' 
  AND LOWER(size) = LOWER('6 3/4');  -- ❌ WRONG - Unnecessary for numbers
```

---

## 🔍 CRITICAL: Size Matching for PVC Shoes and Boot

### Problem: PVC Shoes/Boot Sizes Not Matching

**Issue:** When user submits PVC Shoes size "UK 7", inventory is not deducted because size matching fails.

**Root Cause:** 
- Frontend sends: `size: "7"` (without "UK" prefix)
- Backend might store: `size: "7"` or `size: "UK 7"` (inconsistent)
- Backend search: Only tries exact match, doesn't handle normalization

### Solution: Normalize and Try Multiple Formats

**CRITICAL:** When deducting inventory for PVC Shoes or Boot:

1. **Normalize the size** from the request:
   ```javascript
   let normalizedSize = item.size;
   if (item.type === "PVC Shoes" || item.type === "Boot") {
     // Remove "UK" prefix if present: "UK 7" → "7", "7" → "7"
     normalizedSize = (item.size || "").replace(/^UK\s*/i, "").trim() || null;
   }
   ```

2. **Try multiple search formats:**
   - First: Try normalized size (e.g., "7")
   - Second: Try with "UK" prefix (e.g., "UK 7") - for backward compatibility
   - Third: Try original size (in case of other formats)

3. **Example Implementation:**
   ```javascript
   // Normalize size
   let normalizedSize = item.size;
   if (item.type === "PVC Shoes" || item.type === "Boot") {
     normalizedSize = (item.size || "").replace(/^UK\s*/i, "").trim() || null;
   }
   
   // Try normalized size first (most common)
   let inventoryItem = await Inventory.findOne({
     category: item.category,
     type: item.type,
     size: normalizedSize || null
   });
   
   // If not found and it's a shoe/boot, try with "UK" prefix
   if (!inventoryItem && (item.type === "PVC Shoes" || item.type === "Boot") && normalizedSize) {
     inventoryItem = await Inventory.findOne({
       category: item.category,
       type: item.type,
       size: `UK ${normalizedSize}`
     });
   }
   
   // If still not found, try original size
   if (!inventoryItem && item.size) {
     inventoryItem = await Inventory.findOne({
       category: item.category,
       type: item.type,
       size: item.size
     });
   }
   ```

### Frontend Size Format

**What Frontend Sends:**
- PVC Shoes: `size: "7"` (without "UK" prefix) ✅
- Boot: `size: "7"` (without "UK" prefix) ✅
- Beret: `size: "6 3/4"` (exact fractional size) ✅
- Other items: `size: "XL"`, `size: "6 7/8"`, etc.

**CRITICAL: Beret Sizes Must Match EXACTLY**
- Frontend sends: `"6 3/4"` (with space between number and fraction)
- Backend must match: `"6 3/4"` exactly (case-sensitive, space-sensitive)
- **DO NOT** use approximate matching, LIKE queries, or fuzzy matching for Beret
- **DO NOT** normalize or trim fractional sizes

**Backend Should Accept:**
- `"7"` ✅
- `"UK 7"` ✅ (normalize to "7" for storage)
- `"UK7"` ✅ (normalize to "7" for storage)

**Backend Should Store:**
- Recommended: Store without "UK" prefix (e.g., "7")
- Or: Store consistently with "UK" prefix (e.g., "UK 7")
- **Important:** Be consistent across all inventory items

### Debugging: PVC Shoes Not Deducting

If PVC Shoes inventory is not deducting:

1. **Check what frontend sends:**
   - Open browser DevTools → Network tab
   - Find PUT /api/members/uniform request
   - Check request body: `{ category: "Uniform No 3", type: "PVC Shoes", size: "7", ... }`
   - Verify size is "7" (not "UK 7")

2. **Check what backend stores:**
   ```javascript
   // MongoDB
   db.inventory.find({ 
     category: "Uniform No 3", 
     type: "PVC Shoes" 
   }).forEach(item => {
     print(`Size in DB: "${item.size}"`);
   });
   ```

3. **Check backend logs:**
   - Add logging when searching for inventory:
   ```javascript
   console.log(`Searching for inventory:`, {
     category: item.category,
     type: item.type,
     size: normalizedSize,
     originalSize: item.size
   });
   ```

4. **Verify size matching:**
   - If frontend sends "7" but backend stores "UK 7", the match will fail
   - Solution: Normalize and try both formats (see code above)

---

## 🧪 Testing: PVC Shoes Deduction

### Test Case: PVC Shoes UK 7
```
1. Set inventory: "PVC Shoes" size "7" = 10
   (or "UK 7" if backend stores with prefix)

2. User submits: 
   - category: "Uniform No 3"
   - type: "PVC Shoes"
   - size: "7" (frontend sends without "UK")
   - status: "Available"

3. Expected: Inventory becomes 9 (10 - 1)

4. Verify:
   - Check database: quantity should be 9
   - Check backend logs: should show successful deduction
   - If quantity stays 10: Size matching failed ❌
```

### Test Case: Boot UK 7
```
1. Set inventory: "Boot" size "7" = 10

2. User submits:
   - category: "Uniform No 4"
   - type: "Boot"
   - size: "7"
   - status: "Available"

3. Expected: Inventory becomes 9

4. Verify: Check database, quantity should be 9
```

### Test Case: Beret Size 6 3/4 (CRITICAL - EXACT MATCH)
```
1. Set inventory: 
   - "Beret" size "6 3/4" = 10
   - "Beret" size "6 5/8" = 5

2. User submits:
   - category: "Uniform No 3"
   - type: "Beret"
   - size: "6 3/4" (exact string with space)
   - status: "Available"

3. Expected: 
   - "6 3/4" inventory becomes 9 (10 - 1) ✅
   - "6 5/8" inventory stays 5 (no change) ✅

4. Verify:
   - Check database: "6 3/4" quantity should be 9
   - Check database: "6 5/8" quantity should still be 5
   - If "6 5/8" quantity changed: Size matching is WRONG ❌
```

### Test Case: Beret Size Matching (Verify Exact Match)
```
1. Set inventory:
   - "Beret" size "6 3/4" = 10
   - "Beret" size "6 5/8" = 10
   - "Beret" size "7" = 10

2. User submits "6 3/4":
   - Expected: Only "6 3/4" deducts to 9
   - Verify: "6 5/8" stays 10, "7" stays 10

3. User submits "6 5/8":
   - Expected: Only "6 5/8" deducts to 9
   - Verify: "6 3/4" stays 9, "7" stays 10

4. If wrong size deducts: Backend is using approximate matching ❌
```

---

## ⚠️ IMPORTANT NOTES

1. **Type Name:** The frontend now uses "Uniform No 3 Female" (not "Pants No 3")
   - Backend should accept both for backward compatibility
   - But when matching inventory, check for "Uniform No 3 Female" first

2. **Size Matching:** 
   - Sizes are case-sensitive: "XL" ≠ "xl"
   - For shoes/boots: Frontend sends "UK 8", backend should normalize to "8" for storage

3. **Transaction Safety:**
   - Use database transactions to ensure atomicity
   - If uniform save fails, don't deduct inventory
   - If inventory deduction fails, rollback uniform save

4. **Logging:**
   - Log all inventory deductions for audit trail
   - Include: sispaId, item details, old quantity, new quantity, timestamp

---

## 🎯 Summary

**The Bug:** Inventory is being increased (+1) instead of decreased (-1)

**The Fix:** 
1. Change `quantity + 1` to `quantity - 1`
2. Change `$inc: { quantity: 1 }` to `$inc: { quantity: -1 }` (MongoDB)
3. Change `quantity = quantity + 1` to `quantity = quantity - 1` (SQL)
4. Only deduct when `status === "Available"`
5. Ensure quantity doesn't go below 0

**Priority:** 🔴 CRITICAL - This affects inventory accuracy

---

## ✅ VERIFICATION STEPS

After implementing the fix, verify with these steps:

### Step 1: Check Backend Code
```bash
# Search for the bug in your backend code
grep -r "quantity + 1" backend/
grep -r "\$inc.*quantity.*1" backend/  # MongoDB
grep -r "quantity = quantity + 1" backend/  # SQL
```

If you find any of these patterns in the PUT /api/members/uniform endpoint, **they are WRONG** and need to be fixed.

### Step 2: Test the Fix
1. **Set up test inventory:**
   - Go to admin inventory page
   - Set "Uniform No 3 Female" size "XL" to quantity = 10
   - Note the exact quantity

2. **Submit uniform as user:**
   - Log in as a regular user (not admin)
   - Go to uniform page
   - Select "Uniform No 3 Female" size "XL"
   - Set status to "Available"
   - Click "Save"

3. **Verify inventory decreased:**
   - Log back in as admin
   - Go to inventory page
   - Check "Uniform No 3 Female" size "XL"
   - **Expected:** Quantity should be 9 (10 - 1)
   - **If it's 11:** The bug is NOT fixed ❌
   - **If it's 9:** The bug is fixed ✅

### Step 3: Check Backend Logs
When user submits uniform, backend should log:
```
✅ Deducting inventory: Uniform No 3 Female, size XL
   Old quantity: 10
   New quantity: 9
```

If you see:
```
❌ Adding inventory: Uniform No 3 Female, size XL
   Old quantity: 10
   New quantity: 11
```

Then the bug is NOT fixed.

### Step 4: Test Multiple Items
Test with different items to ensure fix works for all:
- Uniform No 3 Female (confirmed bug)
- Uniform No 3 Male
- Uniform No 4
- Boot
- PVC Shoes
- Beret

### Step 5: Test Status "Not Available"
Verify that when status is "Not Available", inventory is NOT deducted:
1. Set inventory: "Uniform No 3 Female" size "XL" = 10
2. User submits with status "Not Available"
3. Inventory should stay 10 (no change)

---

## 🔍 WHERE TO LOOK IN BACKEND CODE

The bug is in the **PUT /api/members/uniform** endpoint. Look for:

1. **File location:** Usually in a route file like:
   - `routes/members.js` or `routes/members.ts`
   - `routes/uniform.js` or `routes/uniform.ts`
   - `controllers/memberController.js`

2. **Function name:** Usually named:
   - `updateMemberUniform`
   - `saveMemberUniform`
   - `putMemberUniform`

3. **Look for this pattern:**
   ```javascript
   // After saving uniform data, there should be a loop like:
   for (const item of items) {
     if (item.status === "Available") {
       // THIS IS WHERE THE BUG IS
       // Look for: quantity + 1 or $inc: { quantity: 1 }
       // Should be: quantity - 1 or $inc: { quantity: -1 }
     }
   }
   ```

4. **Common bug locations:**
   - Right after `MemberUniform.findOneAndUpdate()` or similar
   - Inside a loop iterating through `items` array
   - When updating inventory with `Inventory.updateOne()` or SQL UPDATE

---

## 📝 QUICK FIX CHECKLIST

- [ ] Find PUT /api/members/uniform endpoint in backend code
- [ ] Locate inventory deduction logic (after saving uniform)
- [ ] Check if it uses `quantity + 1` or `$inc: { quantity: 1 }` or `quantity = quantity + 1`
- [ ] Change to `quantity - 1` or `$inc: { quantity: -1 }` or `quantity = quantity - 1`
- [ ] Verify status check: only deduct if `status === "Available"`
- [ ] Add `Math.max(0, newQuantity)` to prevent negative quantities
- [ ] Test with "Uniform No 3 Female" size "XL"
- [ ] Verify inventory decreases from 10 to 9 (not increases to 11)
- [ ] Test with status "Not Available" - should not deduct
- [ ] Check backend logs to confirm subtraction, not addition
