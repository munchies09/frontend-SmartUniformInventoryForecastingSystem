# Backend Announcements Implementation Commands

## Quick Start Commands for Backend Cursor Agent

### 1. Create Announcements Model/Schema

**Command:**
```
Create an Announcements model with the following fields:
- id (primary key)
- title (string, required)
- date (string, required) - format can be flexible (e.g., "11/11/2025")
- time (string, required) - format can be flexible (e.g., "Jam 2000")
- location (string, required)
- message (text, optional/nullable) - additional message or details
- createdAt (datetime)
- updatedAt (datetime)

Add index on createdAt and updatedAt for sorting announcements.
```

### 2. Create GET /api/announcements Endpoint (Member/Admin)

**Command:**
```
Create GET /api/announcements endpoint that:
- Requires authentication (member or admin)
- Returns all announcements in reverse chronological order (newest first)
- Response format: { success: true, announcements: [...] }
- Each announcement should have: id, title, date, time, location, message (can be null), createdAt, updatedAt
- Return empty array if no announcements exist
- Return 401 if not authenticated
- Note: Members can view but cannot create/update/delete (those operations require admin)
```

### 3. Update GET /api/announcements to Allow Members

**Command:**
```
Update GET /api/announcements endpoint to:
- Allow both members and admins to access (not just admin)
- Members can view all announcements but cannot create/update/delete
- Returns all announcements in reverse chronological order (newest first)
- Response format: { success: true, announcements: [...] }
- Return empty array if no announcements exist
- Return 401 if not authenticated
```

### 4. Create POST /api/announcements Endpoint (Admin Only)

**Command:**
```
Create POST /api/announcements endpoint that:
- Requires admin authentication (check role === "admin")
- Accepts: { title, date, time, location, message (optional) }
- Validates required fields (title, date, time, location) are not empty
- Message field is optional
- Creates new announcement
- Response format: { success: true, message: "...", announcement: {...} }
- Return 400 for validation errors
- Return 401 if not authenticated
- Return 403 if not admin
```

### 5. Create PUT /api/announcements/:id Endpoint (Admin Only)

**Command:**
```
Create PUT /api/announcements/:id endpoint that:
- Requires admin authentication (check role === "admin")
- Accepts: { title, date, time, location }
- Validates all fields are required and not empty
- Updates the announcement with the given ID
- Response format: { success: true, message: "...", announcement: {...} }
- Return 404 if announcement not found
- Return 400 for validation errors
- Return 401 if not authenticated
- Return 403 if not admin
```

### 6. Create DELETE /api/announcements/:id Endpoint (Admin Only)

**Command:**
```
Create DELETE /api/announcements/:id endpoint that:
- Requires admin authentication (check role === "admin")
- Deletes the announcement with the given ID
- Response format: { success: true, message: "Announcement deleted successfully" }
- Return 404 if announcement not found
- Return 401 if not authenticated
- Return 403 if not admin
```

### 7. Testing Commands

**Command:**
```
Create test cases for:
1. Admin can view all announcements (sorted newest first)
2. Member can view all announcements (sorted newest first)
3. Admin can create announcement with message
4. Admin can create announcement without message
5. Validation errors for missing required fields
6. Admin can update announcement
7. Admin can delete announcement
8. Returns 404 for non-existent announcement
9. Non-admin cannot create/update/delete (403)
10. Unauthenticated user cannot access (401)
11. Returns empty array if no announcements exist
12. Message field can be null or empty
```

### 8. Database Migration

**Command:**
```
Create database migration to:
- Create announcements table with all required fields
- Add indexes on createdAt and updatedAt
- Set default values for createdAt and updatedAt
```

---

## Quick Reference: API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/announcements` | Member/Admin | Get all announcements |
| POST | `/api/announcements` | Admin | Create announcement |
| PUT | `/api/announcements/:id` | Admin | Update announcement |
| DELETE | `/api/announcements/:id` | Admin | Delete announcement |

---

## Important Notes

1. **Date/Time Format**: 
   - The frontend sends date and time as strings in flexible formats
   - No need to parse or validate specific formats
   - Store as-is (e.g., "11/11/2025", "Jam 2000")

2. **Message Field**:
   - Message is optional and can be null or empty string
   - Used for additional details or instructions
   - Supports multi-line text

3. **Sorting**:
   - GET `/api/announcements` should return announcements in reverse chronological order (newest first)

4. **Authorization**:
   - GET `/api/announcements` - Member or Admin (both can view)
   - POST/PUT/DELETE - Admin only (only admins can manage)

---

**See BACKEND_ANNOUNCEMENTS_API_SPEC.md for complete detailed specification.**

