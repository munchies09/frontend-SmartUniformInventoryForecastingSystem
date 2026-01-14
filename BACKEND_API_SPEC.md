# Backend API Specification for Admin Member Management

This document provides the API specifications needed for the admin member management page.

## Base URL
```
http://localhost:5000
```

---

## 1. Admin Login Endpoint

### Endpoint
```
POST /api/members/login
```

### Request Body
```json
{
  "sispaId": "admin",
  "password": "your-admin-password"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "admin-id",
    "sispaId": "admin",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "batch": "",
    "matricNumber": null,
    "phoneNumber": null,
    "profilePicture": null
  },
  "token": "jwt-token-here"
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid ID or Password"
}
```

### Notes
- Admin account should have `sispaId: "admin"` and `role: "admin"`
- Password should be hashed in the database
- JWT token should include `sispaId` and `role` in the payload

---

## 2. Get All Members (Admin Only)

### Endpoint
```
GET /api/members
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
```

### Success Response (200 OK)
```json
{
  "success": true,
  "members": [
    {
      "id": "member-id-1",
      "sispaId": "B1184848",
      "memberId": "B1184848",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "member",
      "batch": "2024",
      "matricNumber": "A123456",
      "phoneNumber": "+60123456789",
      "profilePicture": "https://example.com/profile.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    },
    {
      "id": "member-id-2",
      "sispaId": "B1184849",
      "memberId": "B1184849",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "role": "member",
      "batch": "2024",
      "matricNumber": "A123457",
      "phoneNumber": "+60123456790",
      "profilePicture": null,
      "createdAt": "2024-01-16T11:00:00.000Z",
      "updatedAt": "2024-01-21T09:20:00.000Z"
    }
  ],
  "total": 2
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
- Should return all members except the admin account
- Fields like `matricNumber`, `phoneNumber`, and `profilePicture` can be `null` if not set
- `batch` can be an empty string if not assigned

---

## 3. Get Member Uniform by SISPA ID (Admin Only)

### Endpoint
```
GET /api/members/:sispaId/uniform
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
```

### URL Parameters
- `sispaId` (string, required): The SISPA ID of the member

### Example Request
```
GET /api/members/B1184848/uniform
```

### Success Response (200 OK)
```json
{
  "success": true,
  "uniform": {
    "sispaId": "B1184848",
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Cloth No 3",
        "size": "M",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 3",
        "type": "Pants No 3",
        "size": "M",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 3",
        "type": "PVC Shoes",
        "size": "UK 8",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 3",
        "type": "Beret",
        "size": "One Size",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 3",
        "type": "Nametag",
        "size": "N/A",
        "quantity": 1,
        "notes": "John Doe"
      },
      {
        "category": "Uniform No 4",
        "type": "Cloth No 4",
        "size": "L",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 4",
        "type": "Pants No 4",
        "size": "L",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 4",
        "type": "Boot",
        "size": "UK 9",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "Uniform No 4",
        "type": "Nametag",
        "size": "N/A",
        "quantity": 1,
        "notes": "John Doe"
      },
      {
        "category": "T-Shirt",
        "type": "Digital Shirt",
        "size": "M",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "T-Shirt",
        "type": "Inner APM Shirt",
        "size": "M",
        "quantity": 1,
        "notes": null
      },
      {
        "category": "T-Shirt",
        "type": "Company Shirt",
        "size": "L",
        "quantity": 1,
        "notes": null
      }
    ],
    "itemCount": 12,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Uniform not found for this member",
  "items": []
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
- If a member doesn't have uniform data, return 404 with `items: []`
- The `items` array contains all uniform items for the member
- Each item should have `category`, `type`, `size`, `quantity`, and optional `notes`
- Categories should match: "Uniform No 3", "Uniform No 4", "T-Shirt"
- Types should match the frontend expectations (e.g., "Cloth No 3", "Pants No 3", "PVC Shoes", "Beret", "Nametag", "Cloth No 4", "Pants No 4", "Boot", "Digital Shirt", "Inner APM Shirt", "Company Shirt")

---

## 4. Authentication Middleware

### JWT Token Structure
The JWT token should include:
```json
{
  "sispaId": "admin",
  "role": "admin",
  "id": "admin-id",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Middleware Requirements
- Verify JWT token from `Authorization: Bearer <token>` header
- Check if user exists and is authenticated
- For admin-only endpoints, verify `role === "admin"`
- Return 401 if token is missing or invalid
- Return 403 if user doesn't have required role

---

## 5. Database Schema Examples

### Member Schema
```javascript
{
  _id: ObjectId,
  sispaId: String (required, unique),
  memberId: String (optional),
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ["admin", "member"], default: "member"),
  batch: String (optional),
  matricNumber: String (optional),
  phoneNumber: String (optional),
  profilePicture: String (optional, URL),
  createdAt: Date,
  updatedAt: Date
}
```

### Uniform Schema
```javascript
{
  _id: ObjectId,
  sispaId: String (required, unique, references Member),
  items: [
    {
      category: String (required), // "Uniform No 3", "Uniform No 4", "T-Shirt"
      type: String (required), // "Cloth No 3", "Pants No 3", etc.
      size: String (required),
      quantity: Number (required, min: 1),
      notes: String (optional)
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 6. Testing Checklist

### Admin Login
- [ ] Login with `sispaId: "admin"` and correct password returns success
- [ ] Login with `sispaId: "admin"` and wrong password returns error
- [ ] Response includes `role: "admin"` in user object
- [ ] JWT token is returned and valid

### Get All Members
- [ ] Returns all members when authenticated as admin
- [ ] Returns 401 when not authenticated
- [ ] Returns 403 when authenticated as member (not admin)
- [ ] Response includes all required fields (sispaId, name, email, batch, etc.)
- [ ] Handles null/empty optional fields correctly

### Get Member Uniform
- [ ] Returns uniform data when member has uniform
- [ ] Returns 404 when member has no uniform data
- [ ] Returns 401 when not authenticated
- [ ] Returns 403 when authenticated as member (not admin)
- [ ] Items array is properly structured
- [ ] Categories and types match frontend expectations

---

## 7. Sample Test Data

### Admin User
```json
{
  "sispaId": "admin",
  "name": "System Administrator",
  "email": "admin@sispa.com",
  "password": "admin123", // Should be hashed (bcrypt)
  "role": "admin"
}
```

### Sample Members
```json
[
  {
    "sispaId": "B1184848",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "hashed-password",
    "role": "member",
    "batch": "2024",
    "matricNumber": "A123456",
    "phoneNumber": "+60123456789"
  },
  {
    "sispaId": "B1184849",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "password": "hashed-password",
    "role": "member",
    "batch": "2024",
    "matricNumber": "A123457",
    "phoneNumber": "+60123456790"
  },
  {
    "sispaId": "B1184850",
    "name": "Bob Johnson",
    "email": "bob.johnson@example.com",
    "password": "hashed-password",
    "role": "member",
    "batch": "2023",
    "matricNumber": null,
    "phoneNumber": null
  }
]
```

### Sample Uniform Data
```json
{
  "sispaId": "B1184848",
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
      "size": "M",
      "quantity": 1
    },
    {
      "category": "Uniform No 4",
      "type": "Cloth No 4",
      "size": "L",
      "quantity": 1
    },
    {
      "category": "T-Shirt",
      "type": "Digital Shirt",
      "size": "M",
      "quantity": 1
    }
  ]
}
```

---

## 8. Error Handling

All endpoints should:
- Return consistent error format: `{ "success": false, "message": "Error message" }`
- Use appropriate HTTP status codes:
  - `200` - Success
  - `201` - Created
  - `400` - Bad Request (validation errors)
  - `401` - Unauthorized (not authenticated)
  - `403` - Forbidden (not authorized)
  - `404` - Not Found
  - `500` - Internal Server Error
- Include error messages that are user-friendly
- Log errors on the server side for debugging

---

## 9. CORS Configuration

Make sure CORS is enabled for the frontend:
```javascript
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true
}));
```

---

## 10. Quick Implementation Guide

### Express.js Example Routes

```javascript
// routes/memberRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const memberController = require('../controllers/memberController');
const uniformController = require('../controllers/uniformController');

// Login (public)
router.post('/login', memberController.loginMember);

// Get all members (admin only)
router.get('/', authMiddleware, adminMiddleware, memberController.getAllMembers);

// Get member uniform by sispaId (admin only)
router.get('/:sispaId/uniform', authMiddleware, adminMiddleware, uniformController.getMemberUniform);

module.exports = router;
```

### Middleware Example

```javascript
// middleware/auth.js
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin only.' 
    });
  }
};
```

---

This specification should be sufficient to implement the backend APIs needed for the admin member management page. Let me know if you need any clarifications or additional endpoints!

