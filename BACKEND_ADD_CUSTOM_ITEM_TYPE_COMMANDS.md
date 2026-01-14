# Backend Commands: Add Custom Item Types Feature

## Overview
The frontend "Add Item" form now allows admins to create NEW item types that don't exist in the predefined list. The backend needs to support accepting and storing these custom item types.

## Current Frontend Implementation

The frontend will send requests to `POST /api/inventory` with:
- `category`: "Uniform No 3", "Uniform No 4", or "T-Shirt"
- `type`: Any custom string (e.g., "Custom Badge", "Special Uniform", "New Item Name")
- `size`: Size value or `null` for accessories
- `quantity`: Initial quantity (usually 0)
- `name`: Same as `type`

## Required Backend Changes

### 1. Update POST /api/inventory Endpoint

**Current Behavior:**
- The endpoint validates that `type` must match predefined types for each category
- Returns error: "Invalid type 'X' for category 'Y'. Valid types: ..."

**Required Change:**
- **Remove strict type validation** OR make it accept ANY type string
- Allow any `type` value as long as:
  - `category` is one of: "Uniform No 3", "Uniform No 4", "T-Shirt"
  - `type` is a non-empty string
  - `size` is valid format (or null)
  - `quantity` is a number >= 0

**Command:**
```
Update POST /api/inventory endpoint validation:
- Remove or relax the type validation that restricts to predefined types
- Allow ANY type string as long as category is valid
- Keep validation for: category (must be one of the 3 categories), type (non-empty string), size (string or null), quantity (number >= 0)
- Still check for duplicates: if item with same (category, type, size) exists, update quantity instead of creating duplicate
```

### 2. Update Type Validation Logic

**Current Code Pattern (Example):**
```javascript
// OLD - Strict validation (remove this)
const validTypes = {
  "Uniform No 3": ["Uniform No 3 Male", "Uniform No 3 Female", "PVC Shoes", ...],
  "Uniform No 4": ["Uniform No 4", "Boot", ...],
  "T-Shirt": ["Digital Shirt", "Company Shirt", ...]
};

if (!validTypes[category]?.includes(type)) {
  return res.status(400).json({
    success: false,
    message: `Invalid type "${type}" for category "${category}". Valid types: ${validTypes[category].join(", ")}`
  });
}
```

**New Code Pattern:**
```javascript
// NEW - Flexible validation (allow any type)
const validCategories = ["Uniform No 3", "Uniform No 4", "T-Shirt"];

if (!validCategories.includes(category)) {
  return res.status(400).json({
    success: false,
    message: `Invalid category "${category}". Valid categories: ${validCategories.join(", ")}`
  });
}

if (!type || typeof type !== "string" || type.trim().length === 0) {
  return res.status(400).json({
    success: false,
    message: "Type is required and must be a non-empty string"
  });
}

// Allow any type string - no restriction to predefined types
```

### 3. Database Considerations

**No Schema Changes Required:**
- The existing Inventory model/schema should already support any `type` string value
- The `type` field is typically a string with no enum restriction
- No migration needed if `type` is already a flexible string field

**Check:**
- Ensure `type` column in database is `VARCHAR` or `TEXT` (not ENUM)
- No database constraints limiting `type` to specific values

### 4. Response Format

**Keep Existing Response:**
- Success response format remains the same
- Return created/updated inventory item with all fields

**Example Response:**
```json
{
  "success": true,
  "message": "Inventory item created successfully",
  "inventory": {
    "id": "inv-123",
    "name": "Custom Badge Type",
    "category": "Uniform No 3",
    "type": "Custom Badge Type",
    "size": null,
    "quantity": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 5. Size Validation (Keep Existing)

**Size Format Handling:**
- For items with "shoe" or "boot" in type name: normalize "UK X" to "X"
- For other items: accept size as-is
- For accessories (size is null): accept null

**Command:**
```
Keep existing size normalization logic:
- If type.toLowerCase().includes("shoe") OR type.toLowerCase().includes("boot"):
  - Normalize size: Remove "UK" prefix (case-insensitive)
  - Example: "UK 13" → "13", "uk 5" → "5"
- For other items: Accept size as-is
- Allow null for accessories
```

### 6. Duplicate Check (Keep Existing)

**Current Behavior:**
- Check if item with same (category, type, size) exists
- If exists, update quantity instead of creating duplicate
- This should still work with custom types

**Command:**
```
Keep existing duplicate check logic:
- Check for existing item: { category, type, size }
- If exists: UPDATE quantity (add to existing or replace)
- If not exists: CREATE new item
- This works for both predefined and custom types
```

## Example API Requests

### Example 1: Create Custom Badge
```json
POST /api/inventory
{
  "category": "Uniform No 3",
  "type": "Custom Badge Type",
  "size": null,
  "quantity": 0,
  "name": "Custom Badge Type"
}
```

### Example 2: Create Custom Uniform with Sizes
```json
POST /api/inventory
{
  "category": "Uniform No 4",
  "type": "Special Edition Uniform",
  "size": "M",
  "quantity": 0,
  "name": "Special Edition Uniform"
}
```

### Example 3: Create Custom Shoe Type
```json
POST /api/inventory
{
  "category": "Uniform No 3",
  "type": "Custom Running Shoes",
  "size": "10",
  "quantity": 0,
  "name": "Custom Running Shoes"
}
```

## Testing Checklist

- [ ] Test creating item with completely new type name
- [ ] Test creating item with type that already exists (should update)
- [ ] Test creating item with custom type for each category (Uniform No 3, Uniform No 4, T-Shirt)
- [ ] Test size normalization for custom shoe/boot types
- [ ] Test creating accessory (no size) with custom type
- [ ] Test creating item with sizes array (multiple sizes)
- [ ] Verify no errors for custom type names
- [ ] Verify custom types appear in inventory list
- [ ] Verify custom types can be used in inventory management

## Migration Notes

**No Database Migration Required:**
- If `type` field is already a flexible string (VARCHAR/TEXT), no changes needed
- If `type` is currently an ENUM, you need to change it to VARCHAR/TEXT

**If Type is Currently ENUM:**
```sql
-- Example migration (adjust based on your database)
ALTER TABLE inventory MODIFY COLUMN type VARCHAR(255) NOT NULL;
-- Or for PostgreSQL:
ALTER TABLE inventory ALTER COLUMN type TYPE VARCHAR(255);
```

## Summary

**Key Changes:**
1. ✅ Remove strict type validation - allow ANY type string
2. ✅ Keep category validation (must be one of 3 categories)
3. ✅ Keep size normalization logic (for shoes/boots)
4. ✅ Keep duplicate check logic
5. ✅ Ensure database supports flexible type strings

**No Breaking Changes:**
- Existing predefined types will continue to work
- Custom types will be accepted alongside predefined types
- All existing functionality remains intact
