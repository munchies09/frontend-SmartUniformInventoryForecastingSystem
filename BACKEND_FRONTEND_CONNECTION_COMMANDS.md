# Backend Frontend Connection - Complete API Commands

This document lists ALL API endpoints that the frontend uses and what the backend needs to implement to connect properly.

## Base URL
```
http://localhost:5000
```

---

## 1. Authentication Endpoints

### 1.1. Login
**Endpoint:** `POST /api/members/login`

**Request Body:**
```json
{
  "sispaId": "B1184040",
  "password": "password123"
}
```

**Success Response (200 OK):**
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
    "profilePicture": "https://example.com/image.jpg"
  },
  "token": "jwt-token-here"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid ID or Password"
}
```

**Notes:**
- Use `sispaId` only (no `memberId`)
- Return all user fields including `batch`, `matricNumber`, `phoneNumber`, `profilePicture`
- JWT token should include `sispaId` and `role`

---

### 1.2. Signup
**Endpoint:** `POST /api/members/signup`

**Request Body:**
```json
{
  "sispaId": "B1184040",
  "name": "User Full Name",
  "email": "user@example.com",
  "batch": "Kompeni 8",
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
    "batch": "Kompeni 8"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "SISPA ID already exists. Please use a different value."
}
```

**Notes:**
- Check `sispaId` uniqueness (NOT `memberId`)
- Email should also be unique
- Hash password before saving
- Default role should be "member"

---

### 1.3. Forgot Password
**Endpoint:** `POST /api/members/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

## 2. Member Profile Endpoints

### 2.1. Get Own Profile
**Endpoint:** `GET /api/members/profile`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200 OK):**
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
    "profilePicture": "https://example.com/image.jpg"
  }
}
```

---

### 2.2. Update Own Profile
**Endpoint:** `PUT /api/members/profile`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "batch": "Kompeni 8",
  "matricNumber": "A123456",
  "phoneNumber": "+60123456789",
  "profilePicture": "base64-encoded-image-or-url"
}
```

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
    "profilePicture": "https://example.com/image.jpg"
  }
}
```

**Notes:**
- Field names: `matricNumber`, `phoneNumber`, `profilePicture` (NOT `matricNo`, `phone`, `profileImage`)
- `sispaId` cannot be changed
- Use JWT token to identify the user (no ID in URL)

---

## 3. Uniform Endpoints

### 3.1. Get Own Uniform (Member)
**Endpoint:** `GET /api/members/uniform`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "uniform": {
    "sispaId": "B1184040",
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Cloth No 3",
        "size": "M",
        "quantity": 1
      },
      {
        "category": "Uniform No 3",
        "type": "Pants No 3",
        "size": "L",
        "quantity": 1
      },
      {
        "category": "Uniform No 3",
        "type": "Apulet",
        "size": "N/A",
        "quantity": 1
      },
      {
        "category": "Uniform No 3",
        "type": "Nametag",
        "size": "N/A",
        "quantity": 1,
        "notes": "John Doe"
      }
    ],
    "itemCount": 4,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

**If no uniform exists (200 OK):**
```json
{
  "success": false,
  "message": "Uniform not found. Please add your uniform items first.",
  "uniform": null,
  "items": []
}
```

**Notes:**
- Use JWT token to identify the user
- Return ALL items including accessories (items without sizes)
- Accessories have `size: "N/A"` or `null`

---

### 3.2. Create/Update Own Uniform (Member)
**Endpoint:** `POST /api/members/uniform` (create) or `PUT /api/members/uniform` (update)

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": "N/A",
      "quantity": 1
    }
  ]
}
```

**Success Response (200/201 OK):**
```json
{
  "success": true,
  "message": "Uniform saved successfully",
  "uniform": {
    "sispaId": "B1184040",
    "items": [...],
    "itemCount": 2
  }
}
```

**Notes:**
- POST for new uniform, PUT for update
- PUT should replace ALL items (frontend sends merged data)
- Use JWT token to identify the user

---

### 3.3. Get Member Uniform by SISPA ID (Admin)
**Endpoint:** `GET /api/members/:sispaId/uniform`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**URL Parameters:**
- `sispaId` (string, required): The SISPA ID of the member

**Success Response (200 OK):**
```json
{
  "success": true,
  "uniform": {
    "sispaId": "B1184040",
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Cloth No 3",
        "size": "M",
        "quantity": 1
      }
    ],
    "itemCount": 1
  }
}
```

**If no uniform exists (404 Not Found):**
```json
{
  "success": false,
  "message": "Uniform not found for this member",
  "uniform": null,
  "items": []
}
```

**Notes:**
- Admin only endpoint
- Return ALL items including accessories

---

## 4. Admin Member Management Endpoints

### 4.1. Get All Members (Admin)
**Endpoint:** `GET /api/members`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "members": [
    {
      "id": "member-id-1",
      "sispaId": "B1184848",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "member",
      "batch": "Kompeni 8",
      "matricNumber": "A123456",
      "phoneNumber": "+60123456789",
      "profilePicture": "https://example.com/profile.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 1
}
```

**Notes:**
- Admin only
- Return all members except admin account
- Include all profile fields

---

## 5. Inventory Endpoints

### 5.1. Get All Inventory Items (Admin)
**Endpoint:** `GET /api/inventory`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "inv-1",
      "name": "Cloth No 3",
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantity": 50,
      "status": "In Stock",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    },
    {
      "id": "inv-2",
      "name": "Belt No 3",
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": null,
      "quantity": 100,
      "status": "In Stock",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ]
}
```

**Notes:**
- Admin only
- Items without sizes have `size: null`
- Include `status` field: "In Stock" (quantity > 10), "Low Stock" (0 < quantity <= 10), "Out of Stock" (quantity === 0)

---

### 5.2. Add Inventory Item (Admin)
**Endpoint:** `POST /api/inventory`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Cloth No 3",
  "category": "Uniform No 3",
  "type": "Cloth No 3",
  "size": "M",
  "quantity": 50
}
```

**For accessories (no size):**
```json
{
  "name": "Belt No 3",
  "category": "Uniform No 3",
  "type": "Belt No 3",
  "size": null,
  "quantity": 100
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Inventory item added successfully",
  "item": {
    "id": "inv-1",
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "M",
    "quantity": 50,
    "status": "In Stock"
  }
}
```

---

### 5.3. Update Inventory Item (Admin)
**Endpoint:** `PUT /api/inventory/:id`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**URL Parameters:**
- `id` (string, required): The inventory item ID

**Request Body:**
```json
{
  "quantity": 45
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item updated successfully",
  "item": {
    "id": "inv-1",
    "name": "Cloth No 3",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "M",
    "quantity": 45,
    "status": "In Stock"
  }
}
```

---

### 5.4. Deduct Inventory (When User Saves Uniform)
**Endpoint:** `POST /api/inventory/deduct`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": null,
      "quantity": 1
    }
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory deducted successfully",
  "deducted": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantityDeducted": 1,
      "remainingStock": 49
    }
  ]
}
```

**Error Response (400) - Insufficient Stock:**
```json
{
  "success": false,
  "message": "Insufficient stock for some items",
  "errors": [
    {
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "requested": 1,
      "available": 0,
      "message": "Insufficient stock: Only 0 available, but 1 requested"
    }
  ]
}
```

**Notes:**
- Match items by category (case-insensitive), type (case-insensitive), and size (exact match)
- For items without sizes: `null`, `"N/A"`, or empty string all match
- Use transactions to ensure atomicity
- Allow both members and admins to deduct (when saving uniforms)

---

## 6. Announcements Endpoints

### 6.1. Get All Announcements
**Endpoint:** `GET /api/announcements`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "announcements": [
    {
      "id": "announcement-id",
      "title": "Important Notice",
      "content": "This is an announcement",
      "message": "Additional message details",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ]
}
```

**Notes:**
- Accessible by both members and admins
- Include `message` field in response

---

### 6.2. Create Announcement (Admin)
**Endpoint:** `POST /api/announcements`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Important Notice",
  "content": "This is an announcement",
  "message": "Additional message details"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Announcement created successfully",
  "announcement": {
    "id": "announcement-id",
    "title": "Important Notice",
    "content": "This is an announcement",
    "message": "Additional message details",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 6.3. Update Announcement (Admin)
**Endpoint:** `PUT /api/announcements/:id`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Notice",
  "content": "Updated content",
  "message": "Updated message"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Announcement updated successfully",
  "announcement": {
    "id": "announcement-id",
    "title": "Updated Notice",
    "content": "Updated content",
    "message": "Updated message",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

---

### 6.4. Delete Announcement (Admin)
**Endpoint:** `DELETE /api/announcements/:id`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```

---

## 7. Common Response Format

### Success Response
All successful responses should follow this format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
All error responses should follow this format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## 8. Authentication & Authorization

### JWT Token Structure
The JWT token should include:
```json
{
  "sispaId": "B1184040",
  "role": "member" | "admin",
  "id": "user-id",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Authorization Checks
- **Member endpoints**: Require valid JWT token
- **Admin endpoints**: Require valid JWT token AND `role: "admin"`
- Return `401 Unauthorized` if token is missing or invalid
- Return `403 Forbidden` if user doesn't have required role

---

## 9. Field Name Mapping

### Frontend → Backend
- `matricNo` → `matricNumber`
- `phone` → `phoneNumber`
- `profileImage` → `profilePicture`

### Backend → Frontend
- `matricNumber` → `matricNo`
- `phoneNumber` → `phone`
- `profilePicture` → `profileImage`

**Important:** Backend should use: `matricNumber`, `phoneNumber`, `profilePicture`

---

## 10. Data Filtering

### Filter Out "Batch 1" Dummy Data
The frontend filters out members with:
- `batch.toLowerCase() === "batch 1"`
- `batch === "1"`

Backend should NOT filter this (frontend handles it), but be aware that this data exists.

---

## 11. Implementation Checklist

- [ ] Login endpoint returns all user fields
- [ ] Signup endpoint checks `sispaId` uniqueness (not `memberId`)
- [ ] Profile update uses field names: `matricNumber`, `phoneNumber`, `profilePicture`
- [ ] Uniform endpoints return ALL items including accessories
- [ ] Inventory endpoints include `status` field
- [ ] Inventory deduction endpoint matches items correctly
- [ ] Announcements include `message` field
- [ ] All endpoints return `{ success: true/false, ... }` format
- [ ] JWT tokens include `sispaId` and `role`
- [ ] Admin endpoints check for `role: "admin"`
- [ ] Error responses are user-friendly

---

## 12. Testing Endpoints

Test these endpoints in order:

1. **Login** - `POST /api/members/login`
2. **Get Members** (Admin) - `GET /api/members`
3. **Get Inventory** (Admin) - `GET /api/inventory`
4. **Get Uniform** (Member) - `GET /api/members/uniform`
5. **Save Uniform** (Member) - `POST /api/members/uniform`
6. **Deduct Inventory** - `POST /api/inventory/deduct`
7. **Get Announcements** - `GET /api/announcements`

---

## 13. Notes

- All endpoints should handle CORS properly
- Use consistent date formats (ISO 8601)
- Handle null/undefined values gracefully
- Return appropriate HTTP status codes
- Include detailed error messages for debugging
- Log errors on server side
- Validate all input data
- Use database transactions for multi-step operations

---

**End of Document**

