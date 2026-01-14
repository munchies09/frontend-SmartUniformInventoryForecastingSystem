# Backend Commands: Gold Badge to Shoulder Badge Migration

## Overview
This document outlines the required backend changes to rename "Gold Badge" to "Shoulder Badge" throughout the system. This change affects inventory records, uniform records, validation logic, and any references in the codebase.

---

## 1. Database Migration

### 1.1 Update Inventory Table
Update all inventory records that have `type = 'Gold Badge'` to `type = 'Shoulder Badge'`.

**SQL Command (PostgreSQL/MySQL):**
```sql
-- Update inventory table
UPDATE inventory 
SET type = 'Shoulder Badge' 
WHERE type = 'Gold Badge';

-- Verify the update
SELECT COUNT(*) as updated_count 
FROM inventory 
WHERE type = 'Shoulder Badge';

-- Check if any Gold Badge records remain
SELECT COUNT(*) as remaining_count 
FROM inventory 
WHERE type = 'Gold Badge';
```

### 1.2 Update Uniform Items Table (if exists)
If you have a separate table for uniform items, update those records as well.

**SQL Command:**
```sql
-- Update uniform_items table (if applicable)
UPDATE uniform_items 
SET type = 'Shoulder Badge' 
WHERE type = 'Gold Badge';

-- Verify the update
SELECT COUNT(*) as updated_count 
FROM uniform_items 
WHERE type = 'Shoulder Badge';
```

### 1.3 Update Member Uniform Records
Update all member uniform records that reference "Gold Badge".

**SQL Command:**
```sql
-- If storing as JSON or text
UPDATE member_uniforms 
SET items = REPLACE(items, '"type": "Gold Badge"', '"type": "Shoulder Badge"')
WHERE items LIKE '%Gold Badge%';

-- Or if using a separate items table
UPDATE uniform_item_records 
SET type = 'Shoulder Badge' 
WHERE type = 'Gold Badge';
```

---

## 2. Backend Code Changes

### 2.1 Update Validation Rules

**Location:** Inventory validation middleware/models

**Change:**
```javascript
// OLD
const validTypes = {
  "Uniform No 3": ["Uniform No 3 Male", "Uniform No 3 Female", "Cloth No 3", "Pants No 3", 
                   "PVC Shoes", "Shoe", "Beret", "Apulet", "Integrity Badge", "Gold Badge", 
                   "Cel Bar", "Beret Logo Pin", "Belt No 3", "Nametag"]
};

// NEW
const validTypes = {
  "Uniform No 3": ["Uniform No 3 Male", "Uniform No 3 Female", "Cloth No 3", "Pants No 3", 
                   "PVC Shoes", "Shoe", "Beret", "Apulet", "Integrity Badge", "Shoulder Badge", 
                   "Cel Bar", "Beret Logo Pin", "Belt No 3", "Nametag"]
};
```

**Files to update:**
- `models/Inventory.js` (or equivalent)
- `middleware/validateInventory.js` (or equivalent)
- `controllers/inventoryController.js` (or equivalent)
- Any constants/enums file defining item types

### 2.2 Update Type Checking Logic

**Location:** Any file that checks for "Gold Badge" specifically

**Change:**
```javascript
// OLD
if (type.toLowerCase().includes("gold badge")) {
  // handle gold badge
}

// NEW
if (type.toLowerCase().includes("shoulder badge")) {
  // handle shoulder badge
}
```

**Files to check:**
- `controllers/inventoryController.js`
- `controllers/uniformController.js`
- `services/inventoryService.js`
- `utils/uniformHelpers.js`

### 2.3 Update Case-Insensitive Comparisons

**Location:** Type matching logic

**Change:**
```javascript
// OLD
const normalizedType = type.toLowerCase();
if (normalizedType === "gold badge" || normalizedType.includes("gold badge")) {
  // ...
}

// NEW
const normalizedType = type.toLowerCase();
if (normalizedType === "shoulder badge" || normalizedType.includes("shoulder badge")) {
  // ...
}
```

---

## 3. API Response Updates

### 3.1 Ensure Consistent Naming

All API endpoints should return "Shoulder Badge" instead of "Gold Badge":

**Endpoints to verify:**
- `GET /api/inventory` - Should return `type: "Shoulder Badge"`
- `GET /api/inventory/by-attributes` - Should accept and return "Shoulder Badge"
- `GET /api/members/:sispaId/uniform` - Should return `type: "Shoulder Badge"`
- `POST /api/members/uniform` - Should accept `type: "Shoulder Badge"`
- `PUT /api/members/uniform` - Should accept `type: "Shoulder Badge"`

**Example Response (Before):**
```json
{
  "success": true,
  "inventory": [
    {
      "id": 123,
      "category": "Uniform No 3",
      "type": "Gold Badge",
      "size": null,
      "quantity": 50
    }
  ]
}
```

**Example Response (After):**
```json
{
  "success": true,
  "inventory": [
    {
      "id": 123,
      "category": "Uniform No 3",
      "type": "Shoulder Badge",
      "size": null,
      "quantity": 50
    }
  ]
}
```

---

## 4. Frontend-Backend Compatibility

### 4.1 Accept Both Names (Temporary - Optional)

For backward compatibility during migration, you may want to temporarily accept both names:

```javascript
// Temporary compatibility layer (optional)
const normalizeType = (type) => {
  const normalized = type?.toLowerCase() || "";
  if (normalized.includes("gold badge")) {
    return "Shoulder Badge";
  }
  return type; // Return as-is for other types
};

// Use in validation
const processedType = normalizeType(req.body.type);
```

**Note:** This is only needed if you want to support old frontend versions during migration. Since the frontend is already updated, this may not be necessary.

---

## 5. Testing Checklist

After implementing the changes, test the following:

### 5.1 Inventory Tests
- [ ] Create new inventory item with `type: "Shoulder Badge"`
- [ ] Fetch inventory items - verify "Shoulder Badge" appears correctly
- [ ] Update inventory quantity for "Shoulder Badge"
- [ ] Delete inventory item with "Shoulder Badge"
- [ ] Search/filter by "Shoulder Badge"

### 5.2 Uniform Management Tests
- [ ] Member can save uniform with "Shoulder Badge"
- [ ] Member can update uniform with "Shoulder Badge"
- [ ] Admin can view member uniform with "Shoulder Badge"
- [ ] Reports display "Shoulder Badge" correctly

### 5.3 Data Integrity Tests
- [ ] Verify all old "Gold Badge" records were migrated to "Shoulder Badge"
- [ ] Verify no orphaned "Gold Badge" records remain
- [ ] Verify relationships between tables are maintained
- [ ] Verify historical data is preserved (if using audit logs)

### 5.4 API Endpoint Tests
- [ ] `GET /api/inventory` returns "Shoulder Badge"
- [ ] `POST /api/inventory` accepts "Shoulder Badge"
- [ ] `PUT /api/inventory/:id` accepts "Shoulder Badge"
- [ ] `GET /api/members/:sispaId/uniform` returns "Shoulder Badge"
- [ ] `POST /api/members/uniform` accepts "Shoulder Badge"
- [ ] `PUT /api/members/uniform` accepts "Shoulder Badge"

---

## 6. Rollback Plan

If you need to rollback, use these commands:

**SQL Rollback:**
```sql
-- Rollback inventory table
UPDATE inventory 
SET type = 'Gold Badge' 
WHERE type = 'Shoulder Badge';

-- Rollback uniform items
UPDATE uniform_items 
SET type = 'Gold Badge' 
WHERE type = 'Shoulder Badge';

-- Rollback member uniforms
UPDATE uniform_item_records 
SET type = 'Gold Badge' 
WHERE type = 'Shoulder Badge';
```

**Code Rollback:**
- Revert all validation rules back to "Gold Badge"
- Revert all type checking logic
- Redeploy backend code

---

## 7. Implementation Steps

1. **Backup Database**
   ```bash
   # Create backup before migration
   pg_dump your_database > backup_before_migration.sql
   # Or for MySQL
   mysqldump your_database > backup_before_migration.sql
   ```

2. **Update Code First**
   - Update validation rules
   - Update type checking logic
   - Update constants/enums
   - Deploy backend code

3. **Run Database Migration**
   - Execute SQL commands to update existing records
   - Verify updates with SELECT queries

4. **Test Thoroughly**
   - Run all tests from checklist
   - Test with frontend
   - Verify data integrity

5. **Monitor**
   - Check logs for errors
   - Monitor API responses
   - Verify frontend displays correctly

---

## 8. Notes

- The frontend has already been updated to use "Shoulder Badge"
- The image path has changed from `/goldbadge.png` to `/shoulderbadge.png` (frontend only)
- All variable names in frontend changed from `goldBadge` to `shoulderBadge`
- Ensure backend validation accepts the exact string "Shoulder Badge" (case-sensitive matching)
- Consider using case-insensitive comparisons for better compatibility

---

## 9. Files to Modify (Backend)

Based on typical Node.js/Express structure:

```
backend/
├── models/
│   ├── Inventory.js          # Update type validation
│   └── UniformItem.js        # Update type validation
├── controllers/
│   ├── inventoryController.js # Update type checking
│   └── uniformController.js   # Update type checking
├── middleware/
│   └── validateInventory.js   # Update validation rules
├── services/
│   └── inventoryService.js    # Update type processing
├── utils/
│   └── constants.js           # Update type constants
└── migrations/                # Create migration file (if using migrations)
    └── 20250101_rename_gold_to_shoulder_badge.js
```

---

## 10. Example Migration Script (Node.js with Prisma/Sequelize)

If using an ORM, create a migration script:

**Prisma:**
```javascript
// migrations/rename_gold_to_shoulder_badge.js
async function up() {
  await prisma.inventory.updateMany({
    where: { type: 'Gold Badge' },
    data: { type: 'Shoulder Badge' }
  });
}

async function down() {
  await prisma.inventory.updateMany({
    where: { type: 'Shoulder Badge' },
    data: { type: 'Gold Badge' }
  });
}
```

**Sequelize:**
```javascript
// migrations/20250101_rename_gold_to_shoulder_badge.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      UPDATE inventory 
      SET type = 'Shoulder Badge' 
      WHERE type = 'Gold Badge'
    `);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      UPDATE inventory 
      SET type = 'Gold Badge' 
      WHERE type = 'Shoulder Badge'
    `);
  }
};
```

---

**End of Document**
