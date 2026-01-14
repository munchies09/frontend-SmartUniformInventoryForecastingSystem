# Backend Commands: Member Uniform Status Feature

## Overview
The frontend admin member page now displays uniform item status information. The backend needs to include status, missing count, and received date fields in the uniform item responses.

## Current Frontend Implementation

The frontend expects the following fields in each uniform item:
- `status`: "Available" | "Not Available" | "Missing" (optional)
- `missingCount`: number (optional, only when status is "Missing")
- `receivedDate`: string (optional, ISO date string, only when status is "Available" - represents the date when the status became available)

## Required Backend Changes

### 1. Update Uniform Item Response Format

**Current Response Pattern:**
```json
{
  "success": true,
  "uniform": {
    "sispaId": "B1184040",
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Digital Shirt",
        "size": "XL",
        "quantity": 1,
        "notes": null
      }
    ]
  }
}
```

**New Response Pattern (with status fields):**
```json
{
  "success": true,
  "uniform": {
    "sispaId": "B1184040",
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Digital Shirt",
        "size": "XL",
        "quantity": 1,
        "notes": null,
        "status": "Available",
        "receivedDate": "2024-01-15T10:30:00.000Z"
      },
      {
        "category": "Uniform No 3",
        "type": "Uniform No 3 Male",
        "size": "M",
        "quantity": 1,
        "notes": null,
        "status": "Missing",
        "missingCount": 3
      },
      {
        "category": "Uniform No 3",
        "type": "Beret",
        "size": "N/A",
        "quantity": 1,
        "notes": null,
        "status": "Not Available"
      }
    ]
  }
}
```

### 2. Database Schema Considerations

**If you need to track uniform item status in the database:**

You may need to add fields to your uniform_items or member_uniforms table:
```sql
-- Example schema update (adjust based on your database structure)
ALTER TABLE uniform_items 
ADD COLUMN status VARCHAR(20) DEFAULT NULL,
ADD COLUMN missing_count INT DEFAULT 0,
ADD COLUMN received_date DATETIME DEFAULT NULL;
```

**Or if status is tracked elsewhere:**

If status is determined by inventory availability or another system, calculate it when fetching the data:
- Status = "Missing" if item is not in inventory or marked as missing
- Status = "Available" if item has been issued/received
- `missingCount` = count of times the item has been reported missing
- `receivedDate` = date when the item was issued/received to the member

### 3. Update GET /api/members/:sispaId/uniform Endpoint

**Command:**
```
Update GET /api/members/:sispaId/uniform endpoint to include:
- status field (optional): "Available", "Not Available", or "Missing" for each item
- missingCount field (optional): number of times that same user has missing status for that particular item (only if status is "Missing")
- receivedDate field (optional): ISO date string showing when the status became available (only if status is "Available")
```

**Implementation Notes:**
- These fields are optional - if status tracking is not implemented yet, items can be returned without these fields
- Frontend will display "N/A" if status fields are not present
- Status can be determined by:
  - Checking if item exists in member's uniform records
  - Checking inventory availability
  - Tracking missing item reports
  - Tracking item issue/receipt dates

### 4. Status Logic Examples

**Available Status:**
- Item has been issued/received by the member
- Include `receivedDate` with the date when the status became available
- Example: `{ "status": "Available", "receivedDate": "2024-01-15T10:30:00.000Z" }`

**Not Available Status:**
- Item is not currently available (not yet issued or out of stock)
- No additional fields required (just the status)
- Example: `{ "status": "Not Available" }`

**Missing Status:**
- Item is expected but missing/lost
- Include `missingCount` with the number of times that same user has had missing status for that particular item
- Example: `{ "status": "Missing", "missingCount": 3 }`

**No Status:**
- If status tracking is not yet implemented, omit the status fields
- Frontend will display as normal without status badges

### 5. Endpoints to Update

**Primary Endpoint:**
- `GET /api/members/:sispaId/uniform` (Admin endpoint used by admin member page)

**Optional Endpoints (if needed):**
- `GET /api/members/uniform` (Member endpoint - may also want status for member view)
- Any other endpoints that return uniform items in member context

### 6. Example Implementation Logic

```javascript
// Example backend logic (pseudocode)
async function getMemberUniform(sispaId) {
  const uniformItems = await db.query(`
    SELECT 
      ui.*,
      -- Check if item is available (has been issued)
      CASE 
        WHEN ui.issued_date IS NOT NULL THEN 'Available'
        WHEN EXISTS (
          SELECT 1 FROM missing_items mi 
          WHERE mi.member_id = ? AND mi.item_id = ui.id
        ) THEN 'Missing'
        ELSE NULL
      END as status,
      -- Count missing reports
      (SELECT COUNT(*) FROM missing_items mi 
       WHERE mi.member_id = ? AND mi.item_id = ui.id) as missing_count,
      -- Get received/issued date
      ui.issued_date as received_date
    FROM uniform_items ui
    WHERE ui.member_id = ?
  `, [sispaId, sispaId, sispaId]);
  
  return {
    success: true,
    uniform: {
      sispaId,
      items: uniformItems.map(item => ({
        category: item.category,
        type: item.type,
        size: item.size,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status || undefined,
        missingCount: item.status === 'Missing' ? item.missing_count : undefined,
        receivedDate: item.status === 'Available' ? item.received_date : undefined
      }))
    }
  };
}
```

### 7. Response Format Requirements

**Required Fields (existing):**
- `category`: string
- `type`: string
- `size`: string or null
- `quantity`: number

**Optional Fields (new):**
- `status`: "Available" | "Not Available" | "Missing" | undefined
- `missingCount`: number | undefined (only present if status is "Missing" - represents count of times that same user has missing status for that particular item)
- `receivedDate`: string (ISO date) | undefined (only present if status is "Available" - represents date when status became available)
- `notes`: string | null (existing)

### 8. Testing Checklist

- [ ] Test GET /api/members/:sispaId/uniform with items that have status "Available"
- [ ] Test with items that have status "Missing" and missingCount
- [ ] Test with items that have no status (backward compatibility)
- [ ] Verify receivedDate is in ISO format (e.g., "2024-01-15T10:30:00.000Z")
- [ ] Verify missingCount is a number
- [ ] Test that status, missingCount, and receivedDate appear correctly in admin member page
- [ ] Verify Excel download includes Status, Missing Count, and Received Date columns

### 9. Migration Notes

**If adding database fields:**

1. Add `status`, `missing_count`, and `received_date` columns to your uniform_items table
2. Backfill existing data:
   - Set status to "Available" for items with issue dates
   - Set status to "Missing" for items reported missing
   - Populate missing_count from missing item reports
   - Populate received_date from issue/transaction records

**If using existing data:**
- Map existing data (issue dates, missing reports, etc.) to the new status fields
- No schema changes needed if you can calculate status from existing tables

### 10. Frontend Compatibility

**Backward Compatibility:**
- Frontend handles missing status fields gracefully
- If `status` is not provided, items display without status badge
- Excel export shows "N/A" for missing fields

**Display Format:**
- Status badge appears on the right side of each item
- Green badge for "Available" with available date below (e.g., "Jan 15, 2024")
- Yellow/orange badge for "Not Available" (no additional info)
- Red badge for "Missing" with missing count below (e.g., "Count: 3")

## Summary

**Key Changes:**
1. ✅ Add `status` field to uniform item responses ("Available" | "Not Available" | "Missing")
2. ✅ Add `missingCount` field when status is "Missing" (count of times that same user has missing status for that particular item)
3. ✅ Add `receivedDate` field when status is "Available" (date when status became available)
4. ✅ Update GET /api/members/:sispaId/uniform endpoint
5. ✅ Optional: Add database columns if tracking status persistently

**No Breaking Changes:**
- All new fields are optional
- Frontend works with or without status fields
- Existing functionality remains intact
