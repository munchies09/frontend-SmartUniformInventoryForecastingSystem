# Backend Implementation Prompt for Uniform Management System

## Overview
I need you to implement backend API endpoints for a uniform management system where members can save and update their uniform information. The system supports three types of uniforms: Uniform No 3, Uniform No 4, and T-Shirt.

## API Endpoints Required

### 1. GET /api/members/uniform
**Purpose**: Get all uniform items for the authenticated member
**Authentication**: Required (JWT token in Authorization header)
**Response Format**:
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
        "type": "Nametag",
        "size": "N/A",
        "quantity": 1,
        "notes": "John Doe"
      },
      {
        "category": "Uniform No 3",
        "type": "Apulet",
        "size": "N/A",
        "quantity": 1
      }
    ],
    "itemCount": 4,
    "updatedAt": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**If no uniform exists**:
```json
{
  "success": false,
  "message": "Uniform not found. Please add your uniform items first.",
  "items": []
}
```

### 2. POST /api/members/uniform
**Purpose**: Create new uniform items for the authenticated member
**Authentication**: Required (JWT token in Authorization header)
**Request Body**:
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
      "type": "Pants No 3",
      "size": "L",
      "quantity": 1
    },
    {
      "category": "Uniform No 3",
      "type": "PVC Shoes",
      "size": "UK 8",
      "quantity": 1
    },
    {
      "category": "Uniform No 3",
      "type": "Beret",
      "size": "7 1/2",
      "quantity": 1
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
      "size": "N/A",
      "quantity": 1
    }
  ]
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "Uniform collection created successfully",
  "uniform": {
    "sispaId": "B1184848",
    "items": [...],
    "itemCount": 6
  }
}
```

### 3. PUT /api/members/uniform
**Purpose**: Update/replace all uniform items for the authenticated member
**Authentication**: Required (JWT token in Authorization header)
**Request Body**: Same as POST
**Response Format**: Same as POST, but message should be "Uniform updated successfully"

## Data Structure

### Uniform Categories and Types

#### Uniform No 3
- **Category**: "Uniform No 3"
- **Types**:
  - "Cloth No 3" (size: XS, S, M, L, XL, 2XL, 3XL)
  - "Pants No 3" (size: XS, S, M, L, XL, 2XL, 3XL)
  - "PVC Shoes" (size: UK 4-12, format: "UK 8")
  - "Beret" (size: 6 1/2, 6 5/8, 6 3/4, 6 7/8, 7, 7 1/8, 7 1/4, 7 3/8, 7 1/2, 7 5/8, 7 3/4, 7 7/8, 8, 8 1/8, 8 1/4, 8 3/8)
  - "Nametag" (size: "N/A", notes field contains the name text)
  - **Accessories** (size: "N/A", quantity: 1):
    - "Apulet"
    - "Integrity Badge"
    - "Gold Badge"
    - "Cel Bar"
    - "Beret Logo Pin"
    - "Belt No 3"

#### Uniform No 4
- **Category**: "Uniform No 4"
- **Types**:
  - "Cloth No 4" (size: XS, S, M, L, XL, 2XL, 3XL)
  - "Pants No 4" (size: XS, S, M, L, XL, 2XL, 3XL)
  - "Boot" (size: UK 2-12, format: "UK 8")
  - "Nametag" (size: "N/A", notes field contains the name text)
  - **Accessories** (size: "N/A", quantity: 1):
    - "APM Tag"
    - "Belt No 4"

#### T-Shirt
- **Category**: "T-Shirt"
- **Types**:
  - "Digital Shirt" (size: XS, S, M, L, XL, 2XL, 3XL)
  - "Inner APM Shirt" (size: XS, S, M, L, XL, 2XL, 3XL)
  - "Company Shirt" (size: XS, S, M, L, XL, 2XL, 3XL)

## Database Schema

### MemberUniform Collection/Model
```javascript
{
  _id: ObjectId,
  sispaId: String (required, indexed),
  items: [
    {
      category: String (required), // "Uniform No 3", "Uniform No 4", "T-Shirt"
      type: String (required), // e.g., "Cloth No 3", "Digital Shirt"
      size: String (required), // e.g., "M", "UK 8", "7 1/2", "N/A"
      quantity: Number (required, default: 1),
      notes: String (optional) // Used for nametag text
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## Important Implementation Notes

1. **Authentication**: All endpoints must verify JWT token and extract `sispaId` from the token (not from request body or params)

2. **User Identification**: Use `sispaId` from the JWT token to identify the member. Do NOT accept `sispaId` from request body or URL params for security.

3. **PUT vs POST Behavior**:
   - **POST**: If member already has uniform items, ADD new items to existing collection. If no collection exists, create new one.
   - **PUT**: REPLACE all existing items with new items array. If no collection exists, create new one.

4. **Validation**:
   - Validate that `items` is an array
   - Validate that each item has: `category`, `type`, `size`, `quantity`
   - Validate `quantity >= 1`
   - Optional: Validate size values against allowed sizes for each type

5. **Error Handling**:
   - Return `success: false` with appropriate error messages
   - Handle duplicate items gracefully (you may want to merge or replace)
   - Return proper HTTP status codes (200 for success, 400 for validation errors, 401 for auth errors, 500 for server errors)

6. **Response Consistency**:
   - Always return `success: true/false` boolean
   - Include `message` field for user-friendly messages
   - Include full uniform object in response after create/update

7. **Case Sensitivity**: 
   - Category and type matching should be case-insensitive when parsing (frontend sends exact case, but backend should handle variations)

## Example Request/Response Flow

### Creating Uniform No 3:
**Request**:
```json
POST /api/members/uniform
Authorization: Bearer <token>
{
  "items": [
    { "category": "Uniform No 3", "type": "Cloth No 3", "size": "M", "quantity": 1 },
    { "category": "Uniform No 3", "type": "Pants No 3", "size": "L", "quantity": 1 },
    { "category": "Uniform No 3", "type": "PVC Shoes", "size": "UK 8", "quantity": 1 },
    { "category": "Uniform No 3", "type": "Beret", "size": "7 1/2", "quantity": 1 },
    { "category": "Uniform No 3", "type": "Nametag", "size": "N/A", "quantity": 1, "notes": "John Doe" },
    { "category": "Uniform No 3", "type": "Apulet", "size": "N/A", "quantity": 1 }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Uniform collection created successfully",
  "uniform": {
    "sispaId": "B1184848",
    "items": [...],
    "itemCount": 6
  }
}
```

## Testing Checklist

- [ ] GET returns empty array when no uniform exists
- [ ] POST creates new collection when none exists
- [ ] POST adds items to existing collection
- [ ] PUT replaces all items
- [ ] PUT creates collection if none exists
- [ ] All endpoints require authentication
- [ ] All endpoints use sispaId from JWT token
- [ ] Validation errors return proper messages
- [ ] Response format is consistent

## Integration with Existing Code

You already have a `MemberUniform` model and uniform controller. Please update the existing endpoints to match this specification. The frontend is already calling:
- `GET /api/members/uniform` (no ID in path)
- `POST /api/members/uniform` (no ID in path)
- `PUT /api/members/uniform` (no ID in path)

All endpoints should use JWT token authentication and extract `sispaId` from the token.

