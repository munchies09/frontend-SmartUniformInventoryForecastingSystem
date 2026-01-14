# Backend API Specification - Add New Size to Existing Item

## Overview
This document specifies the API requirements for adding a new size to an existing inventory item. When an admin clicks "Add Size" for an item (e.g., PVC Shoes), they should be able to add a new size entry (e.g., "UK 13") that doesn't currently exist in the inventory.

---

## Use Case

**Scenario:**
- Admin is managing "PVC Shoes" inventory
- Current sizes: UK 4, UK 5, UK 6, ..., UK 12
- Admin wants to add a new size: UK 13
- Admin clicks "Add Size" button
- Admin enters size "13" and initial quantity "0"
- System creates a new inventory item for "PVC Shoes" with size "13"

---

## API Endpoint

### POST /api/inventory

**Description:** Create a new inventory item (can be used to add a new size to an existing item type)

**Endpoint:**
```
POST /api/inventory
```

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Uniform No 3",
  "type": "PVC Shoes",
  "size": "13",
  "quantity": 0
}
```

**Field Descriptions:**
- `category` (string, required): The item category (e.g., "Uniform No 3", "Uniform No 4", "T-Shirt")
- `type` (string, required): The item type (e.g., "PVC Shoes", "Boot", "Cloth No 3")
- `size` (string | null, required): The size value
  - For items with sizes: The size value (e.g., "13", "XS", "S", "M", "L")
  - For shoes/boots: Store without "UK" prefix (e.g., "13" not "UK 13")
  - For accessories: `null` (no size)
- `quantity` (number, required): Initial quantity (default: 0)
- `name` (string, optional): Auto-generated from `type` if not provided

**Size Normalization:**
- Frontend may send "UK 13" or "13" for shoes/boots
- Backend should normalize to store without "UK" prefix
- Example: "UK 13" → "13", "13" → "13"

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Inventory item created successfully",
  "item": {
    "id": "inventory-item-id",
    "category": "Uniform No 3",
    "type": "PVC Shoes",
    "size": "13",
    "quantity": 0,
    "name": "PVC Shoes"
  }
}
```

**Error Response (400 Bad Request) - Duplicate Size:**
```json
{
  "success": false,
  "message": "Size '13' already exists for this item type"
}
```

**Error Response (400 Bad Request) - Missing Fields:**
```json
{
  "success": false,
  "message": "Missing required fields: category, type, quantity"
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Unauthorized. Admin access required."
}
```

---

## Validation Rules

### 1. **Duplicate Size Check**
- Before creating, check if an inventory item with the same `category`, `type`, and `size` already exists
- If exists, return error: "Size '{size}' already exists for this item type"
- This prevents duplicate size entries

### 2. **Size Format Validation**
- For shoes/boots (PVC Shoes, Boot):
  - Accept: "13", "UK 13", "uk 13"
  - Normalize to: "13" (remove "UK" prefix, case-insensitive)
- For other items with sizes:
  - Accept as-is: "XS", "S", "M", "L", "XL", "2XL", "3XL"
- For accessories:
  - Accept: `null` or empty string
  - Normalize to: `null`

### 3. **Quantity Validation**
- Must be a number
- Must be >= 0 (cannot be negative)
- Default to 0 if not provided

### 4. **Category and Type Validation**
- Must match existing item types in the system
- Category must be one of: "Uniform No 3", "Uniform No 4", "T-Shirt"
- Type must be a valid type for that category

---

## Database Operation

### Create New Inventory Item

```javascript
// Example: Add size "13" to "PVC Shoes"
const newItem = {
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "13",  // Normalized (no "UK" prefix)
  quantity: 0,
  name: "PVC Shoes"  // Auto-generated from type
};

// Check for duplicate
const existing = await Inventory.findOne({
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "13"
});

if (existing) {
  throw new Error("Size '13' already exists for this item type");
}

// Create new item
const item = await Inventory.create(newItem);
```

---

## Frontend Behavior

### When Admin Clicks "Add Size" Button

1. **Modal Opens:**
   - Shows form with "Size" and "Initial Quantity" fields
   - Size field has placeholder based on item type
   - Quantity defaults to 0

2. **Admin Enters Data:**
   - Size: e.g., "13" or "UK 13" (for shoes/boots)
   - Quantity: e.g., 0

3. **Frontend Validation:**
   - Checks if size is not empty
   - Checks if size doesn't already exist in current display
   - Normalizes size format before sending

4. **API Call:**
   ```javascript
   POST /api/inventory
   {
     category: "Uniform No 3",
     type: "PVC Shoes",
     size: "13",  // Normalized
     quantity: 0
   }
   ```

5. **On Success:**
   - Modal closes
   - Inventory list refreshes
   - New size appears in the table
   - Success message shown

6. **On Error:**
   - Error message displayed
   - Modal stays open for correction

---

## Size Normalization Examples

### Shoes/Boots (PVC Shoes, Boot)

| Frontend Input | Backend Storage | Display |
|----------------|----------------|---------|
| "13" | "13" | "UK 13" |
| "UK 13" | "13" | "UK 13" |
| "uk 13" | "13" | "UK 13" |
| "UK13" | "13" | "UK 13" |

### Clothing (Cloth, Pants, Shirts)

| Frontend Input | Backend Storage | Display |
|----------------|----------------|---------|
| "XS" | "XS" | "XS" |
| "2XL" | "2XL" | "2XL" |
| "3XL" | "3XL" | "3XL" |

### Accessories

| Frontend Input | Backend Storage | Display |
|----------------|----------------|---------|
| null | null | "N/A" |
| "" | null | "N/A" |

---

## Implementation Checklist

### Backend Tasks

- [ ] **Verify POST /api/inventory endpoint**
  - Accepts `category`, `type`, `size`, `quantity`
  - Normalizes size format (removes "UK" prefix for shoes/boots)
  - Checks for duplicate sizes before creating
  - Returns appropriate success/error responses

- [ ] **Implement Duplicate Check**
  - Query database for existing item with same category, type, size
  - Return error if duplicate found
  - Allow creation if not duplicate

- [ ] **Implement Size Normalization**
  - For shoes/boots: Remove "UK" prefix (case-insensitive)
  - For other items: Keep as-is
  - For accessories: Convert to null

- [ ] **Verify Authentication**
  - Only admins can add sizes
  - Check JWT token and admin role

- [ ] **Test Add Size Operations**
  - Test adding new size to existing item
  - Test duplicate size prevention
  - Test size normalization
  - Test quantity validation

---

## Example API Calls

### Example 1: Add Size "13" to PVC Shoes

**Request:**
```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "Uniform No 3",
  "type": "PVC Shoes",
  "size": "13",
  "quantity": 0
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Inventory item created successfully",
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "category": "Uniform No 3",
    "type": "PVC Shoes",
    "size": "13",
    "quantity": 0,
    "name": "PVC Shoes"
  }
}
```

---

### Example 2: Try to Add Duplicate Size

**Request:**
```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "Uniform No 3",
  "type": "PVC Shoes",
  "size": "4",
  "quantity": 5
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Size '4' already exists for this item type"
}
```

---

### Example 3: Add Size with "UK" Prefix (Shoes/Boots)

**Request:**
```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "Uniform No 4",
  "type": "Boot",
  "size": "UK 13",
  "quantity": 10
}
```

**Backend Normalization:**
- Input: "UK 13"
- Stored: "13" (removes "UK" prefix)
- Display: "UK 13" (frontend adds prefix back)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Inventory item created successfully",
  "item": {
    "id": "507f1f77bcf86cd799439012",
    "category": "Uniform No 4",
    "type": "Boot",
    "size": "13",
    "quantity": 10,
    "name": "Boot"
  }
}
```

---

## Important Notes

1. **Duplicate Prevention:**
   - Backend must check for duplicates before creating
   - Prevents multiple entries for the same size
   - Returns clear error message if duplicate found

2. **Size Normalization:**
   - Backend stores sizes in normalized format
   - Frontend handles display formatting (adds "UK" prefix for shoes/boots)
   - Ensures consistency in database

3. **Accessories:**
   - Items without sizes (accessories) should not allow "Add Size"
   - Frontend should disable button for accessories
   - Backend should reject size additions for accessories

4. **Image Handling:**
   - Adding a new size does NOT require a new image
   - Uses the same image as the item type
   - Image is stored at the item type level, not size level

5. **Quantity:**
   - Initial quantity can be 0
   - Admin can update quantity later using +/- buttons
   - Quantity is per size, not per item type

---

## Testing Recommendations

### Test Case 1: Add New Size
```javascript
// 1. Get current sizes for "PVC Shoes"
GET /api/inventory?category=Uniform No 3&type=PVC Shoes

// 2. Add new size "13"
POST /api/inventory
{
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "13",
  quantity: 0
}

// 3. Verify new size exists
GET /api/inventory?category=Uniform No 3&type=PVC Shoes
// Should include size "13"
```

### Test Case 2: Duplicate Prevention
```javascript
// 1. Add size "13"
POST /api/inventory
{
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "13",
  quantity: 0
}

// 2. Try to add same size again
POST /api/inventory
{
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "13",
  quantity: 5
}

// Should return 400 error: "Size '13' already exists"
```

### Test Case 3: Size Normalization
```javascript
// 1. Add size with "UK" prefix
POST /api/inventory
{
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "UK 13",
  quantity: 0
}

// 2. Verify stored without prefix
GET /api/inventory
// Should return size: "13" (not "UK 13")

// 3. Try to add "13" (should be duplicate)
POST /api/inventory
{
  category: "Uniform No 3",
  type: "PVC Shoes",
  size: "13",
  quantity: 5
}

// Should return 400 error (duplicate)
```

---

## Summary

**Key Points:**
1. ✅ Use existing `POST /api/inventory` endpoint to add new sizes
2. ✅ Backend must check for duplicate sizes before creating
3. ✅ Backend must normalize size format (remove "UK" prefix for shoes/boots)
4. ✅ Frontend validates and normalizes before sending
5. ✅ New size appears in inventory table after successful creation
6. ✅ Image is shared across all sizes of the same item type

**Backend Must Ensure:**
- Duplicate size prevention
- Size format normalization
- Proper error messages
- Authentication and authorization
