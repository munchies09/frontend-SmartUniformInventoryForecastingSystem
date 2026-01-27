# Backend Commands: Delete Member Uniform Data Endpoint

## Overview
The frontend needs an endpoint to delete only a member's uniform data (not their profile). This is used when an admin is in the "Uniform Information" tab and clicks delete on a member.

---

## Required Endpoint

### DELETE /api/members/:sispaId/uniform

**Purpose:** Delete only the uniform data for a specific member, keeping their profile intact.

**Endpoint:**
```
DELETE /api/members/:sispaId/uniform
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**URL Parameters:**
- `sispaId` (string, required): The SISPA ID of the member whose uniform data should be deleted

**Authentication:**
- Requires admin authentication (JWT token)
- Must verify user has admin role

**Request Example:**
```http
DELETE /api/members/B1184648/uniform
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Expected Behavior

1. **Verify Authentication:**
   - Check if user is authenticated (JWT token valid)
   - Check if user has admin role
   - Return 401 if not authenticated
   - Return 403 if not admin

2. **Find Member Uniform Data:**
   - Query the database for uniform data with the given `sispaId`
   - If uniform data doesn't exist, return 404

3. **Delete Uniform Data:**
   - Delete the uniform record from the database
   - **DO NOT delete the member profile** - only delete uniform data
   - The member profile should remain intact

4. **Return Success Response:**
   - Return 200 OK with success message

---

## Success Response (200 OK)

```json
{
  "success": true,
  "message": "Uniform data deleted successfully"
}
```

---

## Error Responses

### 401 Unauthorized (Not Authenticated)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### 403 Forbidden (Not Admin)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

### 404 Not Found (Uniform Data Not Found)
```json
{
  "success": false,
  "message": "Uniform data not found for this member"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to delete uniform data"
}
```

---

## Database Operations

### MongoDB Example

```javascript
// Delete uniform data by sispaId
router.delete('/api/members/:sispaId/uniform', authenticateToken, async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { sispaId } = req.params;

    // Find and delete uniform data
    const result = await MemberUniform.deleteOne({ sispaId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uniform data not found for this member'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Uniform data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting uniform data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete uniform data'
    });
  }
});
```

### PostgreSQL Example

```sql
-- Delete uniform data by sispa_id
DELETE FROM member_uniforms 
WHERE sispa_id = $1;
```

```javascript
// Express route handler
router.delete('/api/members/:sispaId/uniform', authenticateToken, async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { sispaId } = req.params;

    // Delete uniform data
    const result = await db.query(
      'DELETE FROM member_uniforms WHERE sispa_id = $1',
      [sispaId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uniform data not found for this member'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Uniform data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting uniform data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete uniform data'
    });
  }
});
```

### MySQL Example

```sql
-- Delete uniform data by sispa_id
DELETE FROM member_uniforms 
WHERE sispa_id = ?;
```

```javascript
// Express route handler
router.delete('/api/members/:sispaId/uniform', authenticateToken, async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { sispaId } = req.params;

    // Delete uniform data
    const [result] = await db.execute(
      'DELETE FROM member_uniforms WHERE sispa_id = ?',
      [sispaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uniform data not found for this member'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Uniform data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting uniform data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete uniform data'
    });
  }
});
```

---

## Important Notes

1. **Profile Preservation:**
   - This endpoint **ONLY** deletes uniform data
   - The member profile (name, email, batch, etc.) should **NOT** be deleted
   - Only the `member_uniforms` table/collection should be affected

2. **Route Order:**
   - Make sure this route is defined **BEFORE** the general `DELETE /api/members/:sispaId` route
   - Otherwise, the general delete route might catch this request first
   - Route order matters in Express.js

3. **Route Definition:**
   ```javascript
   // CORRECT ORDER:
   router.delete('/api/members/:sispaId/uniform', ...);  // Specific route first
   router.delete('/api/members/:sispaId', ...);          // General route second
   ```

4. **Database Schema:**
   - Uniform data is typically stored in a separate table/collection (e.g., `member_uniforms`)
   - The relationship is usually: `member_uniforms.sispaId` → `members.sispaId`
   - Deleting uniform data should not cascade to delete the member profile

---

## Testing

### Test Case 1: Successful Deletion
```bash
# 1. Create a member with uniform data
# 2. Delete uniform data
curl -X DELETE http://localhost:5000/api/members/B1184648/uniform \
  -H "Authorization: Bearer <admin-token>"

# Expected: 200 OK, uniform data deleted, profile remains
```

### Test Case 2: Uniform Data Not Found
```bash
# Try to delete uniform for member without uniform data
curl -X DELETE http://localhost:5000/api/members/B9999999/uniform \
  -H "Authorization: Bearer <admin-token>"

# Expected: 404 Not Found
```

### Test Case 3: Unauthorized Access
```bash
# Try without token
curl -X DELETE http://localhost:5000/api/members/B1184648/uniform

# Expected: 401 Unauthorized
```

### Test Case 4: Non-Admin Access
```bash
# Try with member token (not admin)
curl -X DELETE http://localhost:5000/api/members/B1184648/uniform \
  -H "Authorization: Bearer <member-token>"

# Expected: 403 Forbidden
```

---

## Implementation Checklist

- [ ] Create route handler for `DELETE /api/members/:sispaId/uniform`
- [ ] Add authentication middleware
- [ ] Add admin role verification
- [ ] Implement database query to find uniform data by `sispaId`
- [ ] Implement database deletion operation
- [ ] Return appropriate success/error responses
- [ ] Test with valid admin token
- [ ] Test with invalid/missing token
- [ ] Test with non-admin token
- [ ] Test with non-existent `sispaId`
- [ ] Verify member profile is NOT deleted
- [ ] Verify only uniform data is deleted

---

## Frontend Integration

The frontend is already calling this endpoint:

```javascript
// From src/app/admin/member/page.tsx
const res = await fetch(`http://localhost:5000/api/members/${sispaId}/uniform`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

Once the backend endpoint is implemented, the frontend will work automatically.

---

## Related Endpoints

- `GET /api/members/:sispaId/uniform` - Get member uniform data (already exists)
- `PUT /api/members/:sispaId/uniform` - Update member uniform data (if exists)
- `DELETE /api/members/:sispaId` - Delete entire member (profile + uniform) - **Different endpoint!**
