# Backend Command: Include Shirt Prices in Inventory API Response

## 🎯 Overview

**Price is stored directly in `UniformInventory`** (not in a separate ShirtPrice collection).

The frontend user UI needs to display shirt prices from the admin inventory. The `GET /api/inventory` endpoint **MUST** include the `price` field for all items (shirt items have prices, non-shirt items have `price: null`).

**CRITICAL:** The `GET /api/inventory` endpoint **MUST** include the `price` field in the response for ALL items.

---

## 📋 Required Fix

### Endpoint: `GET /api/inventory`

**Current Status:**
- ✅ Price is stored directly in `UniformInventory.price` field
- ✅ Price is per shirt type (same price for all sizes of the same type)
- ✅ Backend should include `price` field in all inventory responses

**Required Solution:**
- Include `price` field in inventory response for ALL items
- Shirt items: Include actual price value from `UniformInventory.price`
- Non-shirt items: Include `price: null`
- No need to join with separate ShirtPrice collection (price is already in UniformInventory)

---

## 🔧 Implementation

### MongoDB Implementation

```javascript
const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory'); // UniformInventory model
const authenticateToken = require('../middleware/authenticateToken');

router.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    // Fetch all inventory items (price is already stored in UniformInventory.price)
    // CRITICAL: Must include price field in the query or ensure it's in the model schema
    const inventoryItems = await Inventory.find({})
      .select('+price') // Explicitly include price field if it's not selected by default
      .sort({ category: 1, type: 1, size: 1 });

    // Map inventory items - price is already included in the model
    const inventoryWithPrices = inventoryItems.map(item => {
      const itemObj = item.toObject(); // Convert Mongoose document to plain object
      
      // Price is already in item.price (stored directly in UniformInventory)
      // For non-shirt items, price should be null
      // For shirt items, price will be the value set by admin (or null if not set)
      
      // CRITICAL: Ensure price field is always included in response (even if null)
      // This is required for frontend to display prices
      if (itemObj.price === undefined) {
        itemObj.price = null;
      }
      
      return itemObj;
    });

    // Debug: Log shirt items with prices
    const shirtItems = inventoryWithPrices.filter(item => {
      const category = item.category?.toLowerCase() || "";
      return category === "shirt" || category === "t-shirt";
    });
    if (shirtItems.length > 0) {
      console.log('💰 Shirt items with prices:', shirtItems.map(item => ({
        type: item.type,
        size: item.size,
        price: item.price
      })));
    }

    res.status(200).json({
      success: true,
      inventory: inventoryWithPrices
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory'
    });
  }
});
```

---

### PostgreSQL Implementation

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/api/inventory', authenticateToken, async (req, res) => {
  const client = await db.getClient();
  
  try {
    // Fetch all inventory items (price is already stored in inventory.price column)
    const inventoryResult = await client.query(
      `SELECT * FROM inventory ORDER BY category, type, size`
    );

    // Map inventory items - price is already included in the query result
    const inventoryWithPrices = inventoryResult.rows.map(item => {
      const itemObj = { ...item };
      
      // Price is already in item.price (stored directly in inventory table)
      // Ensure price field is always included (even if null)
      if (itemObj.price === undefined) {
        itemObj.price = null;
      }
      
      return itemObj;
    });

    res.status(200).json({
      success: true,
      inventory: inventoryWithPrices
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory'
    });
  } finally {
    client.release();
  }
});
```

---

### MySQL Implementation

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/api/inventory', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    // Fetch all inventory items (price is already stored in inventory.price column)
    const [inventoryRows] = await connection.query(
      `SELECT * FROM inventory ORDER BY category, type, size`
    );

    // Map inventory items - price is already included in the query result
    const inventoryWithPrices = inventoryRows.map(item => {
      const itemObj = { ...item };
      
      // Price is already in item.price (stored directly in inventory table)
      // Ensure price field is always included (even if null)
      if (itemObj.price === undefined) {
        itemObj.price = null;
      }
      
      return itemObj;
    });

    res.status(200).json({
      success: true,
      inventory: inventoryWithPrices
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory'
    });
  } finally {
    connection.release();
  }
});
```

---

## 📝 Response Format

### Current Response (WRONG - Missing Price)

```json
{
  "success": true,
  "inventory": [
    {
      "id": "inv-1",
      "category": "Shirt",
      "type": "Inner APM Shirt",
      "size": "M",
      "quantity": 50
      // ❌ Missing "price" field
    },
    {
      "id": "inv-2",
      "category": "Shirt",
      "type": "Digital Shirt",
      "size": "L",
      "quantity": 30
      // ❌ Missing "price" field
    }
  ]
}
```

### Required Response (CORRECT - Includes Price)

```json
{
  "success": true,
  "inventory": [
    {
      "id": "inv-1",
      "category": "Shirt",
      "type": "Inner APM Shirt",
      "size": "M",
      "quantity": 50,
      "price": 20.00  // ✅ Price included from ShirtPrice collection
    },
    {
      "id": "inv-2",
      "category": "Shirt",
      "type": "Digital Shirt",
      "size": "L",
      "quantity": 30,
      "price": 25.00  // ✅ Price included from ShirtPrice collection
    },
    {
      "id": "inv-3",
      "category": "Shirt",
      "type": "Company Shirt",
      "size": "XL",
      "quantity": 20,
      "price": 40.00  // ✅ Price included from ShirtPrice collection
    },
    {
      "id": "inv-4",
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "M",
      "quantity": 10,
      "price": null  // ✅ Price is null for non-shirt items (not applicable)
    }
  ]
}
```

---

## 🔑 Key Requirements

### 1. Price Field Must Be Included

**CRITICAL:** Price is stored directly in `UniformInventory.price` field (not in a separate collection).

**For Shirt Items:**
- `category === "Shirt"` OR `category === "T-Shirt"`
- `price` field must contain the price from `UniformInventory.price`
- If price is not set, use `null`
- **Same price for all sizes** of the same shirt type (price is per type, not per size)

**For Non-Shirt Items:**
- `price` field must be `null` (not applicable)

### 2. Database Schema

**UniformInventory Model/Table MUST include `price` field:**
- **MongoDB:** `price: Number | null` in schema
- **PostgreSQL/MySQL:** `price DECIMAL(10, 2) NULL` column

**Price Storage:**
- Price is stored per shirt type (not per size)
- All sizes of "Inner APM Shirt" share the same price
- When admin updates price for one size, backend automatically updates all sizes of that type

### 3. Response Format

**CRITICAL:** The `price` field MUST be included in the response for ALL items:
- Shirt items: actual price value (e.g., `20.00`)
- Non-shirt items: `null`

**No Joins Required:**
- Price is already in `UniformInventory` model/table
- No need to join with separate ShirtPrice collection/table
- Simply include `price` field in the SELECT query and response

---

## 🧪 Testing

### Test Case 1: Shirt Items Include Prices

```
1. Set prices in ShirtPrice collection:
   - "Inner APM Shirt" = 20.00
   - "Digital Shirt" = 25.00
   - "Company Shirt" = 40.00

2. Call GET /api/inventory

3. Expected: All shirt items include price field:
   - "Inner APM Shirt" items → price: 20.00
   - "Digital Shirt" items → price: 25.00
   - "Company Shirt" items → price: 40.00

4. Verify: Check response JSON, all shirt items have price field
```

### Test Case 2: Non-Shirt Items Have Null Price

```
1. Call GET /api/inventory

2. Expected: Non-shirt items have price: null:
   - "Uniform No 3 Male" → price: null
   - "Boot" → price: null
   - "Beret" → price: null

3. Verify: Check response JSON, non-shirt items have price: null
```

### Test Case 3: Shirt Items Without Price Set

```
1. Set "Digital Shirt" price to null in ShirtPrice collection

2. Call GET /api/inventory

3. Expected: "Digital Shirt" items have price: null

4. Verify: Check response JSON, price field is null
```

### Test Case 4: Case-Insensitive Matching

```
1. ShirtPrice has: type: "Inner APM Shirt"
2. Inventory has: type: "inner apm shirt" (lowercase)

3. Call GET /api/inventory

4. Expected: Price is matched correctly (case-insensitive)

5. Verify: Price is included in response
```

---

## 📊 Database Schema Reference

### UniformInventory Collection/Table

**MongoDB:**
```javascript
{
  _id: ObjectId,
  category: String, // "Shirt", "Uniform No 3", etc.
  type: String, // "Inner APM Shirt", "Digital Shirt", etc.
  size: String | null,
  quantity: Number,
  price: Number | null,  // ✅ Price stored directly here (per shirt type, same for all sizes)
  image: String | null,
  sizeChart: String | null,
  createdAt: Date,
  updatedAt: Date
}
```

**PostgreSQL/MySQL:**
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,  -- or INT AUTO_INCREMENT for MySQL
  category VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  size VARCHAR(50),  -- Can be NULL for accessories
  quantity INT NOT NULL DEFAULT 0,
  price DECIMAL(10, 2),  -- ✅ Price stored directly here (can be NULL)
  image TEXT,
  size_chart TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Important Notes:**
- ✅ Price is stored directly in `UniformInventory.price` field
- ✅ Price is per shirt type (same price for all sizes of the same type)
- ✅ When admin updates price for one size, backend automatically updates all sizes of that type
- ✅ Non-shirt items have `price: null`

---

## 🔍 Debugging

### Check 1: Verify Price Data in UniformInventory

**MongoDB:**
```javascript
// Check shirt items with prices
db.inventory.find({ 
  category: { $in: ["Shirt", "T-Shirt"] },
  price: { $ne: null }
});
// Should return items like:
// { _id: ..., category: "Shirt", type: "Inner APM Shirt", size: "M", price: 20.00 }
// { _id: ..., category: "Shirt", type: "Digital Shirt", size: "L", price: 25.00 }
// { _id: ..., category: "Shirt", type: "Company Shirt", size: "XL", price: 40.00 }

// Note: All sizes of the same shirt type should have the same price
```

**PostgreSQL:**
```sql
-- Check shirt items with prices
SELECT category, type, size, price 
FROM inventory 
WHERE category IN ('Shirt', 'T-Shirt') 
  AND price IS NOT NULL;
-- Should return:
-- category | type            | size | price
-- Shirt    | Inner APM Shirt | M    | 20.00
-- Shirt    | Inner APM Shirt | L    | 20.00  (same price for all sizes)
-- Shirt    | Digital Shirt   | M    | 25.00
-- Shirt    | Company Shirt   | XL   | 40.00
```

**MySQL:**
```sql
-- Same as PostgreSQL
SELECT category, type, size, price 
FROM inventory 
WHERE category IN ('Shirt', 'T-Shirt') 
  AND price IS NOT NULL;
```

### Check 2: Verify Inventory Response

**Test in Postman/Browser:**
```http
GET http://localhost:5000/api/inventory
Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "...",
      "category": "Shirt",
      "type": "Inner APM Shirt",
      "size": "M",
      "quantity": 50,
      "price": 20.00  // ✅ Must be present
    }
  ]
}
```

### Check 3: Backend Logs

Add logging to verify price is included:

```javascript
// After fetching inventory items
const shirtItems = inventoryItems.filter(item => {
  const category = item.category?.toLowerCase() || "";
  return category === "shirt" || category === "t-shirt";
});

if (shirtItems.length > 0) {
  console.log('💰 Shirt items with prices:', shirtItems.map(item => ({
    type: item.type,
    size: item.size,
    price: item.price  // Should be from UniformInventory.price
  })));
}

// Verify price field is included in response
console.log('📦 Sample inventory item:', inventoryWithPrices[0]);
// Should show: { id: ..., category: ..., type: ..., price: ... }
```

---

## ⚠️ Common Mistakes to Avoid

### Mistake 1: Not Including Price Field

```javascript
// ❌ WRONG - Price field missing
const inventoryWithPrices = inventoryItems.map(item => ({
  id: item.id,
  category: item.category,
  type: item.type,
  size: item.size,
  quantity: item.quantity
  // Missing price field!
}));

// ✅ CORRECT - Price field included
const inventoryWithPrices = inventoryItems.map(item => {
  const itemObj = item.toObject();
  if (category === "shirt" || category === "t-shirt") {
    itemObj.price = shirtPriceMap.get(type) || null;
  } else {
    itemObj.price = null;
  }
  return itemObj;
});
```

### Mistake 2: Case-Sensitive Matching

```javascript
// ❌ WRONG - Case-sensitive matching
if (item.category === "Shirt") {  // Won't match "shirt" or "T-Shirt"
  itemObj.price = shirtPriceMap.get(item.type);
}

// ✅ CORRECT - Case-insensitive matching
const category = item.category?.toLowerCase() || "";
const type = item.type?.toLowerCase() || "";
if (category === "shirt" || category === "t-shirt") {
  itemObj.price = shirtPriceMap.get(type) || null;
}
```

### Mistake 3: Not Handling Null Prices

```javascript
// ❌ WRONG - Undefined if price not set
itemObj.price = shirtPriceMap.get(type);  // Returns undefined if not found

// ✅ CORRECT - Explicitly set to null
itemObj.price = shirtPriceMap.get(type) ?? null;  // Returns null if not found
```

### Mistake 4: Not Including Price Field in Query

```javascript
// ❌ WRONG - Price field not selected
const inventoryItems = await Inventory.find({})
  .select('-price')  // Excluding price field!
  .sort({ category: 1, type: 1, size: 1 });

// ✅ CORRECT - Price field included (or use default selection)
const inventoryItems = await Inventory.find({})
  .select('+price')  // Explicitly include price field
  .sort({ category: 1, type: 1, size: 1 });
// Or just use default selection (if price is in schema)
```

### Mistake 5: Not Including Price in SQL SELECT

```sql
-- ❌ WRONG - Price column not selected
SELECT id, category, type, size, quantity FROM inventory;

-- ✅ CORRECT - Price column included
SELECT id, category, type, size, quantity, price FROM inventory;
```

---

## ✅ Implementation Checklist

- [ ] Verify `price` field exists in `UniformInventory` model/schema
- [ ] Update `GET /api/inventory` endpoint to include `price` field in response
- [ ] Ensure `price` field is selected in database query (MongoDB: `.select('+price')`, SQL: include in SELECT)
- [ ] Add `price` field to all inventory items in response
- [ ] Ensure `price` is `null` for non-shirt items (or undefined → convert to null)
- [ ] Test with all three shirt types (Digital, Company, Inner APM)
- [ ] Test with non-shirt items (should have `price: null`)
- [ ] Verify response includes `price` field in JSON for ALL items
- [ ] Check backend logs for price confirmation
- [ ] Verify price is same for all sizes of the same shirt type

---

## 📞 Frontend Expectations

The frontend expects the inventory API response to include:

```typescript
interface InventoryItem {
  id: string;
  category: string;
  type: string;
  size: string | null;
  quantity: number;
  price: number | null;  // ✅ REQUIRED for shirt items
  // ... other fields
}
```

**Frontend Logic:**
1. Fetches inventory from `GET /api/inventory`
2. Extracts prices from shirt items: `item.price`
3. Updates `shirtPrices` state with extracted prices
4. Displays prices in user UI: `RM {price.toFixed(2)}`

**If price is missing:**
- Frontend cannot display price
- Shows "Not set" in user UI
- User cannot see updated prices from admin

---

## 🎯 Summary

**The Fix:**
1. **Price is stored directly in `UniformInventory.price`** (not in separate collection)
2. Include `price` field in database query (MongoDB: `.select('+price')`, SQL: include in SELECT)
3. Include `price` field in response for ALL items:
   - Shirt items: actual price from `UniformInventory.price`
   - Non-shirt items: `null`

**Key Points:**
- ✅ No joins required (price is already in UniformInventory)
- ✅ Price is per shirt type (same for all sizes)
- ✅ Backend automatically syncs price to all sizes when admin updates one size
- ✅ Frontend expects `price` field in ALL inventory items

**Priority:** 🔴 CRITICAL - User UI cannot display prices without this fix

**Testing:**
- Verify `GET /api/inventory` response includes `price` field for ALL items
- Check that shirt items have correct prices (from UniformInventory.price)
- Check that non-shirt items have `price: null`
- Verify price is same for all sizes of the same shirt type

---

**Last Updated:** 2024
**Version:** 1.0
