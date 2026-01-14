# Backend Commands: Update to 5-Category Structure

## Overview
The frontend has been updated to use a **5-category structure** for organizing uniform items, matching the user uniform interface. The backend needs to be updated to recognize and validate these new categories.

## Category Structure Changes

### Previous Structure (3 categories):
- Uniform No 3 (included accessories)
- Uniform No 4 (included accessories)
- T-Shirt

### New Structure (5 categories):
1. **Uniform No 3** - Main uniform items only (no accessories)
2. **Uniform No 4** - Main uniform items only (no accessories)
3. **Accessories No 3** - Accessories for Uniform No 3
4. **Accessories No 4** - Accessories for Uniform No 4
5. **Shirt** - All shirt types (renamed from T-Shirt)

---

## Required Backend Updates

### 1. Update Category Validation

**Location:** Validation middleware/models for uniform and inventory endpoints

**Command:**
```
Update category validation to accept all 5 categories:
- "Uniform No 3"
- "Uniform No 4"
- "Accessories No 3"
- "Accessories No 4"
- "Shirt" (or "T-Shirt" for backward compatibility)

Category validation should accept both old and new category names:
- Accept "T-Shirt" OR "Shirt" (map both to "Shirt" internally if needed)
- Accept items with category "Uniform No 3" OR "Accessories No 3" for accessories
- Accept items with category "Uniform No 4" OR "Accessories No 4" for accessories
```

**Example Validation Update:**
```javascript
// OLD
const validCategories = ["Uniform No 3", "Uniform No 4", "T-Shirt"];

// NEW
const validCategories = [
  "Uniform No 3",
  "Uniform No 4", 
  "Accessories No 3",
  "Accessories No 4",
  "Shirt",
  "T-Shirt" // For backward compatibility
];

// Category normalization function
const normalizeCategory = (category) => {
  const catLower = category?.toLowerCase() || "";
  if (catLower === "t-shirt" || catLower === "tshirt" || catLower === "shirt") {
    return "Shirt";
  }
  return category; // Keep original for others
};
```

---

### 2. Update Item Type Validation by Category

**Command:**
```
Update type validation to correctly map item types to their proper categories:

**Uniform No 3** (main items only - NO accessories):
- "Uniform No 3 Male" (or "Cloth No 3" for backward compatibility)
- "Uniform No 3 Female" (or "Pants No 3" for backward compatibility)
- "PVC Shoes"
- "Beret" ⚠️ **IMPORTANT: Beret is a MAIN ITEM with sizes, NOT an accessory. Do NOT treat it as an accessory type.**

**Uniform No 4** (main items only - NO accessories):
- "Uniform No 4" (or "Cloth No 4"/"Pants No 4" for backward compatibility)
- "Boot"

**Accessories No 3** (NEW category for Uniform No 3 accessories):
- "Apulet"
- "Integrity Badge"
- "Shoulder Badge" (NOT "Gold Badge" - Gold Badge should be removed)
- "Cel Bar"
- "Beret Logo Pin" ⚠️ **NOTE: "Beret Logo Pin" is an accessory, but "Beret" itself is NOT an accessory**
- "Belt No 3"
- "Nametag" (when associated with Uniform No 3)

**⚠️ CRITICAL VALIDATION RULE:**
- "Beret" (without "Logo Pin") is a MAIN ITEM in "Uniform No 3" category - it has sizes
- "Beret Logo Pin" is an ACCESSORY in "Accessories No 3" category - it has no size
- Do NOT add "Beret" to the list of accessory types. Only "Beret Logo Pin" is an accessory.

**Accessories No 4** (NEW category for Uniform No 4 accessories):
- "APM Tag"
- "Belt No 4"
- "Nametag" (when associated with Uniform No 4)

**Shirt** (renamed from T-Shirt):
- "Digital Shirt" (or "Digital" for backward compatibility)
- "Company Shirt" (or "Company" for backward compatibility)
- "Inner APM Shirt" (or "Inner APM" for backward compatibility)
```

---

### 3. Update POST /api/inventory Endpoint

**Command:**
```
Update POST /api/inventory endpoint validation:

1. Accept all 5 categories:
   - "Uniform No 3"
   - "Uniform No 4"
   - "Accessories No 3" (NEW)
   - "Accessories No 4" (NEW)
   - "Shirt" or "T-Shirt"

2. Validate item types match their category:
   - Accessories (Apulet, Integrity Badge, etc.) should accept category "Accessories No 3" OR "Uniform No 3" (for backward compatibility)
   - But PREFER "Accessories No 3" if provided
   - Same for Accessories No 4

3. Allow backward compatibility:
   - Accept accessories with category "Uniform No 3" but store them internally as "Accessories No 3"
   - Accept accessories with category "Uniform No 4" but store them internally as "Accessories No 4"
   - Accept "T-Shirt" but store as "Shirt"
```

**Example Implementation:**
```javascript
// Normalize category for storage
const normalizeCategoryForStorage = (category, itemType) => {
  const catLower = category?.toLowerCase() || "";
  const typeLower = itemType?.toLowerCase() || "";
  
  // Normalize Shirt category
  if (catLower === "t-shirt" || catLower === "tshirt" || catLower === "shirt") {
    return "Shirt";
  }
  
  // Move accessories to proper category
  const accessoryTypes = [
    "apulet", "integrity badge", "shoulder badge", "cel bar",
    "beret logo pin", "belt no 3", "nametag", "apm tag", "belt no 4"
  ];
  
  if (accessoryTypes.some(acc => typeLower.includes(acc))) {
    if (catLower.includes("uniform no 3") || catLower.includes("no 3")) {
      // Nametag needs context - check original category
      if (typeLower.includes("nametag")) {
        if (catLower.includes("uniform no 4") || catLower.includes("no 4")) {
          return "Accessories No 4";
        }
        return "Accessories No 3";
      }
      if (typeLower.includes("apm tag") || typeLower.includes("belt no 4")) {
        return "Accessories No 4";
      }
      return "Accessories No 3";
    }
    if (catLower.includes("uniform no 4") || catLower.includes("no 4")) {
      return "Accessories No 4";
    }
  }
  
  return category; // Return as-is if no normalization needed
};

// Use in validation:
const normalizedCategory = normalizeCategoryForStorage(req.body.category, req.body.type);
req.body.category = normalizedCategory; // Store normalized category
```

---

### 4. Update PUT /api/members/uniform Endpoint

**Command:**
```
Update PUT /api/members/uniform endpoint:

1. Accept items with all 5 categories
2. Normalize categories when saving:
   - If item type is an accessory but category is "Uniform No 3", normalize to "Accessories No 3"
   - If item type is an accessory but category is "Uniform No 4", normalize to "Accessories No 4"
   - Accept "T-Shirt" but store as "Shirt"

3. When fetching uniform data (GET /api/members/uniform):
   - Return items with their normalized categories
   - Accessories should have category "Accessories No 3" or "Accessories No 4"
   - Shirts should have category "Shirt" (not "T-Shirt")

4. Inventory deduction should work with normalized categories:
   - When deducting inventory, match items using normalized category
   - Example: If member saves "Apulet" with category "Uniform No 3", normalize to "Accessories No 3" and deduct from inventory item with category "Accessories No 3"
```

---

### 5. Update GET /api/inventory Endpoint

**Command:**
```
Update GET /api/inventory endpoint:

1. Return items grouped by the 5 categories
2. Normalize categories before returning:
   - Accessories stored in "Uniform No 3" should be returned with category "Accessories No 3"
   - Accessories stored in "Uniform No 4" should be returned with category "Accessories No 4"
   - Items with category "T-Shirt" should be returned as "Shirt"

3. Support filtering by category:
   - Accept query parameter ?category=Accessories No 3
   - Return only items in that category
```

---

### 6. Database Migration (Optional but Recommended)

**Command:**
```
If you want to migrate existing data to the new category structure:

**SQL Command (PostgreSQL/MySQL):**
```sql
-- Migrate accessories from Uniform No 3 to Accessories No 3
UPDATE inventory 
SET category = 'Accessories No 3'
WHERE category = 'Uniform No 3' 
  AND type IN ('Apulet', 'Integrity Badge', 'Shoulder Badge', 'Cel Bar', 'Beret Logo Pin', 'Belt No 3');

-- Migrate Nametag from Uniform No 3 to Accessories No 3
UPDATE inventory 
SET category = 'Accessories No 3'
WHERE category = 'Uniform No 3' AND type = 'Nametag';

-- Migrate accessories from Uniform No 4 to Accessories No 4
UPDATE inventory 
SET category = 'Accessories No 4'
WHERE category = 'Uniform No 4' 
  AND type IN ('APM Tag', 'Belt No 4');

-- Migrate Nametag from Uniform No 4 to Accessories No 4
UPDATE inventory 
SET category = 'Accessories No 4'
WHERE category = 'Uniform No 4' AND type = 'Nametag';

-- Migrate T-Shirt to Shirt
UPDATE inventory 
SET category = 'Shirt'
WHERE category = 'T-Shirt';

-- Also update member_uniforms table if using JSON storage
-- (Implementation depends on your database structure)
```

**Note:** If using JSON storage, you'll need to parse and update the JSON field.

---

### 7. Item Type Mapping Reference

**For Validation Logic:**

```javascript
const ITEM_TYPE_CATEGORIES = {
  // Uniform No 3 - Main Items
  "Uniform No 3": [
    "Uniform No 3 Male", "Cloth No 3", // Backward compatible
    "Uniform No 3 Female", "Pants No 3", // Backward compatible
    "PVC Shoes",
    "Beret"
  ],
  
  // Uniform No 4 - Main Items
  "Uniform No 4": [
    "Uniform No 4", "Cloth No 4", "Pants No 4", // Backward compatible
    "Boot"
  ],
  
  // Accessories No 3
  "Accessories No 3": [
    "Apulet",
    "Integrity Badge",
    "Shoulder Badge", // NOT "Gold Badge"
    "Cel Bar",
    "Beret Logo Pin",
    "Belt No 3",
    "Nametag" // When from Uniform No 3 context
  ],
  
  // Accessories No 4
  "Accessories No 4": [
    "APM Tag",
    "Belt No 4",
    "Nametag" // When from Uniform No 4 context
  ],
  
  // Shirt
  "Shirt": [
    "Digital Shirt", "Digital", // Backward compatible
    "Company Shirt", "Company", // Backward compatible
    "Inner APM Shirt", "Inner APM", "Inner APM Shirt" // Backward compatible
  ]
};

// Validation function
const isValidItemTypeForCategory = (category, itemType) => {
  const normalizedCat = normalizeCategory(category);
  const validTypes = ITEM_TYPE_CATEGORIES[normalizedCat] || [];
  const typeLower = itemType?.toLowerCase() || "";
  
  return validTypes.some(validType => 
    typeLower === validType.toLowerCase() || 
    typeLower.includes(validType.toLowerCase()) ||
    validType.toLowerCase().includes(typeLower)
  );
};
```

---

### 8. Backward Compatibility

**Important:** The backend should support BOTH old and new category structures:

**Accept:**
- ✅ Items with category "Uniform No 3" and type "Apulet" (old way)
- ✅ Items with category "Accessories No 3" and type "Apulet" (new way)
- ✅ Category "T-Shirt" OR "Shirt"
- ✅ Type "Cloth No 3" OR "Uniform No 3 Male"
- ✅ Type "Pants No 3" OR "Uniform No 3 Female"

**Store/Return:**
- Always use the NEW category structure internally:
  - Store accessories as "Accessories No 3" or "Accessories No 4"
  - Store shirts as "Shirt"
  - Return data using new categories

---

### 9. API Endpoints to Update

#### 9.1 POST /api/inventory
- ✅ Accept all 5 categories
- ✅ Normalize categories before saving
- ✅ Validate item types match normalized category

#### 9.2 PUT /api/inventory/:id
- ✅ Allow updating category if needed
- ✅ Validate new category is one of 5 categories

#### 9.3 GET /api/inventory
- ✅ Return items with normalized categories
- ✅ Support filtering by any of 5 categories

#### 9.4 POST /api/members/uniform
- ✅ Accept items with all 5 categories
- ✅ Normalize categories before saving
- ✅ Deduct inventory using normalized categories

#### 9.5 PUT /api/members/uniform
- ✅ Same as POST
- ✅ Return updated items with normalized categories

#### 9.6 GET /api/members/uniform
- ✅ Return items with normalized categories
- ✅ Accessories should have "Accessories No 3" or "Accessories No 4"
- ✅ Shirts should have "Shirt" category

#### 9.7 GET /api/members/:sispaId/uniform (Admin endpoint)
- ✅ Same as GET /api/members/uniform
- ✅ Return normalized categories

---

### 10. Error Handling

**Command:**
```
Update error messages to reflect new category structure:

- When validation fails: "Invalid category. Must be one of: Uniform No 3, Uniform No 4, Accessories No 3, Accessories No 4, Shirt"
- When type doesn't match category: "Item type '{type}' is not valid for category '{category}'. Valid types for {category} are: {list}"
- When category is deprecated: Accept it but log a warning that old category names are being phased out
```

---

### 11. Testing Checklist

**Category Validation:**
- [ ] POST /api/inventory accepts "Accessories No 3" category
- [ ] POST /api/inventory accepts "Accessories No 4" category
- [ ] POST /api/inventory accepts "Shirt" category (not just "T-Shirt")
- [ ] POST /api/inventory still accepts "T-Shirt" (backward compatibility)
- [ ] POST /api/inventory still accepts accessories with "Uniform No 3" category (backward compatibility)
- [ ] POST /api/inventory normalizes old categories to new ones

**Type Validation:**
- [ ] Rejects accessories in "Uniform No 3" category (or normalizes them)
- [ ] Accepts "Uniform No 3 Male" in "Uniform No 3" category
- [ ] Accepts "Apulet" in "Accessories No 3" category
- [ ] Rejects "Gold Badge" (should be removed)
- [ ] Accepts "Shoulder Badge" in "Accessories No 3" category

**Member Uniform Endpoints:**
- [ ] POST /api/members/uniform accepts items with "Accessories No 3" category
- [ ] PUT /api/members/uniform accepts items with "Accessories No 3" category
- [ ] GET /api/members/uniform returns accessories with "Accessories No 3" category
- [ ] Inventory deduction works correctly for "Accessories No 3" items
- [ ] Inventory deduction works correctly for "Accessories No 4" items

**Inventory Endpoints:**
- [ ] GET /api/inventory returns items with normalized categories
- [ ] Can filter by "Accessories No 3" category
- [ ] Can filter by "Accessories No 4" category
- [ ] Can filter by "Shirt" category

---

### 12. Migration Strategy

**Recommended Approach:**

1. **Phase 1: Accept Both (Immediate)**
   - Update validation to accept all 5 categories
   - Accept backward-compatible category names
   - Normalize and store with new categories
   - This allows frontend to work immediately

2. **Phase 2: Return Normalized (Immediate)**
   - Always return data with new category structure
   - This ensures frontend displays correctly

3. **Phase 3: Data Migration (Optional, can be done later)**
   - Migrate existing database records
   - Update all old category names to new ones
   - This is optional if normalization handles it

---

### 13. Example API Requests

**Creating Inventory Item (Accessories No 3):**
```json
POST /api/inventory
{
  "category": "Accessories No 3",
  "type": "Apulet",
  "size": null,
  "quantity": 100
}
```

**Saving Member Uniform (with Accessories No 3):**
```json
PUT /api/members/uniform
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Accessories No 3",
      "type": "Apulet",
      "size": "N/A",
      "quantity": 1
    },
    {
      "category": "Accessories No 3",
      "type": "Integrity Badge",
      "size": "N/A",
      "quantity": 1
    }
  ]
}
```

**Backward Compatible Request (should still work):**
```json
PUT /api/members/uniform
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3", // Old type name
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Uniform No 3", // Old category for accessory
      "type": "Apulet",
      "size": "N/A",
      "quantity": 1
    }
  ]
}
```
*Backend should normalize this to:*
- First item: category="Uniform No 3", type="Uniform No 3 Male"
- Second item: category="Accessories No 3", type="Apulet"

---

### 14. Type Name Normalization

**Command:**
```
Implement type name normalization to handle both old and new type names:

```javascript
const normalizeTypeName = (category, type) => {
  const catLower = category?.toLowerCase() || "";
  const typeLower = type?.toLowerCase() || "";
  
  // Uniform No 3 types
  if (typeLower.includes("cloth no 3") && typeLower.includes("male")) return "Uniform No 3 Male";
  if (typeLower.includes("pants no 3") && typeLower.includes("female")) return "Uniform No 3 Female";
  if (typeLower.includes("cloth no 3") || typeLower === "cloth no 3") return "Uniform No 3 Male";
  if (typeLower.includes("pants no 3") || typeLower === "pants no 3") return "Uniform No 3 Female";
  
  // Uniform No 4 types
  if (typeLower.includes("cloth no 4") || typeLower.includes("pants no 4")) return "Uniform No 4";
  if (typeLower === "uniform no 4") return "Uniform No 4";
  
  // Shirt types
  if (typeLower === "digital" || typeLower.includes("digital")) return "Digital Shirt";
  if (typeLower === "company" || typeLower.includes("company")) return "Company Shirt";
  if (typeLower.includes("inner apm") || typeLower === "innerapm") return "Inner APM Shirt";
  
  // Accessories - ensure correct names
  if (typeLower.includes("gold badge")) return "Shoulder Badge"; // Migrate Gold Badge to Shoulder Badge
  if (typeLower.includes("apm tag")) return "APM Tag";
  
  return type; // Return original if no normalization needed
};
```

---

### 15. Critical Fixes Needed

**HIGH PRIORITY:**

1. **Accept "Accessories No 3" category**
   - Currently causing Error 500 when admin tries to save items
   - Validation is rejecting the category

2. **Accept "Accessories No 4" category**
   - Same as above

3. **Accept "Shirt" category**
   - Currently might only accept "T-Shirt"
   - Need to accept both

4. **Remove "Gold Badge" support**
   - Should reject "Gold Badge" type
   - Should migrate existing "Gold Badge" to "Shoulder Badge"

5. **🔴 CRITICAL: Fix Beret Validation**
   - **Problem:** Backend is incorrectly rejecting "Beret" with category "Uniform No 3" because it thinks "Beret" is an accessory
   - **Error Message:** "Invalid category 'Uniform No 3' for accessory type 'Beret'"
   - **Solution:** 
     - **"Beret" is a MAIN ITEM** in "Uniform No 3" category (has sizes like "7 1/4", "7 1/2", etc.)
     - **"Beret Logo Pin"** is an ACCESSORY in "Accessories No 3" category (has no size)
     - **DO NOT** add "Beret" to the list of accessory types in validation
     - Only "Beret Logo Pin" should be in the accessory types list
     - Update validation logic to allow "Beret" type with "Uniform No 3" category
     - Validation should check: if type is "Beret" (not "Beret Logo Pin"), then category must be "Uniform No 3", and size must NOT be empty

6. **Inventory Deduction**
   - When member saves uniform with category "Accessories No 3", deduct from inventory with category "Accessories No 3"
   - If inventory item has category "Uniform No 3" but type is "Apulet", still allow deduction (backward compatibility)

---

### 16. Quick Fix Implementation

**Minimum Changes Needed (Quick Fix):**

```javascript
// In validation middleware/controller
const VALID_CATEGORIES = [
  "Uniform No 3",
  "Uniform No 4",
  "Accessories No 3", // ADD THIS
  "Accessories No 4", // ADD THIS
  "Shirt",            // ADD THIS
  "T-Shirt"           // Keep for backward compatibility
];

// Normalize before validation
req.body.category = normalizeCategory(req.body.category, req.body.type);

// Normalize function
function normalizeCategory(category, type) {
  if (!category) return category;
  
  const catLower = category.toLowerCase();
  const typeLower = (type || "").toLowerCase();
  
  // Normalize Shirt
  if (catLower === "t-shirt" || catLower === "tshirt" || catLower === "shirt") {
    return "Shirt";
  }
  
  // Normalize accessories
  const accessoryTypes = ["apulet", "integrity badge", "shoulder badge", "cel bar", 
                          "beret logo pin", "belt no 3", "apm tag", "belt no 4"];
  
  if (accessoryTypes.some(acc => typeLower.includes(acc))) {
    if (catLower.includes("no 3") || catLower.includes("uniform no 3")) {
      if (typeLower.includes("apm tag") || typeLower.includes("belt no 4")) {
        return "Accessories No 4";
      }
      return "Accessories No 3";
    }
    if (catLower.includes("no 4") || catLower.includes("uniform no 4")) {
      return "Accessories No 4";
    }
  }
  
  // Handle Nametag based on context
  if (typeLower.includes("nametag")) {
    if (catLower.includes("no 4") || catLower.includes("uniform no 4")) {
      return "Accessories No 4";
    }
    if (catLower.includes("no 3") || catLower.includes("uniform no 3")) {
      return "Accessories No 3";
    }
  }
  
  return category;
}
```

---

## Summary

**Key Changes:**
1. ✅ Add "Accessories No 3" as valid category
2. ✅ Add "Accessories No 4" as valid category  
3. ✅ Add "Shirt" as valid category (in addition to "T-Shirt")
4. ✅ Update validation to accept accessories in new categories
5. ✅ Implement category normalization for backward compatibility
6. ✅ Update inventory deduction to use normalized categories
7. ✅ Return data with normalized categories in GET endpoints

**Testing Priority:**
1. Test POST /api/inventory with "Accessories No 3" category
2. Test PUT /api/members/uniform with "Accessories No 3" items
3. Test GET endpoints return normalized categories
4. Test backward compatibility with old category names

---

**End of Commands**
