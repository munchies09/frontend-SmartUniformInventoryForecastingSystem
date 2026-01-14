# Backend Profile Gender Field - API Specification

## Overview
The frontend now requires a `gender` field to be added to the member profile. This field should be a dropdown selection (not text input) with two options: "Male" or "Female".

---

## Database Schema Changes

### Member Model/Collection
Add a new field to the Member schema:

```javascript
{
  // ... existing fields ...
  gender: {
    type: String,
    enum: ["Male", "Female"],
    required: false, // Optional for existing users, can be required for new signups
    default: null
  }
}
```

**Field Type:** String
**Allowed Values:** "Male" or "Female" only
**Required:** Optional (for backward compatibility with existing users)
**Default:** null or empty string

---

## API Endpoints to Update

### 1. GET /api/members/profile
**Description:** Get own profile (member)

**Response Body:**
```json
{
  "success": true,
  "member": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "User Name",
    "email": "user@example.com",
    "batch": "Kompeni 8",
    "matricNumber": "A123456",
    "phoneNumber": "+60123456789",
    "profilePicture": "https://example.com/image.jpg",
    "gender": "Male"  // NEW FIELD - Add this
  }
}
```

**Notes:**
- Include `gender` field in the response
- If gender is not set, return `null` or empty string `""`

---

### 2. PUT /api/members/profile
**Description:** Update own profile (member)

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "batch": "Kompeni 8",
  "matricNumber": "A123456",
  "phoneNumber": "+60123456789",
  "profilePicture": "base64-encoded-image-or-url",
  "gender": "Male"  // NEW FIELD - Accept this in request
}
```

**Validation:**
- `gender` should be either "Male" or "Female" (case-sensitive)
- If `gender` is provided, validate it matches one of the allowed values
- If `gender` is empty string or null, you can either:
  - Accept it and set to null/empty in database
  - Or require it to be "Male" or "Female" (your choice)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "member": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "Updated Name",
    "email": "updated@example.com",
    "batch": "Kompeni 8",
    "matricNumber": "A123456",
    "phoneNumber": "+60123456789",
    "profilePicture": "https://example.com/image.jpg",
    "gender": "Male"  // NEW FIELD - Return updated value
  }
}
```

**Error Response (400) - Invalid Gender:**
```json
{
  "success": false,
  "message": "Invalid gender value. Must be 'Male' or 'Female'."
}
```

---

### 3. POST /api/members/login
**Description:** Login endpoint

**Response Body:**
```json
{
  "success": true,
  "user": {
    "id": "member-id",
    "sispaId": "B1184040",
    "name": "User Name",
    "email": "user@example.com",
    "role": "member",
    "batch": "Kompeni 8",
    "matricNumber": "A123456",
    "phoneNumber": "+60123456789",
    "profilePicture": "https://example.com/image.jpg",
    "gender": "Male"  // NEW FIELD - Include in login response
  },
  "token": "jwt-token-here"
}
```

**Notes:**
- Include `gender` in the user object returned after login
- This ensures the frontend has the gender value immediately after login

---

### 4. POST /api/members/signup (Optional Enhancement)
**Description:** Signup endpoint

**Request Body (Optional - if you want to collect gender during signup):**
```json
{
  "sispaId": "B1184040",
  "name": "User Full Name",
  "email": "user@example.com",
  "batch": "Kompeni 8",
  "password": "password123",
  "gender": "Male"  // NEW FIELD - Optional during signup
}
```

**Notes:**
- Gender can be optional during signup (user can add it later in profile)
- Or you can make it required for new signups (your choice)

---

## Implementation Checklist

- [ ] Add `gender` field to Member database schema/model
- [ ] Update GET `/api/members/profile` to return `gender` field
- [ ] Update PUT `/api/members/profile` to accept and validate `gender` field
- [ ] Update POST `/api/members/login` to return `gender` in user object
- [ ] Add validation: `gender` must be "Male" or "Female" (case-sensitive)
- [ ] Handle null/empty gender values for existing users (backward compatibility)
- [ ] Test with frontend to ensure data flows correctly

---

## Validation Rules

1. **Allowed Values:** Only "Male" or "Female" (case-sensitive, exact match)
2. **Required:** Optional for existing users, can be required for new signups (your choice)
3. **Type:** String
4. **Validation Error:** If invalid value is sent, return 400 with error message

---

## Example Backend Code (Node.js/Express)

### Schema Example (Mongoose):
```javascript
const memberSchema = new mongoose.Schema({
  // ... existing fields ...
  gender: {
    type: String,
    enum: ["Male", "Female"],
    required: false,
    default: null
  }
});
```

### Validation Example (Express):
```javascript
// In PUT /api/members/profile route
if (req.body.gender && !["Male", "Female"].includes(req.body.gender)) {
  return res.status(400).json({
    success: false,
    message: "Invalid gender value. Must be 'Male' or 'Female'."
  });
}
```

---

## Testing

1. **Test GET profile:** Verify `gender` is returned in response
2. **Test PUT profile with valid gender:** Verify update works
3. **Test PUT profile with invalid gender:** Verify validation error
4. **Test PUT profile without gender:** Verify backward compatibility
5. **Test login:** Verify `gender` is included in user object

---

## Notes

- Frontend sends `gender` as a string: "Male" or "Female"
- Frontend expects `gender` in all profile-related responses
- Gender is optional for backward compatibility with existing users
- Consider making gender required for new signups (optional enhancement)
