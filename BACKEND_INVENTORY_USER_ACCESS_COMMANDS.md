# Backend Commands: Inventory Access for User Uniform UI

## Overview
The frontend user uniform UI needs to access inventory data to:
1. Display all items from admin inventory dynamically
2. Check inventory quantity before saving
3. Show "Not Available" status when quantity is 0

## CRITICAL: Make Inventory API Accessible to Regular Users

### Current Issue
The `GET /api/inventory` endpoint is currently **admin-only** (returns 403 for regular users), but the user uniform UI needs to fetch inventory to:
- Display all available items
- Check quantities before saving
- Validate availability

### Required Backend Changes

#### 1. Update GET /api/inventory Endpoint

**Command:**
```
Update GET /api/inventory endpoint to allow BOTH admin and regular users:

1. Remove or modify the admin-only restriction
2. Allow authenticated users (both admin and regular members) to access inventory
3. Response format remains the same:
   {
     "success": true,
     "inventory": [
       {
         "id": "inv-1",
         "name": "Cloth No 3",
         "category": "Uniform No 3",
         "type": "Cloth No 3",
         "size": "XS",
         "quantity": 50,
         "sizeChart": "https://...", // Optional: URL to size chart image
         "createdAt": "2024-01-15T10:30:00.000Z",
         "updatedAt": "2024-01-20T14:45:00.000Z"
       }
     ]
   }

4. Authentication: Still require valid JWT token (Bearer token)
5. Authorization: Allow both role === "admin" AND role === "member" (or any authenticated user)
6. Return 401 if not authenticated
7. Return 403 only if token is invalid (not for regular users)
```

**Implementation Example:**
```javascript
// BEFORE (Admin only):
router.get('/api/inventory', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Access denied. Admin only." });
  }
  // ... fetch inventory
});

// AFTER (All authenticated users):
router.get('/api/inventory', authenticateToken, (req, res) => {
  // Allow both admin and regular users
  // No role check needed - just require authentication
  // ... fetch inventory
});
```

#### 2. Ensure Inventory Response Includes Required Fields

**Command:**
```
Ensure GET /api/inventory response includes:
- id (string)
- name (string) - display name of item
- category (string) - "Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt"
- type (string) - item type (e.g., "Uniform No 3 Male", "Beret", "Apulet", "Nametag No 3", "Nametag No 4")
- size (string | null) - size value or null for accessories
- quantity (number) - current quantity in stock
- sizeChart (string, optional) - URL to size chart image
- createdAt (datetime)
- updatedAt (datetime)

CRITICAL: The category field must support the new 5-category structure:
- "Uniform No 3"
- "Uniform No 4"
- "Accessories No 3"
- "Accessories No 4"
- "Shirt" (or "T-Shirt" for backward compatibility)
```

#### 3. Support New Category Structure

**Command:**
```
Update inventory to support the new 5-category structure:

1. Categories must include:
   - "Uniform No 3"
   - "Uniform No 4"
   - "Accessories No 3" (NEW - for accessories that belong to Uniform No 3)
   - "Accessories No 4" (NEW - for accessories that belong to Uniform No 4)
   - "Shirt" (or "T-Shirt" for backward compatibility)

2. Type names must match frontend expectations:
   - "Uniform No 3 Male" (not "Cloth No 3")
   - "Uniform No 3 Female" (not "Pants No 3")
   - "Uniform No 4" (not "Cloth No 4" or "Pants No 4")
   - "Nametag No 3" or "Name Tag No 3" (for Accessories No 3)
   - "Nametag No 4" or "Name Tag No 4" (for Accessories No 4)

3. For backward compatibility, also accept old type names and normalize them:
   - "Cloth No 3" → "Uniform No 3 Male"
   - "Pants No 3" → "Uniform No 3 Female"
   - "Cloth No 4" → "Uniform No 4"
   - "Pants No 4" → "Uniform No 4"
```

---

## Backend Commands: Uniform Save with "Not Available" Status

### Current Issue
The frontend now sends `status: "Not Available"` when inventory quantity is 0, but the backend must:
1. Accept and save "Not Available" status
2. NOT deduct inventory when status is "Not Available"
3. Still save the uniform data with "Not Available" status

### Required Backend Changes

#### 1. Update PUT /api/members/uniform Endpoint

**Command:**
```
Update PUT /api/members/uniform endpoint to:

1. Accept status field in request items:
   {
     "items": [
       {
         "category": "Uniform No 3",
         "type": "Beret",
         "size": "6 7/8",
         "quantity": 1,
         "status": "Not Available"  // NEW: Accept this status
       }
     ]
   }

2. Save status field to database (if you have a status column)
   OR store it in a way that can be retrieved later

3. CRITICAL: Only deduct inventory if status is "Available" or undefined/null:
   - If status === "Not Available" → DO NOT deduct inventory
   - If status === "Missing" → DO NOT deduct inventory
   - If status === "Available" or undefined → Deduct inventory as normal

4. Still save the uniform item even if status is "Not Available"
   - This allows tracking of items that are requested but not available
   - Admin can see which items members need but are out of stock

5. Response should include the status field:
   {
     "success": true,
     "uniform": {
       "items": [
         {
           "category": "Uniform No 3",
           "type": "Beret",
           "size": "6 7/8",
           "quantity": 1,
           "status": "Not Available"  // Include in response
         }
       ]
     }
   }
```

**Implementation Example:**
```javascript
// In PUT /api/members/uniform handler:
items.forEach(item => {
  // Save uniform item
  const uniformItem = {
    category: item.category,
    type: item.type,
    size: item.size,
    quantity: item.quantity,
    notes: item.notes,
    status: item.status || "Available"  // Save status field
  };
  
  // Only deduct inventory if status is "Available" or not set
  if (item.status !== "Not Available" && item.status !== "Missing") {
    // Find matching inventory item
    const inventoryItem = await Inventory.findOne({
      category: item.category,
      type: item.type,
      size: item.size || null
    });
    
    if (inventoryItem && inventoryItem.quantity > 0) {
      inventoryItem.quantity -= item.quantity || 1;
      await inventoryItem.save();
    }
  }
  
  // Save uniform item regardless of status
  await saveUniformItem(uniformItem);
});
```

---

## Backend Commands: Missing Count Tracking

### Current Issue
The frontend displays missing count `(count)` next to "Missing" status, but the backend is not tracking or returning `missingCount`.

### Required Backend Changes

#### 1. Track Missing Count in Database

**Command:**
```
Add missingCount tracking to uniform items:

1. Option A: Add missingCount column to uniform_items table:
   ALTER TABLE uniform_items 
   ADD COLUMN missing_count INT DEFAULT 0;

2. Option B: Track in a separate table (if you prefer):
   CREATE TABLE uniform_item_status_history (
     id VARCHAR(255) PRIMARY KEY,
     member_id VARCHAR(255),
     category VARCHAR(100),
     type VARCHAR(100),
     size VARCHAR(50),
     status VARCHAR(20),
     changed_at DATETIME,
     INDEX idx_member_item (member_id, category, type, size)
   );

3. When status changes to "Missing", increment missingCount
4. When status changes from "Missing" to "Available", you can reset or keep the count
```

#### 2. Update GET /api/members/:sispaId/uniform Response

**Command:**
```
Update GET /api/members/:sispaId/uniform to include missingCount:

1. For each item with status === "Missing", calculate missingCount:
   - Count how many times this specific item (category, type, size) has been set to "Missing" for this member
   - OR count how many times status has changed to "Missing" (if tracking history)

2. Include missingCount in response:
   {
     "success": true,
     "uniform": {
       "items": [
         {
           "category": "Accessories No 3",
           "type": "Apulet",
           "size": null,
           "quantity": 1,
           "status": "Missing",
           "missingCount": 2  // NEW: Include this when status is "Missing"
         }
       ]
     }
   }

3. Only include missingCount when status is "Missing"
4. If status is "Available" or "Not Available", omit missingCount (or set to undefined)
```

**Implementation Example:**
```javascript
// In GET /api/members/:sispaId/uniform handler:
const uniformItems = await getUniformItems(sispaId);

const itemsWithStatus = uniformItems.map(item => {
  const result = {
    category: item.category,
    type: item.type,
    size: item.size,
    quantity: item.quantity,
    notes: item.notes,
    status: item.status || "Available"
  };
  
  // Add missingCount if status is "Missing"
  if (item.status === "Missing") {
    // Count how many times this item has been "Missing"
    result.missingCount = await countMissingStatus(sispaId, item.category, item.type, item.size);
  }
  
  return result;
});
```

---

## Summary of Required Backend Changes

### Priority 1: Critical (Required for Frontend to Work)

1. ✅ **Make GET /api/inventory accessible to regular users**
   - Remove admin-only restriction
   - Allow authenticated users (both admin and members)
   - Ensure response includes: id, name, category, type, size, quantity, sizeChart

2. ✅ **Accept "Not Available" status in PUT /api/members/uniform**
   - Save status field to database
   - DO NOT deduct inventory when status is "Not Available"
   - Still save uniform data with "Not Available" status

3. ✅ **Return status in GET /api/members/:sispaId/uniform**
   - Include status field in response items
   - Support "Available", "Missing", and "Not Available" statuses

### Priority 2: Important (For Full Functionality)

4. ✅ **Track and return missingCount**
   - Add missingCount tracking to database
   - Calculate count when status is "Missing"
   - Include missingCount in response when status is "Missing"

5. ✅ **Support new 5-category structure**
   - Accept "Accessories No 3" and "Accessories No 4" categories
   - Support "Nametag No 3" and "Nametag No 4" type names
   - Normalize old type names for backward compatibility

### Testing Checklist

- [ ] Regular user can access GET /api/inventory (should not return 403)
- [ ] Inventory response includes all required fields
- [ ] PUT /api/members/uniform accepts "Not Available" status
- [ ] Inventory is NOT deducted when status is "Not Available"
- [ ] Uniform data is saved even with "Not Available" status
- [ ] GET /api/members/:sispaId/uniform returns status field
- [ ] GET /api/members/:sispaId/uniform returns missingCount when status is "Missing"
- [ ] New categories ("Accessories No 3", "Accessories No 4") are supported
- [ ] Type names ("Nametag No 3", "Nametag No 4") are supported

---

## Quick Implementation Guide

### Step 1: Update GET /api/inventory (5 minutes)
```javascript
// Change from:
if (req.user.role !== 'admin') {
  return res.status(403).json({ success: false, message: "Access denied. Admin only." });
}

// To:
// Remove the role check - allow all authenticated users
```

### Step 2: Update PUT /api/members/uniform (10 minutes)
```javascript
// Add status handling:
items.forEach(item => {
  // Save item with status
  const uniformItem = {
    ...item,
    status: item.status || "Available"
  };
  
  // Only deduct inventory if status allows it
  if (item.status !== "Not Available" && item.status !== "Missing") {
    await deductInventory(item);
  }
  
  await saveUniformItem(uniformItem);
});
```

### Step 3: Update GET /api/members/:sispaId/uniform (10 minutes)
```javascript
// Include status and missingCount in response:
const items = uniformItems.map(item => ({
  ...item,
  status: item.status || "Available",
  missingCount: item.status === "Missing" ? await getMissingCount(sispaId, item) : undefined
}));
```

---

## Notes

- **Backward Compatibility**: The frontend handles missing fields gracefully, so you can implement these changes incrementally
- **Security**: Inventory API is still protected by authentication (JWT token required)
- **Performance**: Consider caching inventory data if it's accessed frequently
- **Data Migration**: Existing uniform items without status will default to "Available" in the frontend
