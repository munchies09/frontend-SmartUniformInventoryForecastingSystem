# Backend Inventory Implementation Commands

## Quick Start Commands for Backend Cursor Agent

### 1. Create Inventory Model/Schema

**Command:**
```
Create an Inventory model with the following fields:
- id (primary key)
- name (string, required)
- category (string, required) - values: "Uniform No 3", "Uniform No 4", "T-Shirt"
- type (string, required) - item type like "Cloth No 3", "Pants No 3", "PVC Shoes", "Beret", "Apulet", "Integrity Badge", "Gold Badge", "Cel Bar", "Beret Logo Pin", "Belt No 3", "Cloth No 4", "Pants No 4", "Boot", "APM Tag", "Belt No 4", "Digital", "Inner APM", "Company"
- size (string, nullable) - sizes like "XS", "S", "M", "L", "XL", "2XL", "3XL" for clothes, UK sizes for shoes/boots, beret sizes for beret, or NULL for accessories
- quantity (integer, required, default 0)
- createdAt (datetime)
- updatedAt (datetime)

Add unique constraint on (category, type, size) to prevent duplicates.
Add indexes on category, type, and (category, type, size) for performance.
```

### 2. Create GET /api/inventory Endpoint

**Command:**
```
Create GET /api/inventory endpoint that:
- Requires admin authentication (check role === "admin")
- Returns all inventory items
- Response format: { success: true, inventory: [...] }
- Each item should have: id, name, category, type, size (can be null), quantity, createdAt, updatedAt
- Return 401 if not authenticated
- Return 403 if not admin
```

### 3. Create POST /api/inventory Endpoint

**Command:**
```
Create POST /api/inventory endpoint that:
- Requires admin authentication (check role === "admin")
- Accepts: { name, category, type, size (optional/nullable), quantity }
- Validates:
  * category must be "Uniform No 3", "Uniform No 4", or "T-Shirt"
  * type must match the category (see valid types in spec)
  * size is required for items with sizes, must be null for accessories
  * quantity must be >= 0
- If item with same (category, type, size) exists, UPDATE quantity (add to existing) instead of creating duplicate
- Response format: { success: true, message: "...", inventory: {...} }
- Return 400 for validation errors
- Return 401 if not authenticated
- Return 403 if not admin
```

### 4. Create PUT /api/inventory/:id Endpoint

**Command:**
```
Create PUT /api/inventory/:id endpoint that:
- Requires admin authentication (check role === "admin")
- Accepts: { quantity }
- Updates the quantity of the inventory item
- Response format: { success: true, message: "...", inventory: {...} }
- Return 404 if item not found
- Return 401 if not authenticated
- Return 403 if not admin
```

### 5. Integrate Inventory Deduction with Uniform Submission

**Command:**
```
Modify PUT /api/members/uniform endpoint to:
- After saving uniform data, deduct inventory for each item
- For each item in the uniform.items array:
  * Match inventory by: category, type, and size
  * For accessories (no size), match by category and type only (size is null)
  * Deduct 1 from quantity (ensure it doesn't go below 0)
  * If quantity is 0, return error: "Item [type] size [size] is out of stock"
- Use database transaction to ensure atomicity (all items deducted or none)
- If any item is out of stock, rollback transaction and return error
- Log inventory deductions for audit trail
```

### 6. Valid Item Types Reference

**Uniform No 3:**
- With sizes: Cloth No 3 (XS-3XL), Pants No 3 (XS-3XL), PVC Shoes (UK 4-12), Beret (6 1/2 - 8 3/8)
- Without sizes: Apulet, Integrity Badge, Gold Badge, Cel Bar, Beret Logo Pin, Belt No 3

**Uniform No 4:**
- With sizes: Cloth No 4 (XS-3XL), Pants No 4 (XS-3XL), Boot (UK 2-12)
- Without sizes: APM Tag, Belt No 4

**T-Shirt:**
- With sizes: Digital (XS-3XL), Inner APM (XS-3XL), Company (XS-3XL)

### 7. Testing Commands

**Command:**
```
Create test cases for:
1. Admin can add inventory item with size
2. Admin can add inventory item without size (accessory)
3. Adding duplicate item (same category, type, size) updates quantity instead of creating duplicate
4. Validation errors for invalid category, type, or quantity
5. Non-admin cannot add/view/update inventory (403)
6. Unauthenticated user cannot access inventory (401)
7. When member submits uniform, inventory is deducted correctly
8. If inventory is 0, uniform submission fails with clear error
9. Transaction ensures all-or-nothing deduction
```

### 8. Database Migration

**Command:**
```
Create database migration to:
- Create inventory table with all required fields
- Add unique constraint on (category, type, size)
- Add indexes on category, type, and (category, type, size)
- Set default quantity to 0
```

---

## Quick Reference: API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inventory` | Admin | Get all inventory items |
| POST | `/api/inventory` | Admin | Add/update inventory item |
| PUT | `/api/inventory/:id` | Admin | Update inventory quantity |
| PUT | `/api/members/uniform` | Member | Submit uniform (deducts inventory) |

---

## Important Notes

1. **Size Handling**: 
   - Items with sizes: Cloth, Pants, Shoes, Boots, Beret, T-Shirts
   - Items without sizes (size = null): All accessories (Apulet, Badges, Tags, Pins, Belts, Cel Bar)

2. **Matching Logic for Deduction**:
   - Match by: `category` (exact) + `type` (case-insensitive) + `size` (exact or both null)

3. **Duplicate Prevention**:
   - When adding inventory, if (category, type, size) already exists, UPDATE quantity instead of creating duplicate

4. **Transaction Safety**:
   - Use database transactions when deducting multiple items
   - If any item is unavailable, rollback entire transaction

---

**See BACKEND_INVENTORY_API_SPEC.md for complete detailed specification.**

