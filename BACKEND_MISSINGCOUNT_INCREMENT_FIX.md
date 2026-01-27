# Backend MissingCount Increment Fix

## Issue
The backend is always sending `missingCount = 0` instead of reading the existing value from the database and incrementing it. This causes the frontend to display "Missing (0)" or just "Missing" instead of showing the incremented count.

## Expected Behavior
Every time status is "Missing", the backend should:
1. Read the current `missingCount` from the database
2. Increment it by 1
3. Save the new value
4. Return it in the response

**Increment Flow:**
- First save with status "Missing": missingCount = 0 → 1
- Second save with status "Missing": missingCount = 1 → 2
- Third save with status "Missing": missingCount = 2 → 3
- Status changes to "Available": missingCount = 3 (preserved)
- Status changes back to "Missing": missingCount = 3 → 4

## Files to Fix

### 1. `src/controllers/uniformController.ts`
**Location:** Where uniform items are saved/updated (likely in `saveUniform` or `updateUniform` function)

**Current Problem:**
- Backend is initializing `missingCount` to 0 every time
- Not reading existing value from database before incrementing

**Fix Needed:**
```typescript
// When processing items with status="Missing"
if (item.status === "Missing") {
  // CRITICAL: Read existing missingCount from database, not from request
  const existingItem = await UniformItem.findOne({
    sispaId: uniform.sispaId,
    category: item.category,
    type: item.type
  });
  
  // Get current missingCount from database (default to 0 if doesn't exist)
  const currentMissingCount = existingItem?.missingCount ?? 0;
  
  // Increment by 1
  item.missingCount = currentMissingCount + 1;
  
  console.log(`✅ Incremented missingCount for ${item.type}: ${currentMissingCount} → ${item.missingCount}`);
}
```

### 2. `src/models/uniformModel.ts`
**Verify the schema:**
- `missingCount` should have `default: 0` (already correct based on previous fixes)
- Ensure the field is properly defined and indexed if needed

### 3. `src/controllers/uniformController.ts` - Formatter
**Location:** `formatUniformItemsWithStatus` function (around lines 650-678)

**Current Code (from user's description):**
```typescript
if (item.status === 'Missing') {
  const itemMissingCount = item.missingCount !== undefined && item.missingCount !== null
    ? Number(item.missingCount)
    : null;

  // NOW: sends actual DB value, even 0
  if (itemMissingCount !== null) {
    itemData.missingCount = itemMissingCount;
    console.log(`✅ Including missingCount for ${item.type}: ${itemMissingCount} (from database, raw: ${JSON.stringify(item.missingCount)})`);
  } else {
    itemData.missingCount = 1;
    console.log(`⚠️  Item ${item.type} has status "Missing" but missingCount is not set (null/undefined) - defaulting to 1 for display`);
  }
}
```

**Issue:** This formatter is correct - it sends whatever is in the database. The problem is that the database value is always 0 because it's not being incremented during save.

## Step-by-Step Fix

### Step 1: Find where items are saved
Look for the function that processes uniform items before saving to database (likely in `uniformController.ts`):
- `saveUniform` function
- `updateUniform` function
- Or similar function that handles POST/PUT requests to `/api/uniforms/my-uniform`

### Step 2: Add increment logic BEFORE saving
Before saving items to database, for each item with `status === "Missing"`:

```typescript
// For each item in the request
for (const item of itemsToSave) {
  if (item.status === "Missing") {
    // Find existing item in database
    const existingItem = await UniformItem.findOne({
      sispaId: uniform.sispaId,
      category: item.category,
      type: item.type
    });
    
    if (existingItem && existingItem.missingCount !== undefined && existingItem.missingCount !== null) {
      // Item exists - increment existing count
      item.missingCount = existingItem.missingCount + 1;
      console.log(`✅ Incremented missingCount for ${item.type}: ${existingItem.missingCount} → ${item.missingCount}`);
    } else {
      // New item or missingCount not set - start at 1
      item.missingCount = 1;
      console.log(`✅ Initialized missingCount for ${item.type}: 1`);
    }
  } else if (item.status === "Available" || item.status === "Not Available") {
    // Preserve existing missingCount if status is not "Missing"
    if (existingItem && existingItem.missingCount !== undefined && existingItem.missingCount !== null) {
      item.missingCount = existingItem.missingCount;
      console.log(`✅ Preserved missingCount for ${item.type}: ${existingItem.missingCount}`);
    }
  }
  
  // Now save the item with correct missingCount
}
```

### Step 3: Ensure proper database query
Make sure you're querying the correct collection/model:
- `UniformItem` model
- Or whatever model stores member uniform items
- Match by: `sispaId`, `category`, and `type` (not by `_id` or `id`)

### Step 4: Test the fix
1. Save an item with status "Missing" → should set missingCount = 1
2. Save again with status "Missing" → should increment to 2
3. Save again with status "Missing" → should increment to 3
4. Change to "Available" → should preserve 3
5. Change back to "Missing" → should increment to 4

## Important Notes

### DO NOT:
- ❌ Initialize missingCount to 0 every time
- ❌ Use the value from the request body (frontend doesn't send it)
- ❌ Reset missingCount when status changes to "Missing"

### DO:
- ✅ Read existing missingCount from database
- ✅ Increment by 1 when status is "Missing"
- ✅ Preserve missingCount when status is not "Missing"
- ✅ Default to 1 (not 0) if item doesn't exist

## Expected API Response

After fix, the response should show:
```json
{
  "success": true,
  "uniform": {
    "items": [
      {
        "category": "Accessories No 3",
        "type": "Apulet",
        "status": "Missing",
        "missingCount": 1  // ✅ Should increment: 1, 2, 3, etc.
      }
    ]
  }
}
```

## Frontend Behavior After Fix

The frontend is already configured to:
- Show "Missing" (no number) when missingCount = 0
- Show "Missing (1)", "Missing (2)", "Missing (3)", etc. when count > 0
- Log warnings when backend sends 0

Once backend increments correctly, the frontend will display the counts properly.

## Verification

Check backend logs for:
- `✅ Incremented missingCount for {type}: {old} → {new}`
- Response should include incremented `missingCount` values
- Database should store incremented values

## Related Files
- `src/controllers/uniformController.ts` - Main controller
- `src/models/uniformModel.ts` - Schema/model definition
- Frontend: `src/app/member/uniform/page.tsx` - Already fixed to display correctly
- Frontend: `src/app/admin/member/page.tsx` - Already fixed to display correctly
