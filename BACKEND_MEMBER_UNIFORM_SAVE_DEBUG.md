# Backend Debug Guide: Member Uniform Save Issue

## Issue Description
When members input uniform data using the dropdowns (Size and Status) in the member uniform page and click "Save", the data:
1. Does not appear in the admin member uniform view
2. Does not seem to be saved to the database

## Frontend Behavior

### What the Frontend Sends
When a member clicks "Save" on an individual item, the frontend sends:

**Endpoint:** `POST /api/members/uniform` (for new) or `PUT /api/members/uniform` (for updates)

**Request Body:**
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "XL",
      "quantity": 1
    }
  ]
}
```

**Example for accessories:**
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Apulet",
      "size": "N/A",
      "quantity": 1
    }
  ]
}
```

**Example for nametag:**
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Nametag",
      "size": "N/A",
      "quantity": 1,
      "notes": "John Doe"
    }
  ]
}
```

### Frontend Console Logging
The frontend now logs:
- `"Saving item:"` - Shows the item being saved
- `"FormData state:"` - Shows the current formData state
- `"Sending request to:"` - Shows the API endpoint
- `"Method:"` - Shows POST or PUT
- `"Items to send:"` - Shows the full JSON payload
- `"Response status:"` - Shows the HTTP status code
- `"Save successful, refreshing data..."` - Confirms successful save
- `"Data refreshed"` - Confirms data refresh completed

## Backend Verification Steps

### 1. Check if Request is Received
**Action:** Check backend logs when member clicks "Save"
- Verify the request reaches the backend
- Check if the route handler is being called
- Verify the request body matches the expected format

### 2. Verify Database Save
**Action:** Check if data is actually saved to the database

**For PostgreSQL/MySQL:**
```sql
-- Check if uniform data exists for a specific member
SELECT * FROM member_uniforms WHERE sispa_id = 'B1184040';

-- Check uniform items
SELECT * FROM uniform_items WHERE member_id = (SELECT id FROM members WHERE sispa_id = 'B1184040');

-- Or if using JSON storage
SELECT sispa_id, items FROM member_uniforms WHERE sispa_id = 'B1184040';
```

### 3. Verify Response Format
**Expected Success Response:**
```json
{
  "success": true,
  "message": "Uniform saved successfully",
  "uniform": {
    "sispaId": "B1184040",
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Uniform No 3 Male",
        "size": "XL",
        "quantity": 1
      }
    ],
    "itemCount": 1
  }
}
```

### 4. Check for Validation Errors
**Common Issues:**
- Type name mismatch (e.g., backend expects "Cloth No 3" but frontend sends "Uniform No 3 Male")
- Category name mismatch
- Size format issues (e.g., "UK 8" vs "8")
- Missing required fields

### 5. Verify PUT vs POST Logic
**Current Frontend Behavior:**
- Uses `POST` when member has no existing uniform data
- Uses `PUT` when member already has uniform data (to merge with existing items from other categories)

**Backend Should:**
- `POST`: Create new uniform record
- `PUT`: Replace ALL items (frontend sends merged data including items from other categories)

**Important:** When using PUT, the frontend sends ALL items (including items from other categories), not just the newly added item.

## Potential Backend Issues

### Issue 1: Type Name Mismatch
**Problem:** Backend validation might reject "Uniform No 3 Male" if it expects "Cloth No 3"

**Solution:** Update backend to accept both old and new type names, or update backend validation to match frontend naming.

### Issue 2: Category Filtering in Admin View
**Problem:** Admin page might not be fetching or displaying the correct data

**Check:** Verify admin endpoint `/api/members/:sispaId/uniform` returns the saved items with correct category/type names.

### Issue 3: Database Transaction Issues
**Problem:** Data might not be committed to database

**Solution:** Ensure database transactions are properly committed after save.

### Issue 4: JWT Token Issues
**Problem:** Token might be expired or invalid

**Check:** Verify token is valid and user is authenticated when saving.

## Testing Checklist

1. **Test Member Save:**
   - [ ] Member selects a size from dropdown (e.g., "XL" for Uniform No 3 Male)
   - [ ] Member clicks "Save" button
   - [ ] Check browser console for "Saving item:" log
   - [ ] Verify API request is sent with correct payload
   - [ ] Check backend logs for received request
   - [ ] Verify database has the new record
   - [ ] Check API response is `{ success: true }`

2. **Test Admin View:**
   - [ ] Admin navigates to Member page
   - [ ] Admin clicks on a member
   - [ ] Admin clicks "Uniform Information" tab
   - [ ] Verify the saved item appears in the table

3. **Test Data Refresh:**
   - [ ] After saving, check if member uniform page shows updated data
   - [ ] After saving, check if admin member page shows updated data
   - [ ] Refresh admin page - data should persist

## Debugging Steps for Backend Developer

1. **Add Request Logging:**
   ```javascript
   // In your uniform controller
   console.log("=== UNIFORM SAVE REQUEST ===");
   console.log("Method:", req.method);
   console.log("User:", req.user); // From JWT
   console.log("Body:", JSON.stringify(req.body, null, 2));
   ```

2. **Add Database Logging:**
   ```javascript
   // After database save
   console.log("=== DATABASE SAVE RESULT ===");
   console.log("Saved uniform:", savedUniform);
   console.log("Items count:", savedUniform.items.length);
   ```

3. **Add Response Logging:**
   ```javascript
   // Before sending response
   console.log("=== SENDING RESPONSE ===");
   console.log("Response:", JSON.stringify(responseData, null, 2));
   ```

4. **Check Admin Fetch:**
   ```javascript
   // In admin member uniform endpoint
   console.log("=== ADMIN FETCH UNIFORM ===");
   console.log("SISPA ID:", sispaId);
   console.log("Uniform data:", uniformData);
   ```

## Expected Data Flow

1. **Member Input:**
   - User selects size "XL" from dropdown
   - `handleSizeChange("XL")` updates `formDataNo3.clothNo3 = "XL"`
   - User clicks "Save"

2. **Frontend Processing:**
   - Save button reads `formDataNo3.clothNo3` (should be "XL")
   - Creates `itemToSave = { category: "Uniform No 3", type: "Uniform No 3 Male", size: "XL", quantity: 1 }`
   - Checks if uniform exists (determines POST vs PUT)
   - If PUT, fetches existing items and merges

3. **API Request:**
   - Sends `POST /api/members/uniform` or `PUT /api/members/uniform`
   - Body: `{ items: [itemToSave] }` (or merged items for PUT)
   - Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`

4. **Backend Processing:**
   - Validates JWT token
   - Extracts user ID from token
   - Validates item data
   - Saves to database
   - Returns success response

5. **Frontend Response:**
   - Receives success response
   - Shows success message
   - Calls `fetchUniform()` to refresh data
   - Updates UI with saved data

6. **Admin View:**
   - Admin page should fetch from `/api/members/:sispaId/uniform`
   - Should return the saved items
   - Should display in the table

## Common Fixes

### Fix 1: Ensure PUT Merges Correctly
If using PUT, ensure backend doesn't accidentally delete items from other categories. Frontend sends merged data, so backend should replace all items.

### Fix 2: Type Name Validation
Update backend validation to accept:
- "Uniform No 3 Male" (new name)
- "Cloth No 3" (old name, for backward compatibility)

### Fix 3: Category Name Consistency
Ensure category names match exactly:
- "Uniform No 3" (not "uniform no 3" or "Uniform No.3")
- "Uniform No 4" (not "uniform no 4")
- "T-Shirt" (not "T-Shirt" or "Shirt")

### Fix 4: Size Format
For shoes/boots, ensure consistent format:
- Frontend sends: "UK 8"
- Backend might expect: "8" or "UK 8"
- Update backend to handle both or standardize on one format

## Files to Check (Backend)

1. **Route Handler:** `routes/members.js` or `controllers/memberController.js`
   - Check `POST /api/members/uniform`
   - Check `PUT /api/members/uniform`

2. **Database Model:** `models/MemberUniform.js` or similar
   - Check save/update methods
   - Check validation rules

3. **Admin Endpoint:** `GET /api/members/:sispaId/uniform`
   - Verify it returns saved data correctly
   - Check if filtering/parsing is correct

---

**End of Document**

