# Backend Inventory Deduction - Commands for Cursor Agent

## Task: Implement Inventory Deduction API

Implement the following endpoints and logic for inventory deduction when users save/update their uniform data.

---

## 1. Create Inventory Deduction Endpoint

**Command:**
```
Create a POST endpoint at /api/inventory/deduct that:
1. Requires authentication (member or admin)
2. Accepts an array of items to deduct
3. For each item, finds matching inventory item by category, type, and size
4. Validates sufficient stock is available
5. Deducts quantity from inventory using database transactions
6. Returns success with deducted items and remaining stock
7. Returns detailed errors if any item fails (insufficient stock or not found)
8. Uses transactions to ensure all-or-nothing behavior (if one fails, rollback all)
```

**Request Body:**
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

**Success Response:**
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
    }
  ]
}
```

**Error Response (Insufficient Stock):**
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

---

## 2. Create Inventory Update Endpoint (For Admin Edit)

**Command:**
```
Create a PUT endpoint at /api/inventory/:id that:
1. Requires admin authentication
2. Accepts quantity in request body
3. Updates the inventory item's quantity
4. Recalculates stock status (In Stock, Low Stock, Out of Stock)
5. Returns updated item with new quantity and status
```

**Request Body:**
```json
{
  "quantity": 15
}
```

**Success Response:**
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
    "status": "In Stock"
  }
}
```

---

## 3. Matching Logic Implementation

**Command:**
```
Implement matching logic for finding inventory items:
1. Category matching: Case-insensitive (e.g., "Uniform No 3" matches "uniform no 3")
2. Type matching: Case-insensitive (e.g., "Cloth No 3" matches "cloth no 3")
3. Size matching: Exact match (case-sensitive)
   - For items without sizes: null, "N/A", or empty string all match
   - For items with sizes: Exact match required (e.g., "M" matches "M", "UK 9" matches "UK 9")
4. Use compound index on { category, type, size } for efficient lookups
```

---

## 4. Transaction Handling

**Command:**
```
Implement transaction handling for inventory deduction:
1. Start a database transaction before processing items
2. For each item:
   - Find matching inventory item
   - Validate stock availability
   - Deduct quantity (within transaction)
3. If all items succeed: Commit transaction
4. If any item fails: Rollback transaction and return all errors
5. Ensure atomicity - either all items are deducted or none
```

---

## 5. Stock Status Calculation

**Command:**
```
Implement stock status calculation after deduction/update:
1. After quantity change, recalculate status:
   - "In Stock": quantity > 10
   - "Low Stock": quantity > 0 and quantity <= 10
   - "Out of Stock": quantity === 0
2. Update status field in inventory item
3. Return updated status in response
```

---

## 6. Error Handling

**Command:**
```
Implement comprehensive error handling:
1. Insufficient Stock:
   - Check quantity >= requested before deduction
   - Return detailed error with requested vs available
   - Include in errors array (don't fail immediately, collect all errors)
2. Item Not Found:
   - If no matching inventory item found, add to errors array
   - Include category, type, and size in error message
3. Validation Errors:
   - Validate request body structure
   - Validate all required fields present
   - Return 400 Bad Request with error details
4. Authentication/Authorization:
   - Check JWT token
   - For deduct: Allow members and admins
   - For update: Allow admins only
   - Return 401/403 with appropriate messages
```

---

## 7. Database Indexes

**Command:**
```
Create database indexes for efficient lookups:
1. Compound index on { category: 1, type: 1, size: 1 } for inventory item lookups
2. Index on category for filtering
3. Index on status for status-based queries
4. Ensure indexes are created in inventory model/schema
```

---

## 8. Testing Requirements

**Command:**
```
Ensure the following test cases pass:
1. Successfully deduct items with sizes
2. Successfully deduct items without sizes (accessories)
3. Handle insufficient stock error correctly
4. Handle item not found error correctly
5. Handle multiple items in single request
6. Verify transaction rollback on partial failure
7. Verify stock status updates after deduction
8. Test authentication and authorization
9. Test update endpoint with admin user
10. Test update endpoint with member user (should fail)
```

---

## 9. Integration Notes

**Important:**
- The frontend will call `/api/inventory/deduct` after successfully saving uniform data
- For new uniforms: Frontend sends all items
- For updates: Frontend calculates difference and sends only new/changed items
- The deduction should not fail the uniform save (frontend handles errors gracefully)
- Use transactions to ensure data consistency

---

## 10. File Structure

**Suggested file structure:**
```
src/
  controllers/
    inventoryController.ts  (add deductInventory and updateInventoryItem methods)
  routes/
    inventoryRoutes.ts      (add POST /deduct and PUT /:id routes)
  models/
    inventoryModel.ts       (ensure proper schema and indexes)
  middleware/
    auth.ts                (ensure proper authentication/authorization)
```

---

## Quick Implementation Checklist

- [ ] Create POST /api/inventory/deduct endpoint
- [ ] Create PUT /api/inventory/:id endpoint
- [ ] Implement matching logic (category, type, size)
- [ ] Implement transaction handling
- [ ] Implement stock status calculation
- [ ] Implement error handling (insufficient stock, not found)
- [ ] Add database indexes
- [ ] Add authentication/authorization checks
- [ ] Test all scenarios
- [ ] Update inventory routes file

---

## Example Controller Code Structure

```typescript
// inventoryController.ts

export const deductInventory = async (req: Request, res: Response) => {
  // 1. Validate request body
  // 2. Start transaction
  // 3. For each item:
  //    - Find matching inventory item
  //    - Check stock availability
  //    - Deduct quantity
  // 4. Commit or rollback transaction
  // 5. Return response
};

export const updateInventoryItem = async (req: Request, res: Response) => {
  // 1. Check admin authentication
  // 2. Validate request body
  // 3. Find inventory item by ID
  // 4. Update quantity
  // 5. Recalculate status
  // 6. Return updated item
};
```

