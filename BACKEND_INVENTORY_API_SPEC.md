# Backend Inventory API Specification

This document provides the complete API specification for the Inventory Management system that needs to be implemented in the backend.

## Overview

The inventory system manages uniform items (Uniform No 3, Uniform No 4, T-Shirt) and their quantities by size. When members submit uniform data, the inventory quantities should be automatically deducted.

---

## 1. Get All Inventory Items

### Endpoint
```
GET /api/inventory
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
```

### Description
Returns all inventory items grouped by category and type. This endpoint is used by the admin to view current inventory status.

### Success Response (200 OK)
```json
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
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    },
    {
      "id": "inv-2",
      "name": "Cloth No 3",
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "S",
      "quantity": 45,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    },
    {
      "id": "inv-3",
      "name": "Apulet",
      "category": "Uniform No 3",
      "type": "Apulet",
      "size": null,
      "quantity": 100,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
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
  "message": "Access denied. Admin only."
}
```

### Notes
- This endpoint should only be accessible to users with `role: "admin"`
- Items without sizes (accessories) will have `size: null`
- The inventory array should include all items across all categories

---

## 2. Add Inventory Item

### Endpoint
```
POST /api/inventory
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "name": "Cloth No 3",
  "category": "Uniform No 3",
  "type": "Cloth No 3",
  "size": "XS",
  "quantity": 50
}
```

### Field Descriptions
- `name` (string, required): The display name of the item (usually same as type)
- `category` (string, required): One of "Uniform No 3", "Uniform No 4", "T-Shirt"
- `type` (string, required): The item type (e.g., "Cloth No 3", "Pants No 3", "PVC Shoes", "Beret", "Apulet", "Integrity Badge", "Gold Badge", "Cel Bar", "Beret Logo Pin", "Belt No 3", "Cloth No 4", "Pants No 4", "Boot", "APM Tag", "Belt No 4", "Digital", "Inner APM", "Company")
- `size` (string | null, optional): Size for items that have sizes. Can be null for accessories.
- `quantity` (number, required): Initial quantity (must be >= 0)

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Inventory item added successfully",
  "inventory": {
    "id": "inv-1",
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "XS",
    "quantity": 50,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error: quantity must be a positive number"
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
  "message": "Access denied. Admin only."
}
```

### Validation Rules
- `category` must be one of: "Uniform No 3", "Uniform No 4", "T-Shirt"
- `type` must match the category (see valid types below)
- `size` is required for items with sizes, null for accessories
- `quantity` must be a number >= 0
- If an item with the same category, type, and size already exists, you can either:
  - Update the existing item's quantity (add to existing)
  - Return an error asking to update instead
  - Create a new entry (recommended: update existing)

### Valid Item Types by Category

**Uniform No 3:**
- Cloth No 3 (has sizes: XS, S, M, L, XL, 2XL, 3XL)
- Pants No 3 (has sizes: XS, S, M, L, XL, 2XL, 3XL)
- PVC Shoes (has sizes: 4, 5, 6, 7, 8, 9, 10, 11, 12)
- Beret (has sizes: 6 1/2, 6 5/8, 6 3/4, 6 7/8, 7, 7 1/8, 7 1/4, 7 3/8, 7 1/2, 7 5/8, 7 3/4, 7 7/8, 8, 8 1/8, 8 1/4, 8 3/8)
- Apulet (no size)
- Integrity Badge (no size)
- Gold Badge (no size)
- Cel Bar (no size)
- Beret Logo Pin (no size)
- Belt No 3 (no size)

**Uniform No 4:**
- Cloth No 4 (has sizes: XS, S, M, L, XL, 2XL, 3XL)
- Pants No 4 (has sizes: XS, S, M, L, XL, 2XL, 3XL)
- Boot (has sizes: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
- APM Tag (no size)
- Belt No 4 (no size)

**T-Shirt:**
- Digital (has sizes: XS, S, M, L, XL, 2XL, 3XL)
- Inner APM (has sizes: XS, S, M, L, XL, 2XL, 3XL)
- Company (has sizes: XS, S, M, L, XL, 2XL, 3XL)

---

## 3. Update Inventory Item Quantity

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
  "quantity": 75
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Inventory item updated successfully",
  "inventory": {
    "id": "inv-1",
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "XS",
    "quantity": 75,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T15:00:00.000Z"
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

---

## 4. Deduct Inventory When Member Submits Uniform Data

### Integration Point
This should be automatically triggered when a member submits uniform data via:
```
PUT /api/members/uniform
```

### Logic
When a member submits uniform data, the backend should:

1. **Parse the uniform items** from the request
2. **For each item in the uniform submission:**
   - Find the matching inventory item by `category`, `type`, and `size`
   - Deduct 1 from the quantity (or the quantity specified in the request)
   - Ensure quantity doesn't go below 0
   - Update the inventory item

3. **Example Flow:**
   ```
   Member submits:
   - Uniform No 3: Cloth No 3, Size: M
   - Uniform No 3: Pants No 3, Size: M
   - Uniform No 3: PVC Shoes, Size: 8
   - Uniform No 3: Beret, Size: 7
   - Uniform No 3: Apulet (no size)
   
   Backend should:
   - Find inventory: "Cloth No 3" + "Uniform No 3" + "M" → deduct 1
   - Find inventory: "Pants No 3" + "Uniform No 3" + "M" → deduct 1
   - Find inventory: "PVC Shoes" + "Uniform No 3" + "8" → deduct 1
   - Find inventory: "Beret" + "Uniform No 3" + "7" → deduct 1
   - Find inventory: "Apulet" + "Uniform No 3" + null → deduct 1
   ```

### Important Notes
- **Check availability before deducting**: If quantity is 0, you can either:
  - Return an error to the member (recommended)
  - Allow the submission but mark as "backordered" or "pending"
- **Atomic operations**: Use database transactions to ensure inventory is deducted atomically
- **Log inventory changes**: Consider logging all inventory deductions for audit purposes

---

## 5. Database Schema

### Inventory Table
```sql
CREATE TABLE inventory (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- "Uniform No 3", "Uniform No 4", "T-Shirt"
  type VARCHAR(100) NOT NULL, -- "Cloth No 3", "Pants No 3", etc.
  size VARCHAR(50) NULL, -- "XS", "S", "M", etc., or NULL for accessories
  quantity INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY unique_item (category, type, size)
);
```

### Indexes
- Index on `(category, type, size)` for fast lookups when deducting inventory
- Index on `category` for filtering by category
- Index on `type` for filtering by type

---

## 6. Testing Checklist

### Add Inventory Item
- [ ] Admin can add item with size
- [ ] Admin can add item without size (accessory)
- [ ] Validation: category must be valid
- [ ] Validation: type must match category
- [ ] Validation: size required for items with sizes
- [ ] Validation: size must be null for accessories
- [ ] Validation: quantity must be >= 0
- [ ] Non-admin cannot add items (403)
- [ ] Unauthenticated user cannot add items (401)

### Get Inventory
- [ ] Admin can view all inventory items
- [ ] Returns items grouped by category
- [ ] Items without sizes have `size: null`
- [ ] Non-admin cannot view inventory (403)
- [ ] Unauthenticated user cannot view inventory (401)

### Update Inventory
- [ ] Admin can update item quantity
- [ ] Quantity cannot go below 0
- [ ] Non-admin cannot update (403)
- [ ] Unauthenticated user cannot update (401)

### Deduct Inventory on Uniform Submission
- [ ] When member submits uniform, inventory is deducted
- [ ] Each item in uniform submission deducts 1 from matching inventory
- [ ] Items with sizes match by category + type + size
- [ ] Items without sizes match by category + type (size is null)
- [ ] If inventory is 0, return appropriate error or handle gracefully
- [ ] Transaction ensures atomicity (all or nothing)

---

## 7. Sample Data for Testing

```json
[
  {
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "XS",
    "quantity": 50
  },
  {
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "S",
    "quantity": 45
  },
  {
    "name": "Pants No 3",
    "category": "Uniform No 3",
    "type": "Pants No 3",
    "size": "M",
    "quantity": 60
  },
  {
    "name": "PVC Shoes",
    "category": "Uniform No 3",
    "type": "PVC Shoes",
    "size": "8",
    "quantity": 30
  },
  {
    "name": "Beret",
    "category": "Uniform No 3",
    "type": "Beret",
    "size": "7",
    "quantity": 40
  },
  {
    "name": "Apulet",
    "category": "Uniform No 3",
    "type": "Apulet",
    "size": null,
    "quantity": 100
  },
  {
    "name": "Beret Logo Pin",
    "category": "Uniform No 3",
    "type": "Beret Logo Pin",
    "size": null,
    "quantity": 150
  }
]
```

---

## 8. Implementation Notes

1. **Matching Logic**: When deducting inventory, match items using:
   - `category` (exact match)
   - `type` (case-insensitive, flexible matching)
   - `size` (exact match, or both null for accessories)

2. **Error Handling**: 
   - If inventory is insufficient, return a clear error message
   - Consider partial fulfillment if some items are available

3. **Performance**:
   - Use database indexes for fast lookups
   - Consider caching frequently accessed inventory data

4. **Audit Trail**:
   - Log all inventory changes (additions, deductions, updates)
   - Track which member caused each deduction

---

## 9. API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/inventory` | Get all inventory items | Admin |
| POST | `/api/inventory` | Add new inventory item | Admin |
| PUT | `/api/inventory/:id` | Update inventory item quantity | Admin |
| PUT | `/api/members/uniform` | Submit uniform (triggers deduction) | Member |

---

## 10. Frontend Integration

The frontend expects:
- All endpoints to return `{ success: true/false, message: "...", ... }`
- Inventory items to have: `id`, `name`, `category`, `type`, `size`, `quantity`
- Size can be `null` for accessories
- All responses should include proper error messages

---

**End of Specification**

