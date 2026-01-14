# Backend Inventory Delete API Specification

## Overview
This document clarifies the DELETE operation for inventory items. When an admin clicks the "DELETE" button for a specific size, it should **permanently remove the entire inventory item entry** from the database, not just set the quantity to 0.

---

## Important Distinction

### DELETE vs. Update Quantity

**DELETE Operation (This Document):**
- **Purpose:** Permanently remove a size entry from inventory
- **Action:** Delete the entire inventory item record from database
- **Result:** The size no longer exists in inventory
- **Use Case:** Admin wants to remove a size that is no longer needed (e.g., "UK 4" is discontinued)

**Update Quantity Operation (Separate):**
- **Purpose:** Change the quantity of an existing size
- **Action:** Update the `quantity` field in the database
- **Result:** The size still exists, but with a different quantity
- **Use Case:** Admin uses +/- buttons to adjust stock levels

---

## DELETE Endpoints

### 1. DELETE /api/inventory/:id

**Description:** Delete an inventory item by its ID

**Endpoint:**
```
DELETE /api/inventory/:id
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Path Parameters:**
- `id` (string, required): The inventory item ID

**Expected Behavior:**
1. Find the inventory item by ID
2. **Permanently delete** the item from the database
3. Return success response

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Unauthorized. Admin access required."
}
```

---

### 2. DELETE /api/inventory/by-attributes

**Description:** Delete an inventory item by its attributes (category, type, size)

**Endpoint:**
```
DELETE /api/inventory/by-attributes
```

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Uniform No 3",
  "type": "Boot",
  "size": "4"  // or null for accessories
}
```

**Expected Behavior:**
1. Find the inventory item matching the provided attributes
2. **Permanently delete** the item from the database
3. Return success response

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Missing required fields: category, type"
}
```

---

## Database Operation

### What DELETE Should Do

**✅ CORRECT:**
```javascript
// Permanently remove the document from the database
await Inventory.findByIdAndDelete(itemId);
// OR
await Inventory.deleteOne({ _id: itemId });
// OR
await Inventory.findOneAndDelete({ category, type, size });
```

**❌ INCORRECT:**
```javascript
// DO NOT just set quantity to 0 - this keeps the item in database
await Inventory.findByIdAndUpdate(itemId, { quantity: 0 });
// This is wrong! The item should be completely removed.
```

---

## Frontend Behavior

### When Admin Clicks DELETE Button

1. **Confirmation Dialog:** Admin sees a warning: "Do you want to delete size UK 4? This will permanently remove this size entry from the database."

2. **If Confirmed:**
   - Frontend calls `DELETE /api/inventory/:id` (or fallback to `/by-attributes`)
   - Backend permanently removes the item from database
   - Frontend refreshes inventory list
   - The size no longer appears in the table

3. **If Cancelled:**
   - No action taken

### When Admin Uses +/- Buttons

1. **Quantity Adjustment:** Admin clicks + or - to change quantity
2. **Save Button:** Admin clicks "SAVE" to update quantity
3. **Frontend calls:** `PUT /api/inventory/:id` with `{ quantity: newValue }`
4. **Backend updates:** The `quantity` field in the existing record
5. **Item remains:** The size entry still exists in the database

---

## Example Scenarios

### Scenario 1: Delete Size Entry

**Admin Action:**
- Clicks "DELETE" button for "UK 4" size of "Boot" in "Uniform No 3"

**Backend Action:**
```javascript
// Find and delete the item
const item = await Inventory.findOne({
  category: "Uniform No 3",
  type: "Boot",
  size: "4"
});

if (item) {
  await Inventory.findByIdAndDelete(item._id);
  // Item is permanently removed from database
}
```

**Result:**
- "UK 4" no longer exists in inventory
- Cannot be found in GET /api/inventory response
- Admin cannot edit quantity for this size (it doesn't exist)

---

### Scenario 2: Update Quantity

**Admin Action:**
- Clicks "+" button to increase quantity from 5 to 6
- Clicks "SAVE" button

**Backend Action:**
```javascript
// Update the quantity field
await Inventory.findByIdAndUpdate(itemId, {
  quantity: 6
});
// Item still exists in database, only quantity changed
```

**Result:**
- "UK 4" still exists in inventory
- Quantity is now 6
- Admin can continue editing quantity

---

## Implementation Checklist

### Backend Tasks

- [ ] **Verify DELETE /api/inventory/:id**
  - Ensures it permanently removes the item from database
  - Does NOT just set quantity to 0
  - Returns appropriate success/error responses

- [ ] **Verify DELETE /api/inventory/by-attributes**
  - Finds item by category, type, size
  - Permanently removes the item from database
  - Handles size normalization (e.g., "UK 4" vs "4")

- [ ] **Verify Authentication**
  - Only admins can delete inventory items
  - Check JWT token and admin role

- [ ] **Verify Error Handling**
  - Returns 404 if item not found
  - Returns 403 if unauthorized
  - Returns 400 if missing required fields

- [ ] **Test DELETE Operations**
  - Test deleting by ID
  - Test deleting by attributes
  - Verify item is completely removed (not just quantity = 0)
  - Verify item no longer appears in GET /api/inventory

---

## Database Schema Reference

### Inventory Collection

```javascript
{
  _id: ObjectId,
  category: String,      // e.g., "Uniform No 3"
  type: String,          // e.g., "Boot"
  size: String | null,   // e.g., "4" or null for accessories
  quantity: Number,       // e.g., 10
  name: String,          // Auto-generated from type
  createdAt: Date,
  updatedAt: Date
}
```

**After DELETE:**
- The entire document is removed from the collection
- No trace of the item remains in the database

---

## Important Notes

1. **Permanent Deletion:**
   - DELETE operations are permanent
   - Consider if you need soft delete (isDeleted flag) for audit purposes
   - If soft delete is needed, update the frontend to handle it

2. **Size Normalization:**
   - Frontend may send "UK 4" but backend stores "4"
   - Ensure DELETE by attributes handles size normalization correctly

3. **Cascading Effects:**
   - Consider if deleting an inventory item affects:
     - Member uniform assignments (probably not, as they reference by type/size)
     - Historical records (probably keep for reporting)
     - Reports/analytics (probably keep historical data)

4. **Validation:**
   - Ensure admin is authenticated
   - Ensure admin has proper permissions
   - Validate that the item exists before attempting delete

---

## Testing Recommendations

### Test Case 1: Delete by ID
```javascript
// 1. Create an inventory item
const item = await createInventoryItem({
  category: "Uniform No 3",
  type: "Boot",
  size: "4",
  quantity: 10
});

// 2. Delete it
DELETE /api/inventory/:id

// 3. Verify it's gone
GET /api/inventory
// Should NOT contain the deleted item
```

### Test Case 2: Delete by Attributes
```javascript
// 1. Create an inventory item
const item = await createInventoryItem({
  category: "Uniform No 3",
  type: "Boot",
  size: "4",
  quantity: 10
});

// 2. Delete it by attributes
DELETE /api/inventory/by-attributes
Body: {
  category: "Uniform No 3",
  type: "Boot",
  size: "4"
}

// 3. Verify it's gone
GET /api/inventory
// Should NOT contain the deleted item
```

### Test Case 3: Delete Non-Existent Item
```javascript
// Try to delete an item that doesn't exist
DELETE /api/inventory/non-existent-id

// Should return 404 Not Found
```

### Test Case 4: Verify Quantity Update Doesn't Delete
```javascript
// 1. Create an inventory item
const item = await createInventoryItem({
  category: "Uniform No 3",
  type: "Boot",
  size: "4",
  quantity: 10
});

// 2. Update quantity to 0
PUT /api/inventory/:id
Body: { quantity: 0 }

// 3. Verify item still exists
GET /api/inventory
// Should still contain the item with quantity: 0
// Item should NOT be deleted
```

---

## Summary

**Key Points:**
1. ✅ DELETE permanently removes the inventory item from database
2. ✅ DELETE does NOT just set quantity to 0
3. ✅ Update quantity (PUT) changes quantity but keeps the item
4. ✅ Two DELETE endpoints: by ID and by attributes
5. ✅ Frontend uses DELETE when admin clicks "DELETE" button
6. ✅ Frontend uses PUT when admin clicks "SAVE" after +/- buttons

**Backend Must Ensure:**
- DELETE operations permanently remove items from database
- DELETE operations do NOT just update quantity to 0
- Proper authentication and authorization checks
- Appropriate error handling and responses
