# Backend Announcements API Specification

This document provides the complete API specification for the Announcements system that needs to be implemented in the backend.

## Overview

The announcements system allows admins to create, view, update, and delete announcements. Members can view the latest announcement on their dashboard.

---

## 1. Get All Announcements (Admin Only)

### Endpoint
```
GET /api/announcements
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
```

### Description
Returns all announcements. This endpoint is used by the admin to view and manage all announcements.

### Success Response (200 OK)
```json
{
  "success": true,
  "announcements": [
    {
      "id": "ann-1",
      "title": "Pengambilan Uniform bagi Kompeni 11",
      "date": "11/11/2025",
      "time": "Jam 2000",
      "location": "Markas Kor SISPA UPM",
      "message": "Sila bawa dokumen yang diperlukan. Terima kasih.",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "ann-2",
      "title": "Latihan Kompeni 12",
      "date": "15/11/2025",
      "time": "Jam 0800",
      "location": "Padang Kawad",
      "message": null,
      "createdAt": "2024-01-16T11:00:00.000Z",
      "updatedAt": "2024-01-16T11:00:00.000Z"
    }
  ]
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

### Notes
- This endpoint should only be accessible to users with `role: "admin"`
- Announcements should be returned in reverse chronological order (newest first)
- If no announcements exist, return an empty array

---

## 2. Get All Announcements (Member)

### Endpoint
```
GET /api/announcements
```

### Headers
```
Authorization: Bearer <member-jwt-token>
```

### Description
Returns all announcements. This endpoint is used by members to view all announcements on their dashboard. Members can access this endpoint (same as admin, but they can only view, not manage).

### Success Response (200 OK)
```json
{
  "success": true,
  "announcements": [
    {
      "id": "ann-1",
      "title": "Pengambilan Uniform bagi Kompeni 11",
      "date": "11/11/2025",
      "time": "Jam 2000",
      "location": "Markas Kor SISPA UPM",
      "message": "Sila bawa dokumen yang diperlukan. Terima kasih.",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Success Response (200 OK) - No Announcements
```json
{
  "success": true,
  "announcements": []
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### Notes
- This endpoint is accessible to both members and admins
- Returns all announcements in reverse chronological order (newest first)
- If no announcements exist, return empty array
- Members can view but cannot create/update/delete announcements

---

## 3. Create Announcement (Admin Only)

### Endpoint
```
POST /api/announcements
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "title": "Pengambilan Uniform bagi Kompeni 11",
  "date": "11/11/2025",
  "time": "Jam 2000",
  "location": "Markas Kor SISPA UPM",
  "message": "Sila bawa dokumen yang diperlukan. Terima kasih."
}
```

### Field Descriptions
- `title` (string, required): The announcement title
- `date` (string, required): The date of the event (format: DD/MM/YYYY or any format)
- `time` (string, required): The time of the event (format: "Jam 2000" or any format)
- `location` (string, required): The location of the event
- `message` (string, optional): Additional message or details for the announcement

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Announcement created successfully",
  "announcement": {
    "id": "ann-1",
    "title": "Pengambilan Uniform bagi Kompeni 11",
    "date": "11/11/2025",
    "time": "Jam 2000",
    "location": "Markas Kor SISPA UPM",
    "message": "Sila bawa dokumen yang diperlukan. Terima kasih.",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error: All fields are required"
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

### Validation Rules
- Required fields: `title`, `date`, `time`, `location`
- Optional field: `message`
- Required fields should not be empty strings
- `message` can be null or empty string

---

## 4. Update Announcement (Admin Only)

### Endpoint
```
PUT /api/announcements/:id
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

### URL Parameters
- `id` (string, required): The announcement ID

### Request Body
```json
{
  "title": "Pengambilan Uniform bagi Kompeni 11 (Updated)",
  "date": "12/11/2025",
  "time": "Jam 2000",
  "location": "Markas Kor SISPA UPM",
  "message": "Updated message here."
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Announcement updated successfully",
  "announcement": {
    "id": "ann-1",
    "title": "Pengambilan Uniform bagi Kompeni 11 (Updated)",
    "date": "12/11/2025",
    "time": "Jam 2000",
    "location": "Markas Kor SISPA UPM",
    "message": "Updated message here.",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:30:00.000Z"
  }
}
```

### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Announcement not found"
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error: All fields are required"
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

---

## 5. Delete Announcement (Admin Only)

### Endpoint
```
DELETE /api/announcements/:id
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
```

### URL Parameters
- `id` (string, required): The announcement ID

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```

### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Announcement not found"
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

---

## 6. Database Schema

### Announcements Table
```sql
CREATE TABLE announcements (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date VARCHAR(100) NOT NULL,
  time VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  message TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

### Indexes
- Index on `createdAt` for sorting by date
- Index on `updatedAt` for finding latest announcement

---

## 7. Testing Checklist

### Get All Announcements (Admin)
- [ ] Admin can view all announcements
- [ ] Announcements are returned in reverse chronological order
- [ ] Empty array returned if no announcements
- [ ] Non-admin cannot access (403)
- [ ] Unauthenticated user cannot access (401)

### Get All Announcements (Member)
- [ ] Member can view all announcements
- [ ] Admin can also view all announcements
- [ ] Returns all announcements in reverse chronological order
- [ ] Returns empty array if no announcements exist
- [ ] Unauthenticated user cannot access (401)

### Create Announcement (Admin)
- [ ] Admin can create announcement
- [ ] All fields are validated (required)
- [ ] Returns created announcement with ID
- [ ] Non-admin cannot create (403)
- [ ] Unauthenticated user cannot create (401)

### Update Announcement (Admin)
- [ ] Admin can update announcement
- [ ] All fields are validated (required)
- [ ] Returns updated announcement
- [ ] Returns 404 if announcement not found
- [ ] Non-admin cannot update (403)
- [ ] Unauthenticated user cannot update (401)

### Delete Announcement (Admin)
- [ ] Admin can delete announcement
- [ ] Returns success message
- [ ] Returns 404 if announcement not found
- [ ] Non-admin cannot delete (403)
- [ ] Unauthenticated user cannot delete (401)

---

## 8. Sample Data for Testing

```json
{
  "title": "Pengambilan Uniform bagi Kompeni 11",
  "date": "11/11/2025",
  "time": "Jam 2000",
  "location": "Markas Kor SISPA UPM",
  "message": "Sila bawa dokumen yang diperlukan. Terima kasih."
}
```

---

## 9. API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/announcements` | Get all announcements | Member/Admin |
| POST | `/api/announcements` | Create announcement | Admin |
| PUT | `/api/announcements/:id` | Update announcement | Admin |
| DELETE | `/api/announcements/:id` | Delete announcement | Admin |

---

## 10. Frontend Integration

The frontend expects:
- All endpoints to return `{ success: true/false, message: "...", ... }`
- Announcement objects to have: `id`, `title`, `date`, `time`, `location`, `message` (optional), `createdAt`, `updatedAt`
- GET `/api/announcements` to return `{ success: true, announcements: [...] }` for both members and admins
- Members can view all announcements but cannot create/update/delete
- All responses should include proper error messages

---

**End of Specification**

