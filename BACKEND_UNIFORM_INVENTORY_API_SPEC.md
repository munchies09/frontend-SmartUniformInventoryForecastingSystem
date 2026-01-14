# Backend API Specification for Uniform & Inventory Management

This document provides comprehensive API specifications for all uniform and inventory management features implemented in the frontend.

## Base URL
```
http://localhost:5000
```

---

## Table of Contents
1. [Member Uniform Management](#member-uniform-management)
2. [Admin Inventory Management](#admin-inventory-management)
3. [Shirt Price Management](#shirt-price-management)
4. [Profile Gender Field](#profile-gender-field)

---

## Member Uniform Management

### 1. Fetch Member Uniform Data

#### Endpoint
```
GET /api/members/uniform
```

#### Headers
```
Authorization: Bearer <jwt-token>
```

#### Description
Fetches the current uniform data for the authenticated member. The `sispaId` should be extracted from the JWT token.

#### Success Response (200 OK)
```json
{
  "success": true,
  "uniform": {
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
        "type": "Nametag",
        "size": "N/A",
        "quantity": 1,
        "notes": "John Doe"
      },
      {
        "category": "Uniform No 3",
        "type": "Apulet",
        "size": null,
        "quantity": 1,
        "notes": null
      },
      {
        "category": "T-Shirt",
        "type": "Digital Shirt",
        "size": "L",
        "quantity": 1,
        "notes": null
      }
    ]
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Uniform data not found"
}
```

---

### 2. Save/Update Member Uniform Data

#### Endpoint
```
PUT /api/members/uniform
```

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body
```json
{
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
      "size": "L",
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "PVC Shoes",
      "size": "8",
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "Beret",
      "size": "7 1/4",
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
      "category": "Uniform No 3",
      "type": "Apulet",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "Integrity Badge",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "Gold Badge",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "Cel Bar",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "Beret Logo Pin",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 3",
      "type": "Belt No 3",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 4",
      "type": "Cloth No 4",
      "size": "M",
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
      "size": "9",
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
      "category": "Uniform No 4",
      "type": "APM Tag",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "Uniform No 4",
      "type": "Belt No 4",
      "size": null,
      "quantity": 1,
      "notes": null
    },
    {
      "category": "T-Shirt",
      "type": "Digital Shirt",
      "size": "L",
      "quantity": 1,
      "notes": null
    },
    {
      "category": "T-Shirt",
      "type": "Company Shirt",
      "size": "M",
      "quantity": 1,
      "notes": null
    },
    {
      "category": "T-Shirt",
      "type": "Inner APM Shirt",
      "size": "L",
      "quantity": 1,
      "notes": null
    }
  ]
}
```

#### Field Descriptions
- `items` (array, required): Array of uniform items
  - `category` (string, required): "Uniform No 3", "Uniform No 4", or "T-Shirt"
  - `type` (string, required): Item type (e.g., "Cloth No 3", "Digital Shirt", "Apulet")
  - `size` (string, optional): Item size. Use:
    - Actual size for items with sizes (e.g., "M", "L", "8", "7 1/4")
    - "N/A" for nametags
    - `null` for accessories without sizes
  - `quantity` (number, required): Usually 1
  - `notes` (string, optional): Used for nametag text. For nametags, this contains the name.

#### Important Notes
- For shoes/boots, size is sent without "UK" prefix (e.g., "8" not "UK 8")
- For nametags, `size` is "N/A" and `notes` contains the name text
- For accessories, `size` is `null`
- PUT replaces ALL existing items with the new items array

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Uniform data updated successfully",
  "uniform": {
    "items": [...]
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error: ..."
}
```

---

### 3. Status Tracking (Frontend Only)

**Note:** Status ("Available", "Missing", "Not Available") is calculated on the frontend based on:
- If item has a size selected → "Available"
- If item has no size → "Missing"
- If status is explicitly set to "Not Available" → "Not Available"

The backend does not need to store status separately as it can be derived from the presence/absence of items in the uniform data.

---

## Admin Inventory Management

### 1. Fetch All Inventory Items

#### Endpoint
```
GET /api/inventory
```

#### Headers
```
Authorization: Bearer <jwt-token>
```

#### Description
Fetches all inventory items. Only accessible by admin users.

#### Success Response (200 OK)
```json
{
  "success": true,
  "inventory": [
    {
      "id": "507f1f77bcf86cd799439011",
      "category": "Uniform No 3",
      "type": "Cloth No 3",
      "size": "M",
      "quantity": 10
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "category": "Uniform No 3",
      "type": "Apulet",
      "size": null,
      "quantity": 25
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "category": "T-Shirt",
      "type": "Digital Shirt",
      "size": "L",
      "quantity": 15
    }
  ]
}
```

#### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

---

### 2. Create Inventory Item

#### Endpoint
```
POST /api/inventory
```

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body
```json
{
  "category": "Uniform No 3",
  "type": "Cloth No 3",
  "size": "M",
  "quantity": 10
}
```

#### Field Descriptions
- `category` (string, required): "Uniform No 3", "Uniform No 4", or "T-Shirt"
- `type` (string, required): Item type
- `size` (string, optional): Item size. Use `null` for items without sizes (accessories)
- `quantity` (number, required): Initial quantity (must be >= 0)

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Inventory item created successfully",
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "M",
    "quantity": 10
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation error: ..."
}
```

---

### 3. Update Inventory Item Quantity

#### Endpoint
```
PUT /api/inventory/:id
```

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### URL Parameters
- `id` (string, required): Inventory item ID

#### Request Body
```json
{
  "quantity": 15
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Inventory item updated successfully",
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "category": "Uniform No 3",
    "type": "Cloth No 3",
    "size": "M",
    "quantity": 15
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

---

### 4. Delete Inventory Item (Single Size)

#### Endpoint
```
DELETE /api/inventory/:id
```

#### Headers
```
Authorization: Bearer <jwt-token>
```

#### URL Parameters
- `id` (string, required): Inventory item ID

#### Description
Deletes a single inventory item (e.g., "Cloth No 3" size "M"). Used when admin wants to remove a specific size from inventory.

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

---

### 5. Delete All Inventory Items for a Type

#### Endpoint
```
DELETE /api/inventory/type/:category/:type
```

#### Headers
```
Authorization: Bearer <jwt-token>
```

#### URL Parameters
- `category` (string, required): Item category ("Uniform No 3", "Uniform No 4", "T-Shirt")
- `type` (string, required): Item type (e.g., "GUTTER", "Cloth No 3")

#### Description
Deletes ALL inventory entries for a specific item type. Used when admin wants to completely remove an item from the system (e.g., delete "GUTTER" item).

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "All inventory items for type deleted successfully",
  "deletedCount": 5
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "No inventory items found for this type"
}
```

---

## Shirt Price Management

### 1. Fetch Shirt Prices

#### Endpoint
```
GET /api/inventory/shirt-prices
```

#### Headers
```
Authorization: Bearer <jwt-token>
```

#### Description
Fetches prices for all three shirt types. Accessible by both members and admins.

#### Success Response (200 OK)
```json
{
  "success": true,
  "prices": {
    "digitalShirt": 25.00,
    "companyShirt": 30.00,
    "innerApmShirt": 20.00
  }
}
```

#### Response When Prices Not Set
```json
{
  "success": true,
  "prices": {
    "digitalShirt": null,
    "companyShirt": null,
    "innerApmShirt": null
  }
}
```

---

### 2. Update Shirt Price

#### Endpoint
```
PUT /api/inventory/shirt-prices
```

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Description
Updates the price for a specific shirt type. Only accessible by admin users.

#### Request Body
```json
{
  "type": "Digital Shirt",
  "price": 25.00
}
```

#### Field Descriptions
- `type` (string, required): One of "Digital Shirt", "Company Shirt", or "Inner APM Shirt"
- `price` (number, optional): Price in RM. Use `null` to unset the price.

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Shirt price updated successfully",
  "price": {
    "type": "Digital Shirt",
    "price": 25.00
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid shirt type or price"
}
```

#### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

---

## Admin Member Management

### 1. Get All Members (Admin)

#### Endpoint
```
GET /api/members
```

#### Headers
```
Authorization: Bearer <admin-jwt-token>
```

#### Description
Fetches all members. Only accessible by admin users. **IMPORTANT: Must include `gender` field in response.**

#### Success Response (200 OK)
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
      "gender": "Male",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    },
    {
      "id": "member-id-2",
      "sispaId": "B1184040",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "member",
      "batch": "Kompeni 9",
      "matricNumber": "A123457",
      "phoneNumber": "+60123456790",
      "profilePicture": "https://example.com/profile2.jpg",
      "gender": "Female",
      "createdAt": "2024-01-16T10:30:00.000Z",
      "updatedAt": "2024-01-21T14:45:00.000Z"
    }
  ],
  "total": 2
}
```

#### Field Descriptions
- `gender` (string, optional): "Male" or "Female". **Must be included in response even if null/undefined.**

#### Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

#### Important Notes
- **CRITICAL**: The `gender` field MUST be included in the response for each member
- If gender is not set, return `null` or `undefined` (not omit the field)
- Frontend expects this field to display gender in admin member profile view

---

## Profile Gender Field

### 1. Update Member Profile (Including Gender)

#### Endpoint
```
PUT /api/members/profile
```

#### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "batch": "2024",
  "sispaId": "B1234567",
  "gender": "Male"
}
```

#### Field Descriptions
- `gender` (string, optional): "Male" or "Female"

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "batch": "2024",
    "sispaId": "B1234567",
    "gender": "Male"
  }
}
```

**Note:** See `BACKEND_PROFILE_GENDER_API_SPEC.md` for complete gender field implementation details.

---

## Database Schema

### Inventory Collection
```javascript
{
  _id: ObjectId,
  category: String, // "Uniform No 3", "Uniform No 4", "T-Shirt"
  type: String, // "Cloth No 3", "Digital Shirt", "GUTTER", etc.
  size: String | null, // "M", "L", "8", "7 1/4", or null for accessories
  quantity: Number, // >= 0
  createdAt: Date,
  updatedAt: Date
}
```

### MemberUniform Collection
```javascript
{
  _id: ObjectId,
  sispaId: String (required, indexed),
  items: [
    {
      category: String, // "Uniform No 3", "Uniform No 4", "T-Shirt"
      type: String, // "Cloth No 3", "Digital Shirt", "Apulet", etc.
      size: String | null, // "M", "L", "8", "7 1/4", "N/A" (for nametags), or null (for accessories)
      quantity: Number, // Usually 1
      notes: String | null // Used for nametag text
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### ShirtPrices Collection
```javascript
{
  _id: ObjectId,
  type: String, // "Digital Shirt", "Company Shirt", "Inner APM Shirt"
  price: Number | null, // Price in RM, or null if not set
  updatedAt: Date
}
```

### Member Profile Collection
```javascript
{
  _id: ObjectId,
  sispaId: String (required, indexed),
  name: String,
  email: String,
  batch: String,
  gender: String, // "Male" or "Female" (optional)
  // ... other fields
  createdAt: Date,
  updatedAt: Date
}
```

---

## Implementation Checklist

### Member Uniform Management
- [ ] Implement `GET /api/members/uniform` - Fetch member uniform data
- [ ] Implement `PUT /api/members/uniform` - Save/update uniform data
- [ ] Validate item categories and types
- [ ] Handle nametag notes field
- [ ] Handle size formats (with/without "UK" prefix for shoes/boots)

### Admin Inventory Management
- [ ] Implement `GET /api/inventory` - Fetch all inventory (admin only)
- [ ] Implement `POST /api/inventory` - Create inventory item
- [ ] Implement `PUT /api/inventory/:id` - Update inventory quantity
- [ ] Implement `DELETE /api/inventory/:id` - Delete single inventory item
- [ ] Implement `DELETE /api/inventory/type/:category/:type` - Delete all items for a type
- [ ] Add admin role verification middleware

### Shirt Price Management
- [ ] Create `ShirtPrices` collection/model
- [ ] Implement `GET /api/inventory/shirt-prices` - Fetch shirt prices
- [ ] Implement `PUT /api/inventory/shirt-prices` - Update shirt price (admin only)
- [ ] Add validation for shirt types and price values

### Admin Member Management
- [ ] Implement `GET /api/members` - Get all members (admin only)
- [ ] **CRITICAL**: Ensure `GET /api/members` includes `gender` field in response
- [ ] Return `gender: null` if not set (don't omit the field)

### Profile Gender Field
- [ ] Add `gender` field to Member schema
- [ ] Update `PUT /api/members/profile` to handle gender
- [ ] Update `GET /api/members/profile` to return gender
- [ ] Update `GET /api/members` (admin endpoint) to return gender
- [ ] Update login/signup endpoints to include gender

---

## Important Notes

1. **Authentication**: All endpoints require JWT token in Authorization header
2. **User Identification**: Extract `sispaId` from JWT token, NOT from request body
3. **Size Formats**:
   - Shoes/Boots: Store without "UK" prefix (e.g., "8" not "UK 8")
   - Frontend will add "UK" prefix for display
4. **Nametags**: 
   - `size` = "N/A"
   - `notes` = name text
5. **Accessories**: 
   - `size` = `null`
   - `quantity` = 1
6. **Admin Verification**: All inventory management endpoints must verify admin role
7. **Price Updates**: Shirt prices should be stored separately and accessible to both members and admins

---

## Error Handling

All endpoints should return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Testing Recommendations

1. Test uniform data CRUD operations for members
2. Test inventory management for admins
3. Test shirt price updates
4. Test nametag handling (size="N/A", notes=name)
5. Test accessory items (size=null)
6. Test shoe/boot size formats (with/without "UK")
7. Test admin-only endpoints with member tokens (should fail)
8. Test member endpoints with admin tokens (should work)

---

## Frontend Integration Notes

The frontend currently uses:
- `localStorage` for shirt prices (temporary solution)
- Frontend calculates status based on item presence
- Frontend handles "UK" prefix display for shoes/boots

Once backend APIs are implemented:
- Replace `localStorage` with API calls for shirt prices
- All data will be persisted in database
- Status can be calculated server-side if needed
