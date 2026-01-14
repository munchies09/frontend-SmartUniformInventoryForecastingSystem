# Backend Implementation: Size Chart and Graph Download Features

## Overview

This document outlines the backend changes needed to support two new frontend features:
1. **Size Chart Images** - Display size charts for items with sizes
2. **Graph Download** - Export forecast graphs as images (already implemented in frontend, but backend may need image serving support)

---

## 1. Size Chart Feature

### Frontend Requirements

The frontend needs to fetch size chart URLs from the inventory API. Size charts should be associated with item types (category + type combination), not individual sizes.

### Backend Changes Required

#### 1.1 Update Inventory Model/Schema

**Command:**
```
Add a new field "sizeChart" to the Inventory/UniformInventory model:
- sizeChart (string, optional/nullable) - URL or path to the size chart image
- This field should be stored at the item type level, not per size
- Format: Can be a relative path (e.g., "/size-charts/uniform-no-3-male.png") or full URL
```

**MongoDB Schema Example:**
```javascript
{
  category: String,        // "Uniform No 3", "Uniform No 4", "T-Shirt"
  type: String,           // "Uniform No 3 Male", "PVC Shoes", "Digital Shirt", etc.
  size: String,           // "XS", "S", "M", etc. or null for accessories
  quantity: Number,
  sizeChart: String,      // NEW FIELD: URL/path to size chart image (optional)
  createdAt: Date,
  updatedAt: Date
}
```

**Note:** The `sizeChart` field should be the same for all sizes of the same type. For example, all "Uniform No 3 Male" items (XS, S, M, L, etc.) should reference the same size chart.

---

#### 1.2 Update Inventory API Endpoints

##### 1.2.1 GET /api/inventory - Return Size Charts

**Command:**
```
Update GET /api/inventory endpoint to include sizeChart field in responses.

Current behavior: Returns inventory items with category, type, size, quantity
New behavior: Also include sizeChart field when available

Response format should be:
{
  "success": true,
  "inventory": [
    {
      "id": "...",
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "M",
      "quantity": 10,
      "sizeChart": "/size-charts/uniform-no-3-male.png",  // NEW FIELD
      ...
    },
    ...
  ]
}
```

**Implementation Notes:**
- The `sizeChart` should be retrieved from any inventory item of that type (since it's the same for all sizes)
- If multiple items exist for the same type, you can group by category+type and include sizeChart once
- Return `null` or omit the field if no size chart is available

**Example Query Logic:**
```javascript
// Option 1: Include sizeChart in each item (can be duplicate but consistent)
const items = await Inventory.find({});
// Return all items with sizeChart field

// Option 2: Group by category+type and attach sizeChart (more efficient)
const itemsWithSizeChart = items.map(item => {
  const typeInfo = sizeChartMap[`${item.category}-${item.type}`];
  return {
    ...item,
    sizeChart: typeInfo?.sizeChart || null
  };
});
```

---

##### 1.2.2 POST /api/inventory - Accept Size Chart

**Command:**
```
Update POST /api/inventory endpoint to accept and store sizeChart field.

Request body should accept:
{
  "category": "Uniform No 3",
  "type": "Uniform No 3 Male",
  "size": "M",
  "quantity": 10,
  "sizeChart": "/size-charts/uniform-no-3-male.png"  // NEW FIELD (optional)
}

Validation:
- sizeChart should be optional (nullable)
- If provided, should be a valid string (URL or path)
- When creating items with the same type but different sizes, the sizeChart should be the same for all
```

**Implementation Notes:**
- When creating a new inventory item, if `sizeChart` is provided:
  1. Store it with the new item
  2. Optionally: Update all existing items of the same type (category + type) to have the same sizeChart
- When updating an item, allow updating the sizeChart
- Consider creating a separate endpoint for updating size charts for all items of a type at once

**Example Logic:**
```javascript
// When creating item with sizeChart
if (sizeChart) {
  // Store with new item
  const newItem = await Inventory.create({
    category,
    type,
    size,
    quantity,
    sizeChart
  });
  
  // Optionally: Update all existing items of this type to have the same sizeChart
  await Inventory.updateMany(
    { category, type, sizeChart: { $ne: sizeChart } },
    { $set: { sizeChart } }
  );
}
```

---

##### 1.2.3 PUT /api/inventory/:id - Update Size Chart

**Command:**
```
Update PUT /api/inventory/:id endpoint to allow updating sizeChart field.

Request body should accept:
{
  "quantity": 15,
  "sizeChart": "/size-charts/uniform-no-3-male-updated.png"  // NEW FIELD (optional)
}

When sizeChart is updated for an item:
- Update that specific item
- Optionally: Update all items of the same type (category + type) to maintain consistency
```

---

##### 1.2.4 New Endpoint: GET /api/inventory/size-charts (Optional but Recommended)

**Command:**
```
Create a new endpoint GET /api/inventory/size-charts that returns all available size charts grouped by category and type.

Purpose: Allows frontend to fetch all size charts at once without loading full inventory

Response format:
{
  "success": true,
  "sizeCharts": {
    "Uniform No 3-Uniform No 3 Male": "/size-charts/uniform-no-3-male.png",
    "Uniform No 3-PVC Shoes": "/size-charts/pvc-shoes.png",
    "Uniform No 4-Boot": "/size-charts/boot.png",
    ...
  }
}

Or as an array:
{
  "success": true,
  "sizeCharts": [
    {
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "sizeChart": "/size-charts/uniform-no-3-male.png"
    },
    ...
  ]
}
```

**Implementation:**
```javascript
// Group by category-type and get unique size charts
const sizeCharts = await Inventory.aggregate([
  {
    $match: { sizeChart: { $exists: true, $ne: null } }
  },
  {
    $group: {
      _id: { category: "$category", type: "$type" },
      sizeChart: { $first: "$sizeChart" }
    }
  }
]);

// Format response
const chartMap = {};
sizeCharts.forEach(item => {
  const key = `${item._id.category}-${item._id.type}`;
  chartMap[key] = item.sizeChart;
});

return { success: true, sizeCharts: chartMap };
```

---

#### 1.3 File Upload for Size Charts (If Admin Needs to Upload)

**Command (Optional but Recommended):**
```
If admins need to upload size chart images through the admin panel:

Create endpoint: POST /api/inventory/upload-size-chart

This endpoint should:
1. Accept multipart/form-data with file upload
2. Accept category and type as form fields
3. Save the uploaded image to a directory (e.g., /public/size-charts/)
4. Store the path in the database for all items of that type
5. Return the URL/path to the uploaded image

Request:
- Form data with:
  - file: Image file (PNG, JPG, etc.)
  - category: "Uniform No 3"
  - type: "Uniform No 3 Male"

Response:
{
  "success": true,
  "sizeChart": "/size-charts/uniform-no-3-male.png",
  "message": "Size chart uploaded successfully"
}

Then update all inventory items of that type with the new sizeChart URL.
```

**Implementation Example:**
```javascript
// Using multer or similar for file upload
app.post('/api/inventory/upload-size-chart', upload.single('file'), async (req, res) => {
  const { category, type } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  
  // Save file path
  const sizeChartPath = `/size-charts/${category}-${type}-${Date.now()}.${file.originalname.split('.').pop()}`;
  
  // Update all items of this type
  await Inventory.updateMany(
    { category, type },
    { $set: { sizeChart: sizeChartPath } }
  );
  
  res.json({
    success: true,
    sizeChart: sizeChartPath,
    message: "Size chart uploaded and applied to all items of this type"
  });
});
```

---

#### 1.4 Database Migration (If Needed)

**Command:**
```
If you need to add sizeChart field to existing inventory items:

Create a migration script to:
1. Add sizeChart field to existing inventory schema
2. Optionally: Set default values or migrate existing data

Example migration:
- Add sizeChart field as optional/nullable
- No default value needed (frontend handles missing size charts gracefully)
```

---

### Testing Checklist for Size Chart Feature

- [ ] GET /api/inventory returns sizeChart field when available
- [ ] POST /api/inventory accepts and stores sizeChart field
- [ ] PUT /api/inventory/:id can update sizeChart field
- [ ] Size chart URLs are returned correctly for items with sizes
- [ ] Items without size charts return null or omit the field
- [ ] Multiple sizes of the same type have the same sizeChart URL
- [ ] File upload endpoint works (if implemented)
- [ ] Uploaded size charts are accessible via the stored URL/path

---

## 2. Graph Download Feature

### Frontend Status

The frontend already implements graph download functionality using `html2canvas` library. The feature:
- Captures the graph as a PNG image
- Downloads it alongside the Excel file
- Handles CSS color issues automatically

### Backend Changes Required (Minimal)

**No major backend changes are required** for the graph download feature, as it's handled entirely client-side. However, you may want to consider:

---

#### 2.1 Optional: Serve Static Graph Images (If Needed)

**Command (Optional):**
```
If you want to store and serve pre-generated graph images instead of generating them client-side:

1. Create endpoint: POST /api/forecast/generate-graph-image

This endpoint would:
- Accept forecast parameters (category, type, date range)
- Generate graph data
- Use server-side image generation library (e.g., Canvas, Chart.js-node-canvas)
- Save the image to /public/forecast-graphs/
- Return the image URL

However, this is NOT necessary since frontend handles it client-side.
```

**Recommendation:** Keep the current client-side implementation as it's simpler and doesn't require additional server resources.

---

#### 2.2 Optional: Store Downloaded Graph History

**Command (Optional):**
```
If you want to track/download history of forecast graphs:

1. Add endpoint: GET /api/forecast/graph-history

This would return a list of previously generated forecasts with:
- Date/time generated
- Type/category
- Graph image URL (if stored server-side)
- Forecast parameters

Again, this is optional and not required for the current implementation.
```

---

### Current Implementation Status

✅ **Graph Download is already functional** - Frontend generates and downloads graphs client-side
✅ **No backend changes needed** - Works entirely in the browser
✅ **Excel download works** - Backend already supports forecast data export

---

## 3. API Endpoint Summary

### Required Changes (Size Chart)

| Endpoint | Method | Change Required | Status |
|----------|--------|-----------------|--------|
| `/api/inventory` | GET | Add `sizeChart` field to response | ⚠️ **REQUIRED** |
| `/api/inventory` | POST | Accept `sizeChart` in request body | ⚠️ **REQUIRED** |
| `/api/inventory/:id` | PUT | Allow updating `sizeChart` field | ⚠️ **REQUIRED** |
| `/api/inventory/size-charts` | GET | New endpoint (optional but recommended) | 🔵 **RECOMMENDED** |
| `/api/inventory/upload-size-chart` | POST | New endpoint for file upload (optional) | 🔵 **OPTIONAL** |

### Optional Changes (Graph Download)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/forecast/generate-graph-image` | POST | Server-side graph generation | ⚪ **NOT NEEDED** |
| `/api/forecast/graph-history` | GET | Graph download history | ⚪ **NOT NEEDED** |

---

## 4. Database Schema Changes

### Inventory Collection Updates

```javascript
// Current Schema
{
  category: String,
  type: String,
  size: String | null,
  quantity: Number,
  createdAt: Date,
  updatedAt: Date
}

// Updated Schema (Add sizeChart)
{
  category: String,
  type: String,
  size: String | null,
  quantity: Number,
  sizeChart: String | null,  // NEW FIELD
  createdAt: Date,
  updatedAt: Date
}
```

**Migration Script:**
```javascript
// Add sizeChart field to existing documents
db.inventory.updateMany(
  { sizeChart: { $exists: false } },
  { $set: { sizeChart: null } }
);
```

---

## 5. Example API Requests/Responses

### 5.1 GET /api/inventory - With Size Charts

**Request:**
```http
GET /api/inventory
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "507f1f77bcf86cd799439011",
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "M",
      "quantity": 10,
      "sizeChart": "/size-charts/uniform-no-3-male.png",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "category": "Uniform No 3",
      "type": "Uniform No 3 Male",
      "size": "L",
      "quantity": 15,
      "sizeChart": "/size-charts/uniform-no-3-male.png",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "category": "Uniform No 3",
      "type": "Apulet",
      "size": null,
      "quantity": 5,
      "sizeChart": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 5.2 POST /api/inventory - With Size Chart

**Request:**
```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "Uniform No 3",
  "type": "Uniform No 3 Male",
  "size": "XL",
  "quantity": 20,
  "sizeChart": "/size-charts/uniform-no-3-male.png"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inventory item created successfully",
  "item": {
    "id": "507f1f77bcf86cd799439014",
    "category": "Uniform No 3",
    "type": "Uniform No 3 Male",
    "size": "XL",
    "quantity": 20,
    "sizeChart": "/size-charts/uniform-no-3-male.png",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 5.3 GET /api/inventory/size-charts (New Endpoint)

**Request:**
```http
GET /api/inventory/size-charts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "sizeCharts": {
    "Uniform No 3-Uniform No 3 Male": "/size-charts/uniform-no-3-male.png",
    "Uniform No 3-Uniform No 3 Female": "/size-charts/uniform-no-3-female.png",
    "Uniform No 3-PVC Shoes": "/size-charts/pvc-shoes.png",
    "Uniform No 3-Beret": "/size-charts/beret.png",
    "Uniform No 4-Cloth No 4": "/size-charts/cloth-no-4.png",
    "Uniform No 4-Boot": "/size-charts/boot.png",
    "T-Shirt-Digital Shirt": "/size-charts/digital-shirt.png"
  }
}
```

### 5.4 POST /api/inventory/upload-size-chart (Optional)

**Request:**
```http
POST /api/inventory/upload-size-chart
Authorization: Bearer <token>
Content-Type: multipart/form-data

category: "Uniform No 3"
type: "Uniform No 3 Male"
file: [binary image data]
```

**Response:**
```json
{
  "success": true,
  "message": "Size chart uploaded successfully",
  "sizeChart": "/size-charts/uniform-no-3-male-1705320000000.png",
  "itemsUpdated": 7
}
```

---

## 6. File Storage Considerations

### Size Chart Images Storage

**Recommendations:**
1. **Storage Location:** `/public/size-charts/` or `/uploads/size-charts/`
2. **File Naming:** Use consistent naming convention
   - Format: `{category-slug}-{type-slug}.png`
   - Example: `uniform-no-3-male.png`, `pvc-shoes.png`
3. **File Formats:** Support PNG, JPG, JPEG, WEBP
4. **File Size Limits:** Recommend max 5MB per image
5. **Image Dimensions:** Recommend max 2000x2000px

**Directory Structure:**
```
public/
  size-charts/
    uniform-no-3-male.png
    uniform-no-3-female.png
    pvc-shoes.png
    beret.png
    cloth-no-4.png
    boot.png
    digital-shirt.png
    ...
```

---

## 7. Security Considerations

### Size Chart Upload (If Implemented)

1. **File Type Validation:**
   - Only allow image files (PNG, JPG, JPEG, WEBP)
   - Reject executable files and scripts

2. **File Size Limits:**
   - Enforce maximum file size (e.g., 5MB)

3. **Authentication:**
   - Require admin authentication for uploads
   - Verify user role before allowing upload

4. **Path Validation:**
   - Sanitize file names to prevent directory traversal
   - Use whitelist for allowed characters

5. **Virus Scanning (Optional):**
   - Consider scanning uploaded files for malware

---

## 8. Testing Checklist

### Size Chart Feature

- [ ] Inventory items return `sizeChart` field when present
- [ ] Inventory items return `null` or omit `sizeChart` when not available
- [ ] Creating new inventory item with `sizeChart` stores it correctly
- [ ] Updating inventory item can modify `sizeChart`
- [ ] Multiple sizes of same type share the same `sizeChart` URL
- [ ] GET /api/inventory/size-charts returns correct mapping
- [ ] File upload works (if implemented)
- [ ] Uploaded images are accessible via URL
- [ ] Size chart URLs are properly formatted
- [ ] Frontend can fetch and display size charts correctly

### Graph Download Feature

- [ ] No backend changes needed (client-side only)
- [ ] Forecast data endpoint still works correctly
- [ ] Excel download still works correctly

---

## 9. Priority Summary

### High Priority (Required)
1. ✅ Add `sizeChart` field to Inventory model
2. ✅ Update GET /api/inventory to return `sizeChart`
3. ✅ Update POST /api/inventory to accept `sizeChart`
4. ✅ Update PUT /api/inventory/:id to allow updating `sizeChart`

### Medium Priority (Recommended)
1. 🔵 Create GET /api/inventory/size-charts endpoint
2. 🔵 Implement size chart file upload endpoint
3. 🔵 Add file storage and serving for size chart images

### Low Priority (Optional)
1. ⚪ Server-side graph generation (not needed)
2. ⚪ Graph download history tracking (not needed)

---

## 10. Frontend Integration Notes

### How Frontend Uses Size Charts

1. **On Page Load:**
   - Frontend fetches inventory data from `/api/inventory`
   - Extracts `sizeChart` URLs grouped by category-type
   - Stores in local state

2. **Display:**
   - Shows chart icon next to "Size" label when `sizeChart` exists
   - Clicking icon opens modal with size chart image

3. **Fallback:**
   - If `sizeChart` is null or missing, no icon is shown
   - Frontend handles missing size charts gracefully

### Expected Data Format

Frontend expects inventory items to have:
```typescript
{
  category: string;
  type: string;
  size: string | null;
  quantity: number;
  sizeChart?: string | null;  // Optional URL/path to size chart
}
```

---

## 11. Implementation Timeline

### Phase 1: Basic Size Chart Support (Week 1)
- Add `sizeChart` field to database schema
- Update GET /api/inventory to return `sizeChart`
- Test with existing data

### Phase 2: Size Chart Management (Week 2)
- Update POST/PUT endpoints to handle `sizeChart`
- Create GET /api/inventory/size-charts endpoint
- Test CRUD operations

### Phase 3: File Upload (Week 3 - Optional)
- Implement file upload endpoint
- Set up file storage
- Add file serving
- Test end-to-end workflow

---

## 12. Support and Questions

For questions or clarifications:
- Review frontend implementation in `src/app/member/uniform/page.tsx`
- Check how size charts are fetched and displayed
- Verify API response format matches frontend expectations

**Frontend Code References:**
- Size chart fetching: Lines ~120-160 in `member/uniform/page.tsx`
- Size chart display: Lines ~1325-1340 in `member/uniform/page.tsx`
- Size chart modal: Lines ~1400-1430 in `member/uniform/page.tsx`

---

## Conclusion

**Size Chart Feature:** Requires backend changes to add and serve size chart URLs
**Graph Download Feature:** No backend changes needed (handled client-side)

Focus on implementing the size chart database field and API updates first, as this is required for the feature to work. File upload functionality can be added later if needed.
