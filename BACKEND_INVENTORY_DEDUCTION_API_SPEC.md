# Backend Inventory Deduction API Specification

This document provides the API specification for inventory deduction when users save/update their uniform data.

## Base URL
```
http://localhost:5000
```

---

## 1. Deduct Inventory Endpoint

### Endpoint
```
POST /api/inventory/deduct
```

### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": null,
      "quantity": 1
    },
    {
      "category": "Uniform No 4",
      "type": "Boot",
      "size": "UK 9",
      "quantity": 1
    }
  ]
}
```

### Field Descriptions
- `items` (array, required): Array of items to deduct from inventory
  - `category` (string, required): Item category ("Uniform No 3", "Uniform No 4", "T-Shirt")
  - `type` (string, required): Item type (e.g., "Cloth No 3", "Pants No 3", "Belt No 3", "Digital Shirt")
  - `size` (string, optional): Item size (e.g., "M", "L", "UK 9", "6 1/2"). Use `null` for items without sizes (accessories)
  - `quantity` (number, required): Quantity to deduct (usually 1)

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Inventory deducted successfully",
  "deducted": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantityDeducted": 1,
      "remainingStock": 4
    },
    {
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": null,
      "quantityDeducted": 1,
      "remainingStock": 9
    }
  ]
}
```

### Error Response (400 Bad Request) - Insufficient Stock
```json
{
  "success": false,
  "message": "Insufficient stock for some items",
  "errors": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "requested": 1,
      "available": 0,
      "message": "Insufficient stock: Only 0 available, but 1 requested"
    }
  ]
}
```

### Error Response (400 Bad Request) - Item Not Found
```json
{
  "success": false,
  "message": "Some items not found in inventory",
  "errors": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "message": "Item not found in inventory"
    }
  ]
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Members only."
}
```

---

## 2. Update Inventory Item Endpoint (For Admin Edit Feature)

### Endpoint
```
PUT /api/inventory/:id
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

### URL Parameters
- `id` (string, required): The inventory item ID

### Request Body
```json
{
  "quantity": 15
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Inventory item updated successfully",
  "item": {
    "id": "inventory-item-id",
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "M",
    "quantity": 15,
    "status": "In Stock",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

---

## 3. Implementation Logic

### Inventory Deduction Logic

1. **Validate Request:**
   - Check if user is authenticated
   - Validate request body structure
   - Ensure all required fields are present

2. **For Each Item:**
   - Find the inventory item matching:
     - `category` (case-insensitive)
     - `type` (case-insensitive)
     - `size` (exact match, or `null`/`"N/A"` for items without sizes)
   
   - Check if item exists in inventory
   - Check if sufficient stock is available (`quantity >= requested quantity`)
   
   - If valid:
     - Deduct the quantity from inventory
     - Update the inventory item's `quantity` field
     - Log the deduction (optional, for audit trail)

3. **Transaction Handling:**
   - Use database transactions to ensure atomicity
   - If any item fails (insufficient stock or not found), rollback all deductions
   - Return detailed error messages for each failed item

4. **Stock Status Update:**
   - After deduction, recalculate stock status:
     - `In Stock`: quantity > 10
     - `Low Stock`: quantity > 0 and quantity <= 10
     - `Out of Stock`: quantity === 0

### Update Inventory Logic

1. **Validate Request:**
   - Check if user is admin
   - Validate inventory item ID exists
   - Validate new quantity (must be >= 0)

2. **Update:**
   - Update the inventory item's `quantity` field
   - Recalculate stock status
   - Update `updatedAt` timestamp

---

## 4. Database Schema

### Inventory Schema
```javascript
{
  _id: ObjectId,
  name: String (required), // e.g., "Cloth No 3", "Belt No 3"
  category: String (required), // "Uniform No 3", "Uniform No 4", "T-Shirt"
  type: String (required), // "Cloth No 3", "Pants No 3", "Belt No 3", etc.
  size: String (optional), // "M", "L", "UK 9", "6 1/2", or null for accessories
  quantity: Number (required, min: 0),
  status: String (enum: ["In Stock", "Low Stock", "Out of Stock"]),
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- Compound index on `{ category: 1, type: 1, size: 1 }` for efficient lookups
- Index on `category` for filtering
- Index on `status` for status-based queries

---

## 5. Matching Logic

### Category Matching
- Case-insensitive comparison
- Handle variations:
  - "Uniform No 3" matches "uniform no 3", "UNIFORM NO 3", etc.
  - "T-Shirt" matches "t-shirt", "T-Shirt", "tshirt", "TShirt", etc.

### Type Matching
- Case-insensitive comparison
- Handle variations:
  - "Cloth No 3" matches "cloth no 3", "CLOTH NO 3", etc.
  - "PVC Shoes" matches "pvc shoes", "PVC Shoes", "pvc", "shoes", etc.
  - "Belt No 3" matches "belt no 3", "Belt No 3", "belt", etc.

### Size Matching
- Exact match (case-sensitive)
- Special handling:
  - `null` or `"N/A"` in request matches `null`, `"N/A"`, or empty string in database
  - "UK 9" matches "UK 9" (exact)
  - "6 1/2" matches "6 1/2" (exact)

---

## 6. Error Handling

### Insufficient Stock
- Check `quantity >= requested quantity` before deduction
- Return detailed error for each item with insufficient stock
- Include available quantity in error message

### Item Not Found
- If no matching inventory item found, return error
- Include category, type, and size in error message

### Partial Failures
- Use transactions to ensure all-or-nothing behavior
- If any item fails, rollback all deductions
- Return all errors in a single response

---

## 7. Testing Checklist

### Deduct Inventory
- [ ] Successfully deduct items with sizes
- [ ] Successfully deduct items without sizes (accessories)
- [ ] Handle insufficient stock error correctly
- [ ] Handle item not found error correctly
- [ ] Handle multiple items in single request
- [ ] Verify stock status updates after deduction
- [ ] Verify transaction rollback on failure
- [ ] Test with authenticated member user
- [ ] Test with unauthenticated user (should fail)
- [ ] Test with admin user (should work)

### Update Inventory
- [ ] Successfully update quantity for existing item
- [ ] Handle non-existent item ID (404)
- [ ] Handle invalid quantity (negative, etc.)
- [ ] Verify stock status updates after update
- [ ] Test with authenticated admin user
- [ ] Test with member user (should fail with 403)
- [ ] Test with unauthenticated user (should fail with 401)

---

## 8. Sample Test Data

### Inventory Items
```json
[
  {
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "M",
    "quantity": 5,
    "status": "Low Stock"
  },
  {
    "name": "Belt No 3",
    "category": "Uniform No 3",
    "type": "Belt No 3",
    "size": null,
    "quantity": 10,
    "status": "In Stock"
  },
  {
    "name": "Boot",
    "category": "Uniform No 4",
    "type": "Boot",
    "size": "UK 9",
    "quantity": 3,
    "status": "Low Stock"
  }
]
```

### Test Deduction Request
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": null,
      "quantity": 1
    }
  ]
}
```

### Expected Result
- Cloth No 3 (M): quantity becomes 4 (was 5)
- Belt No 3: quantity becomes 9 (was 10)
- Both items remain "Low Stock" status

---

## 9. Integration with Uniform Save

### When User Saves Uniform (First Time)
1. User submits uniform data
2. Backend saves uniform data
3. Frontend calls `/api/inventory/deduct` with all items
4. Backend deducts inventory for all items

### When User Updates Uniform
1. User updates uniform data
2. Frontend calculates difference:
   - Fetch old uniform items for the category
   - Compare old items vs new items
   - Calculate items to deduct (new items - old items)
3. Backend saves updated uniform data
4. Frontend calls `/api/inventory/deduct` with only the difference
5. Backend deducts inventory for the difference

### Example Update Scenario
**Old Items:**
- Cloth No 3, Size M
- Belt No 3

**New Items:**
- Cloth No 3, Size L (changed from M)
- Belt No 3 (same)
- Pants No 3, Size L (new)

**Items to Deduct:**
- Cloth No 3, Size L (new)
- Pants No 3, Size L (new)
- Note: Belt No 3 not deducted (already had it)
- Note: Cloth No 3, Size M not returned (user changed size)

---

## 10. Notes

- **Transaction Safety:** Use database transactions to ensure atomicity. If any item fails, rollback all deductions.
- **Stock Validation:** Always check stock availability before deduction. Don't allow negative quantities.
- **Error Messages:** Provide clear, detailed error messages for debugging and user feedback.
- **Audit Trail:** Consider logging all inventory deductions for audit purposes.
- **Performance:** Use indexes on category, type, and size for efficient lookups.
- **Case Sensitivity:** Category and type matching should be case-insensitive, but size matching should be exact.

