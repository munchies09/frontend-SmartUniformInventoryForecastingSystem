# Backend API Verification Checklist

## Frontend API Calls - Verification Required

### 1. GET /api/inventory (User Uniform UI)

**Frontend Call:**
```javascript
GET http://localhost:5000/api/inventory
Headers: Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "inv-1",
      "name": "Beret",
      "category": "Uniform No 3",
      "type": "Beret",
      "size": "6 7/8",
      "quantity": 0,  // ← Frontend checks this
      "sizeChart": "https://...",  // Optional
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ]
}
```

**Backend Requirements:**
- ✅ Must be accessible to regular users (not just admin)
- ✅ Must return all inventory items
- ✅ Must include: id, name, category, type, size, quantity
- ✅ Category must support: "Uniform No 3", "Uniform No 4", "Accessories No 3", "Accessories No 4", "Shirt"
- ✅ Type must match frontend expectations (e.g., "Beret", "Uniform No 3 Male", "Nametag No 3", "Nametag No 4")

**Current Status:** ⚠️ **NEEDS FIX** - Currently admin-only, must allow regular users

---

### 2. PUT /api/members/uniform (Save Uniform Data)

**Frontend Call:**
```javascript
PUT http://localhost:5000/api/members/uniform
Headers: 
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "items": [
    {
      "category": "Uniform No 3",
      "type": "Beret",
      "size": "6 7/8",
      "quantity": 1,
      "status": "Not Available"  // ← NEW: Frontend sends this when quantity is 0
    }
  ]
}
```

**Backend Requirements:**
- ✅ Must accept `status` field: "Available", "Missing", or "Not Available"
- ✅ Must save status to database
- ✅ **CRITICAL:** Must NOT deduct inventory when `status === "Not Available"`
- ✅ Must still save uniform data even with "Not Available" status
- ✅ Must support new categories: "Accessories No 3", "Accessories No 4"
- ✅ Must support type names: "Nametag No 3", "Nametag No 4"

**Expected Response:**
```json
{
  "success": true,
  "message": "Uniform data updated successfully",
  "uniform": {
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Beret",
        "size": "6 7/8",
        "quantity": 1,
        "status": "Not Available"  // ← Must be returned
      }
    ]
  }
}
```

**Current Status:** ⚠️ **NEEDS VERIFICATION** - Check if backend accepts "Not Available" status

---

### 3. GET /api/members/:sispaId/uniform (Admin Member Uniform Data)

**Frontend Call:**
```javascript
GET http://localhost:5000/api/members/A1181212/uniform
Headers: Authorization: Bearer <admin-token>
```

**Expected Response:**
```json
{
  "success": true,
  "uniform": {
    "sispaId": "A1181212",
    "items": [
      {
        "category": "Accessories No 3",
        "type": "Apulet",
        "size": null,
        "quantity": 1,
        "notes": null,
        "status": "Missing",  // ← Required
        "missingCount": 2,  // ← Required when status is "Missing"
        "receivedDate": null
      },
      {
        "category": "Accessories No 3",
        "type": "Integrity Badge",
        "size": null,
        "quantity": 1,
        "notes": null,
        "status": "Available",  // ← Required
        "receivedDate": "2024-01-08T10:30:00.000Z"  // ← Required when status is "Available"
      }
    ]
  }
}
```

**Backend Requirements:**
- ✅ Must return `status` field for each item
- ✅ Must return `missingCount` when `status === "Missing"`
- ✅ Must return `receivedDate` when `status === "Available"`
- ✅ Must support new categories: "Accessories No 3", "Accessories No 4"
- ✅ Must support type names: "Nametag No 3", "Nametag No 4"

**Current Status:** ⚠️ **NEEDS VERIFICATION** - Check if backend returns missingCount

---

## Critical Backend Fixes Required

### Fix 1: Make Inventory API Accessible to Regular Users

**Command for Backend:**
```
Update GET /api/inventory endpoint:

1. Remove admin-only restriction
2. Allow authenticated users (both admin and regular members)
3. Keep authentication requirement (JWT token still required)
4. Response format remains the same

BEFORE:
if (req.user.role !== 'admin') {
  return res.status(403).json({ success: false, message: "Access denied. Admin only." });
}

AFTER:
// Remove role check - allow all authenticated users
// Only check: if (!req.user) return 401
```

**Priority:** 🔴 **CRITICAL** - Frontend cannot work without this

---

### Fix 2: Accept "Not Available" Status Without Deducting Inventory

**Command for Backend:**
```
Update PUT /api/members/uniform endpoint:

1. Accept status field in request items
2. Save status to database
3. Only deduct inventory if status is "Available" or undefined:
   - If status === "Not Available" → DO NOT deduct inventory
   - If status === "Missing" → DO NOT deduct inventory  
   - If status === "Available" or undefined → Deduct inventory normally
4. Still save uniform data even with "Not Available" status

Implementation:
items.forEach(item => {
  // Save item with status
  await saveUniformItem({
    ...item,
    status: item.status || "Available"
  });
  
  // Only deduct inventory if status allows it
  if (item.status !== "Not Available" && item.status !== "Missing") {
    await deductInventory(item);
  }
});
```

**Priority:** 🔴 **CRITICAL** - Required for zero-quantity items

---

### Fix 3: Return Status and Missing Count in GET Response

**Command for Backend:**
```
Update GET /api/members/:sispaId/uniform endpoint:

1. Include status field in response items
2. Calculate and include missingCount when status is "Missing"
3. Include receivedDate when status is "Available"

Implementation:
const items = uniformItems.map(item => ({
  ...item,
  status: item.status || "Available",
  missingCount: item.status === "Missing" 
    ? await countMissingStatus(sispaId, item.category, item.type, item.size)
    : undefined,
  receivedDate: item.status === "Available" 
    ? item.receivedDate || item.createdAt
    : undefined
}));
```

**Priority:** 🟡 **IMPORTANT** - For displaying status and count in admin UI

---

## API Endpoint Summary

| Endpoint | Method | Access | Status Field | Inventory Deduction |
|----------|--------|--------|--------------|---------------------|
| `/api/inventory` | GET | **All users** (not just admin) | N/A | N/A |
| `/api/members/uniform` | PUT | Members | ✅ Accepts | ✅ Only if "Available" |
| `/api/members/:sispaId/uniform` | GET | Admin | ✅ Returns | N/A |

---

## Testing Commands

### Test 1: Regular User Can Access Inventory
```bash
# Login as regular user, get token
curl -X GET http://localhost:5000/api/inventory \
  -H "Authorization: Bearer <regular-user-token>"

# Expected: 200 OK with inventory data
# NOT Expected: 403 Forbidden
```

### Test 2: Save with "Not Available" Status
```bash
curl -X PUT http://localhost:5000/api/members/uniform \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "category": "Uniform No 3",
      "type": "Beret",
      "size": "6 7/8",
      "quantity": 1,
      "status": "Not Available"
    }]
  }'

# Expected: Success, inventory NOT deducted
# Check: Inventory quantity for "Beret" size "6 7/8" should remain unchanged
```

### Test 3: Get Uniform with Missing Count
```bash
curl -X GET http://localhost:5000/api/members/A1181212/uniform \
  -H "Authorization: Bearer <admin-token>"

# Expected: Response includes status and missingCount fields
# Check: Items with status "Missing" should have missingCount > 0
```

---

## Category and Type Name Mapping

### Frontend Sends (New Structure):
- Category: "Accessories No 3" → Type: "Nametag No 3"
- Category: "Accessories No 4" → Type: "Nametag No 4"
- Category: "Uniform No 3" → Type: "Uniform No 3 Male", "Uniform No 3 Female"
- Category: "Uniform No 4" → Type: "Uniform No 4" (not "Cloth No 4" or "Pants No 4")

### Backend Must Accept:
- ✅ "Accessories No 3" category with "Nametag No 3" type
- ✅ "Accessories No 4" category with "Nametag No 4" type
- ✅ "Uniform No 3" category with "Uniform No 3 Male" and "Uniform No 3 Female" types
- ✅ "Uniform No 4" category with "Uniform No 4" type
- ✅ Backward compatibility: Also accept old names and normalize them

---

## Quick Fix Summary

1. **GET /api/inventory**: Remove admin-only check → Allow regular users
2. **PUT /api/members/uniform**: Accept "Not Available" status → Don't deduct inventory
3. **GET /api/members/:sispaId/uniform**: Return status and missingCount → For admin display

All fixes are documented in: `BACKEND_INVENTORY_USER_ACCESS_COMMANDS.md`
