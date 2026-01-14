# Backend Commands: Inventory Item Image and Size Chart Upload Feature

## Overview
The frontend now supports uploading **item images** and **size charts** for inventory items in the admin inventory management page. Admins can click on item images or size chart placeholders to upload new images, which will update all inventory items of that type.

## ⚠️ CRITICAL: Required Backend Changes

### 1. Database Schema Update

#### Inventory Collection - Add Image and Size Chart Fields

**Current Schema:**
```javascript
{
  category: String,
  type: String,
  size: String | null,
  quantity: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**Updated Schema (REQUIRED):**
```javascript
{
  category: String,
  type: String,
  size: String | null,
  quantity: Number,
  image: String | null,        // NEW: Base64 encoded image or URL
  sizeChart: String | null,    // NEW: Base64 encoded size chart image or URL
  createdAt: Date,
  updatedAt: Date
}
```

**Migration Script:**
```javascript
// Add image and sizeChart fields to existing documents
db.inventory.updateMany(
  {
    $or: [
      { image: { $exists: false } },
      { sizeChart: { $exists: false } }
    ]
  },
  {
    $set: {
      image: null,
      sizeChart: null
    }
  }
);
```

---

### 2. API Endpoint Updates

#### 2.1. Update Inventory Item (PUT) - **REQUIRED UPDATE**

**Endpoint:** `PUT /api/inventory/:id`

**Current Behavior:**
- Only accepts `quantity` field
- Does not support `image` or `sizeChart` fields

**Required Changes:**
- Accept `image` field in request body (Base64 string or URL)
- Accept `sizeChart` field in request body (Base64 string or URL)
- Allow partial updates (can update `quantity`, `image`, `sizeChart` independently or together)

**Updated Request Body:**
```json
{
  "quantity": 45,                    // Optional: Update quantity
  "image": "data:image/png;base64,...",  // Optional: Update item image (Base64)
  "sizeChart": "data:image/png;base64,..."  // Optional: Update size chart (Base64)
}
```

**Example Request - Update Image Only:**
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Example Request - Update Size Chart Only:**
```json
{
  "sizeChart": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Example Request - Update Both:**
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "sizeChart": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory item updated successfully",
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "category": "Uniform No 3",
    "type": "Uniform No 3 Male",
    "size": "M",
    "quantity": 50,
    "image": "data:image/png;base64,...",
    "sizeChart": "data:image/png;base64,...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**Validation Requirements:**
- `image` (if provided): Must be a valid Base64 string starting with `data:image/` or a valid URL
- `sizeChart` (if provided): Must be a valid Base64 string starting with `data:image/` or a valid URL
- Maximum Base64 string length: 10MB (approximately 7.5MB original image size)
- Supported image formats: `image/png`, `image/jpeg`, `image/jpg`, `image/gif`, `image/webp`

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid image format. Must be a valid Base64 image string or URL."
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

---

#### 2.2. Get Inventory Items (GET) - **REQUIRED UPDATE**

**Endpoint:** `GET /api/inventory`

**Current Behavior:**
- Returns inventory items but may not include `image` and `sizeChart` fields

**Required Changes:**
- **MUST** include `image` and `sizeChart` fields in response (can be `null` if not set)
- Ensure all inventory items in response include these fields

**Updated Response:**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "507f1f77bcf86cd799439011",
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "M",
      "quantity": 50,
      "image": "data:image/png;base64,...",  // NEW: Include image field
      "sizeChart": "data:image/png;base64,...",  // NEW: Include sizeChart field
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T15:00:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "L",
      "quantity": 30,
      "image": null,  // NEW: Can be null if not set
      "sizeChart": null,  // NEW: Can be null if not set
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T15:00:00.000Z"
    }
  ]
}
```

---

#### 2.3. Create Inventory Item (POST) - **OPTIONAL UPDATE**

**Endpoint:** `POST /api/inventory`

**Current Behavior:**
- Creates new inventory items
- May not accept `image` or `sizeChart` fields

**Recommended Changes:**
- Accept optional `image` field in request body
- Accept optional `sizeChart` field in request body
- This allows setting images when creating new items

**Updated Request Body:**
```json
{
  "category": "Uniform No 3",
  "type": "Uniform No 3 Male",
  "size": "M",
  "quantity": 50,
  "image": "data:image/png;base64,...",  // Optional: Set image on creation
  "sizeChart": "data:image/png;base64,..."  // Optional: Set size chart on creation
}
```

---

### 3. Frontend Implementation Details

#### 3.1. How Image Upload Works

**User Flow:**
1. Admin clicks on item image placeholder or existing image in admin inventory page
2. File picker opens
3. Admin selects an image file (validated: image type, max 5MB)
4. Image is converted to Base64
5. Frontend sends `PUT` request to `/api/inventory/:id` for **ALL** inventory items of that type
6. All items with same `category` and `type` get updated with the same image

**Example Frontend Request:**
```javascript
// For each inventory item of type "Uniform No 3 Male"
PUT /api/inventory/507f1f77bcf86cd799439011
Headers: {
  Authorization: "Bearer <token>",
  Content-Type: "application/json"
}
Body: {
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Important Notes:**
- Frontend updates **ALL** items of the same type (same `category` + `type`) with the same image
- This ensures consistency: all sizes of "Uniform No 3 Male" will have the same image
- Backend should handle this efficiently (consider bulk update if needed)

---

#### 3.2. How Size Chart Upload Works

**User Flow:**
1. Admin clicks on size chart placeholder or existing size chart in admin inventory page
2. File picker opens
3. Admin selects an image file (validated: image type, max 5MB)
4. Image is converted to Base64
5. Frontend sends `PUT` request to `/api/inventory/:id` for **ALL** inventory items of that type
6. All items with same `category` and `type` get updated with the same size chart

**Example Frontend Request:**
```javascript
// For each inventory item of type "Uniform No 3 Male"
PUT /api/inventory/507f1f77bcf86cd799439011
Headers: {
  Authorization: "Bearer <token>",
  Content-Type: "application/json"
}
Body: {
  "sizeChart": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Important Notes:**
- Frontend updates **ALL** items of the same type with the same size chart
- Size charts are shared across all sizes of the same item type
- Backend should handle this efficiently

---

### 4. Backend Implementation Checklist

- [ ] **Database Schema:**
  - [ ] Add `image` field to Inventory model (String, nullable)
  - [ ] Add `sizeChart` field to Inventory model (String, nullable)
  - [ ] Run migration script to add fields to existing documents

- [ ] **PUT /api/inventory/:id Endpoint:**
  - [ ] Accept `image` field in request body
  - [ ] Accept `sizeChart` field in request body
  - [ ] Validate Base64 image format (if provided)
  - [ ] Validate image size (max 10MB Base64 string)
  - [ ] Update only provided fields (partial update)
  - [ ] Return updated item with `image` and `sizeChart` fields

- [ ] **GET /api/inventory Endpoint:**
  - [ ] Include `image` field in response (can be null)
  - [ ] Include `sizeChart` field in response (can be null)
  - [ ] Ensure all items in response have these fields

- [ ] **POST /api/inventory Endpoint (Optional):**
  - [ ] Accept optional `image` field in request body
  - [ ] Accept optional `sizeChart` field in request body
  - [ ] Validate Base64 image format (if provided)

- [ ] **Validation:**
  - [ ] Validate Base64 string format: must start with `data:image/`
  - [ ] Validate image MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/gif`, `image/webp`
  - [ ] Validate Base64 string length (max 10MB)
  - [ ] Return appropriate error messages for validation failures

- [ ] **Error Handling:**
  - [ ] Return 400 Bad Request for invalid image format
  - [ ] Return 400 Bad Request for image too large
  - [ ] Return 404 Not Found for non-existent inventory item
  - [ ] Return 500 Internal Server Error for database errors

---

### 5. Example Backend Code (Node.js/Express/Mongoose)

#### 5.1. Inventory Model Update

```javascript
const inventorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ["Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt"]
  },
  type: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    default: null
  },
  sizeChart: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});
```

#### 5.2. PUT Endpoint Update

```javascript
// PUT /api/inventory/:id
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, image, sizeChart } = req.body;

    // Validate image format if provided
    if (image && !image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format. Must be a valid Base64 image string."
      });
    }

    // Validate sizeChart format if provided
    if (sizeChart && !sizeChart.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: "Invalid size chart format. Must be a valid Base64 image string."
      });
    }

    // Validate image size (max 10MB Base64 string)
    if (image && image.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image too large. Maximum size is 10MB."
      });
    }

    if (sizeChart && sizeChart.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Size chart too large. Maximum size is 10MB."
      });
    }

    // Build update object (only include provided fields)
    const updateData = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (image !== undefined) updateData.image = image;
    if (sizeChart !== undefined) updateData.sizeChart = sizeChart;

    const item = await Inventory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found"
      });
    }

    res.json({
      success: true,
      message: "Inventory item updated successfully",
      item
    });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});
```

#### 5.3. GET Endpoint Update

```javascript
// GET /api/inventory
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const inventory = await Inventory.find({})
      .select('category type size quantity image sizeChart createdAt updatedAt')
      .sort({ category: 1, type: 1, size: 1 });

    res.json({
      success: true,
      inventory
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});
```

---

### 6. Testing Checklist

- [ ] Test updating item image only
- [ ] Test updating size chart only
- [ ] Test updating both image and size chart
- [ ] Test updating quantity with image
- [ ] Test invalid Base64 format (should return 400)
- [ ] Test image too large (should return 400)
- [ ] Test non-existent item ID (should return 404)
- [ ] Test GET endpoint returns `image` and `sizeChart` fields
- [ ] Test that null values are returned correctly
- [ ] Test that updating one item's image updates all items of same type (frontend behavior)

---

### 7. Performance Considerations

**Base64 Image Storage:**
- Base64 images are ~33% larger than binary
- Consider storing images in cloud storage (S3, Cloudinary) and storing URLs instead
- For now, Base64 storage is acceptable for MVP, but plan for migration

**Bulk Updates:**
- Frontend sends multiple PUT requests (one per inventory item of same type)
- Consider implementing a bulk update endpoint if performance becomes an issue:
  ```
  PUT /api/inventory/bulk-update
  Body: {
    category: "Uniform No 3",
    type: "Uniform No 3 Male",
    image: "data:image/png;base64,..."
  }
  ```

---

### 8. Security Considerations

- **File Size Limits:** Enforce maximum Base64 string length (10MB)
- **MIME Type Validation:** Only accept valid image MIME types
- **Base64 Validation:** Validate Base64 format before storing
- **Admin Only:** Ensure only authenticated admins can update images
- **Input Sanitization:** Sanitize Base64 strings before storing

---

### 9. Summary

**What Frontend Does:**
- Allows admins to upload item images and size charts
- Converts images to Base64 format
- Sends PUT requests to update all inventory items of the same type

**What Backend Must Do:**
- Accept `image` and `sizeChart` fields in PUT `/api/inventory/:id` requests
- Include `image` and `sizeChart` fields in GET `/api/inventory` responses
- Validate Base64 image format and size
- Store images in database (Base64 strings)

**Priority:**
- ⚠️ **CRITICAL** - Frontend is already implemented and will fail without these backend changes
- Must be completed before the feature can be used

---

## Questions or Issues?

If you have questions about the implementation or encounter issues, please refer to:
- Frontend code: `src/app/admin/inventory/uniform/page.tsx`
- Functions: `handleItemImageUpload()` and `handleSizeChartUpload()`
