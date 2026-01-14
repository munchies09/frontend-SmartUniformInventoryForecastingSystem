# Backend Kompeni/Batch Field Changes - API Specification

## Overview
The frontend has been updated to handle Kompeni (company/batch) information differently:
1. **Signup**: Batch field has been **removed** from the signup form
2. **Profile**: Batch is now managed as a **number input** (Kompeni number) and stored as "Kompeni {number}" format
3. **Grouping**: Admin member page groups members by Kompeni number (case-insensitive, normalized format)

---

## Database Schema Changes

### Member Model/Collection
The `batch` field should remain in the schema, but the format should be standardized:

```javascript
{
  // ... existing fields ...
  batch: {
    type: String,
    required: false, // Not required during signup, but can be set in profile
    default: null,
    // Format: "Kompeni {number}" (e.g., "Kompeni 9", "Kompeni 8")
    // Backend should normalize: "kompeni 9" -> "Kompeni 9"
    // Backend should normalize: "Kompeni9" -> "Kompeni 9"
    // Backend should normalize: "9" -> "Kompeni 9" (if just a number)
  }
}
```

**Field Type:** String
**Format:** "Kompeni {number}" (e.g., "Kompeni 9", "Kompeni 8")
**Required:** Optional (can be set later in profile)
**Default:** null or empty string

**Normalization Rules:**
- Convert to title case: "kompeni" -> "Kompeni"
- Ensure space between "Kompeni" and number: "Kompeni9" -> "Kompeni 9"
- If only a number is provided, prefix with "Kompeni ": "9" -> "Kompeni 9"
- Extract number from existing formats: "Kompeni No 9" -> "Kompeni 9"

---

## API Endpoints to Update

### 1. POST /api/members/signup
**Description:** Create new member account

**Changes:**
- **REMOVE** `batch` from required fields
- `batch` should **NOT** be sent in the signup request
- `batch` can be set later via profile update

**Request Body (Updated):**
```json
{
  "sispaId": "B1184040",
  "name": "User Full Name",
  "email": "user@example.com",
  "password": "password123"
  // batch field is NO LONGER REQUIRED
}
```

**Previous Request Body (Deprecated):**
```json
{
  "sispaId": "B1184040",
  "name": "User Full Name",
  "email": "user@example.com",
  "batch": "Kompeni 8",  // ❌ REMOVED - No longer required
  "password": "password123"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "member": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "User Full Name",
    "email": "user@example.com",
    "role": "member",
    "batch": null  // Will be null initially, can be set in profile
  }
}
```

**Validation:**
- Do NOT require `batch` field
- Do NOT validate `batch` if provided (it will be set via profile update)

---

### 2. PUT /api/members/profile
**Description:** Update own profile (member)

**Changes:**
- `batch` field should accept "Kompeni {number}" format
- Backend should **normalize** the batch value before saving
- Extract number from various formats and normalize to "Kompeni {number}"

**Request Body:**
```json
{
  "name": "User Full Name",
  "email": "user@example.com",
  "batch": "Kompeni 9",  // Format: "Kompeni {number}"
  "matricNumber": "A123456",
  "phoneNumber": "+60123456789",
  "profilePicture": "https://example.com/image.jpg",
  "gender": "Male"
}
```

**Normalization Logic (Backend Should Implement):**
```javascript
function normalizeBatch(batch) {
  if (!batch || batch.trim() === "") {
    return null;
  }
  
  // Extract number from various formats
  const numberMatch = batch.match(/\d+/);
  if (!numberMatch) {
    // If no number found, return as-is or null
    return null;
  }
  
  const number = numberMatch[0];
  return `Kompeni ${number}`;
}

// Examples:
// "Kompeni 9" -> "Kompeni 9" ✓
// "kompeni 9" -> "Kompeni 9" ✓
// "Kompeni9" -> "Kompeni 9" ✓
// "kompeni9" -> "Kompeni 9" ✓
// "9" -> "Kompeni 9" ✓
// "Kompeni No 9" -> "Kompeni 9" ✓
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "member": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "User Full Name",
    "email": "user@example.com",
    "batch": "Kompeni 9",  // Normalized format
    "matricNumber": "A123456",
    "phoneNumber": "+60123456789",
    "profilePicture": "https://example.com/image.jpg",
    "gender": "Male"
  }
}
```

**Validation:**
- `batch` is optional (can be null)
- If provided, should contain a number
- Backend should normalize to "Kompeni {number}" format before saving

---

### 3. GET /api/members/profile
**Description:** Get own profile (member)

**Response Body:**
```json
{
  "success": true,
  "member": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "User Full Name",
    "email": "user@example.com",
    "batch": "Kompeni 9",  // Should be in normalized format
    "matricNumber": "A123456",
    "phoneNumber": "+60123456789",
    "profilePicture": "https://example.com/image.jpg",
    "gender": "Male"
  }
}
```

**Note:** Backend should return `batch` in normalized "Kompeni {number}" format, even if stored differently in database.

---

### 4. GET /api/members
**Description:** Get all members (admin only)

**Changes:**
- Response should include `batch` field in normalized format
- For grouping purposes, ensure consistent format

**Response Body:**
```json
{
  "success": true,
  "members": [
    {
      "id": "member-id-1",
      "sispaId": "A1181212",
      "name": "Kamal bin Ali",
      "email": "kamal12345@gmail.com",
      "batch": "Kompeni 9",  // Normalized format
      "matricNumber": "211234",
      "phoneNumber": "0123456789",
      "gender": "Male"
    },
    {
      "id": "member-id-2",
      "sispaId": "B1184040",
      "name": "Munirah binti Mazlan",
      "email": "muniey1309@gmail.com",
      "batch": "Kompeni 9",  // Normalized format (same as above for grouping)
      "matricNumber": "214334",
      "phoneNumber": "019-5189484",
      "gender": "Female"
    }
  ]
}
```

**Important:** All `batch` values should be normalized to "Kompeni {number}" format for consistent grouping in the frontend.

---

### 5. POST /api/members/login
**Description:** Member login

**Response Body:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "member": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "User Full Name",
    "email": "user@example.com",
    "role": "member",
    "batch": "Kompeni 9",  // Should be in normalized format
    "gender": "Female"
  }
}
```

---

## Implementation Checklist

### Backend Tasks

- [ ] **Remove batch requirement from signup endpoint**
  - Update validation to NOT require `batch` field
  - Allow signup without batch (will be set later in profile)

- [ ] **Add batch normalization function**
  - Create utility function to normalize batch values
  - Extract number from various formats
  - Convert to "Kompeni {number}" format

- [ ] **Update profile update endpoint**
  - Normalize `batch` value before saving to database
  - Accept various formats but store in normalized format

- [ ] **Update profile get endpoint**
  - Return `batch` in normalized format
  - Normalize existing data if needed

- [ ] **Update members list endpoint (admin)**
  - Return all `batch` values in normalized format
  - Ensure consistent format for grouping

- [ ] **Update login endpoint**
  - Return `batch` in normalized format in response

- [ ] **Data Migration (Optional but Recommended)**
  - Create migration script to normalize existing batch values in database
  - Convert all existing batch values to "Kompeni {number}" format
  - Handle edge cases (empty, null, various formats)

---

## Normalization Function Example

### JavaScript/Node.js Example
```javascript
/**
 * Normalizes batch value to "Kompeni {number}" format
 * @param {string|null|undefined} batch - Raw batch value
 * @returns {string|null} - Normalized batch value or null
 */
function normalizeBatch(batch) {
  // Handle null, undefined, or empty string
  if (!batch || typeof batch !== 'string' || batch.trim() === '') {
    return null;
  }
  
  const trimmed = batch.trim();
  
  // Extract number from string (handles various formats)
  const numberMatch = trimmed.match(/\d+/);
  if (!numberMatch) {
    // No number found, return null
    return null;
  }
  
  const number = numberMatch[0];
  
  // Return normalized format
  return `Kompeni ${number}`;
}

// Test cases:
console.log(normalizeBatch("Kompeni 9"));      // "Kompeni 9"
console.log(normalizeBatch("kompeni 9"));      // "Kompeni 9"
console.log(normalizeBatch("Kompeni9"));       // "Kompeni 9"
console.log(normalizeBatch("kompeni9"));       // "Kompeni 9"
console.log(normalizeBatch("9"));              // "Kompeni 9"
console.log(normalizeBatch("Kompeni No 9"));   // "Kompeni 9"
console.log(normalizeBatch(""));                // null
console.log(normalizeBatch(null));              // null
```

### Mongoose Schema Example
```javascript
const memberSchema = new mongoose.Schema({
  // ... other fields ...
  batch: {
    type: String,
    required: false,
    default: null,
    set: function(value) {
      // Normalize before saving
      if (!value || value.trim() === '') {
        return null;
      }
      const numberMatch = value.match(/\d+/);
      if (numberMatch) {
        return `Kompeni ${numberMatch[0]}`;
      }
      return null;
    }
  }
});
```

---

## Frontend Behavior

### Signup Flow
1. User fills signup form (SISPA ID, Name, Email, Password)
2. **No batch field** in signup form
3. Account is created with `batch: null`
4. User can set Kompeni number later in profile

### Profile Update Flow
1. User navigates to profile page
2. Sees Kompeni number input (with up/down arrows)
3. User selects/enters Kompeni number (e.g., 9)
4. Frontend sends `batch: "Kompeni 9"` to backend
5. Backend normalizes and saves

### Admin Member List Flow
1. Admin views member list
2. Members are grouped by Kompeni number
3. Grouping is case-insensitive ("kompeni 9" and "Kompeni 9" grouped together)
4. Frontend normalizes batch values for consistent grouping

---

## Important Notes

1. **Backward Compatibility:**
   - Existing members may have batch values in various formats
   - Backend should normalize when returning data
   - Consider data migration for existing records

2. **Validation:**
   - Batch is optional (not required during signup)
   - If provided, should contain a number
   - Backend should handle edge cases gracefully

3. **Consistency:**
   - Always return batch in "Kompeni {number}" format
   - Normalize before saving to database
   - This ensures consistent grouping in admin interface

4. **Error Handling:**
   - If batch format is invalid, return null or empty string
   - Do not throw errors for invalid batch formats
   - Log warnings for debugging

---

## Testing Recommendations

1. **Test Signup Without Batch:**
   - Sign up new user without batch field
   - Verify account is created successfully
   - Verify batch is null initially

2. **Test Profile Update:**
   - Update profile with various batch formats
   - Verify normalization works correctly
   - Verify saved value is in "Kompeni {number}" format

3. **Test Grouping:**
   - Create members with "kompeni 9", "Kompeni 9", "Kompeni9"
   - Verify they are grouped together in admin interface
   - Verify consistent format in API responses

4. **Test Edge Cases:**
   - Empty string
   - Null value
   - Just a number ("9")
   - No number in string ("Kompeni")
   - Special characters

---

## Summary

**Key Changes:**
1. ✅ Signup no longer requires batch field
2. ✅ Profile update accepts batch in "Kompeni {number}" format
3. ✅ Backend should normalize batch values for consistency
4. ✅ All API responses should return batch in normalized format
5. ✅ Grouping in admin interface relies on consistent batch format

**Backend Action Items:**
- Remove batch requirement from signup
- Add batch normalization function
- Update all endpoints to normalize batch values
- Consider data migration for existing records
