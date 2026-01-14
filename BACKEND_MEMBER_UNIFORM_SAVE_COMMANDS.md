# Backend Commands: Member Uniform Save Issue - Debug & Fix

## Quick Debug Commands

### 1. Check if Uniform Data Exists in Database

**PostgreSQL:**
```sql
-- Check if member uniform record exists
SELECT * FROM member_uniforms WHERE sispa_id = 'B1184040';

-- Check uniform items for a specific member
SELECT 
    mu.sispa_id,
    mu.items,
    mu.created_at,
    mu.updated_at
FROM member_uniforms mu
WHERE mu.sispa_id = 'B1184040';

-- Check all uniform items (if using separate table)
SELECT 
    ui.*,
    m.sispa_id,
    m.name
FROM uniform_items ui
JOIN members m ON ui.member_id = m.id
WHERE m.sispa_id = 'B1184040';

-- Check recent uniform saves (last 24 hours)
SELECT 
    mu.sispa_id,
    mu.items,
    mu.updated_at
FROM member_uniforms mu
WHERE mu.updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY mu.updated_at DESC;
```

**MySQL:**
```sql
-- Check if member uniform record exists
SELECT * FROM member_uniforms WHERE sispa_id = 'B1184040';

-- Check uniform items for a specific member
SELECT 
    mu.sispa_id,
    mu.items,
    mu.created_at,
    mu.updated_at
FROM member_uniforms mu
WHERE mu.sispa_id = 'B1184040';

-- Check all uniform items (if using separate table)
SELECT 
    ui.*,
    m.sispa_id,
    m.name
FROM uniform_items ui
JOIN members m ON ui.member_id = m.id
WHERE m.sispa_id = 'B1184040';

-- Check recent uniform saves (last 24 hours)
SELECT 
    mu.sispa_id,
    mu.items,
    mu.updated_at
FROM member_uniforms mu
WHERE mu.updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY mu.updated_at DESC;
```

**MongoDB:**
```javascript
// Check if member uniform exists
db.member_uniforms.findOne({ sispaId: "B1184040" });

// Check all items for a member
db.member_uniforms.find(
  { sispaId: "B1184040" },
  { sispaId: 1, items: 1, createdAt: 1, updatedAt: 1 }
).pretty();

// Check recent saves (last 24 hours)
db.member_uniforms.find({
  sispaId: "B1184040",
  updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).sort({ updatedAt: -1 }).pretty();
```

### 2. Test API Endpoints

**Test POST /api/members/uniform (Create New):**
```bash
# Replace TOKEN with actual JWT token
# Replace B1184040 with actual SISPA ID
curl -X POST http://localhost:5000/api/members/uniform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Uniform No 3 Male",
        "size": "XL",
        "quantity": 1
      }
    ]
  }'
```

**Test PUT /api/members/uniform (Update Existing):**
```bash
curl -X PUT http://localhost:5000/api/members/uniform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "category": "Uniform No 3",
        "type": "Uniform No 3 Male",
        "size": "XL",
        "quantity": 1
      },
      {
        "category": "Uniform No 3",
        "type": "Uniform No 3 Female",
        "size": "M",
        "quantity": 1
      }
    ]
  }'
```

**Test GET /api/members/uniform (Member's Own Data):**
```bash
curl -X GET http://localhost:5000/api/members/uniform \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Test GET /api/members/:sispaId/uniform (Admin View):**
```bash
curl -X GET http://localhost:5000/api/members/B1184040/uniform \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### 3. Verify JWT Token and User Authentication

**Node.js/Express - Check Token in Route Handler:**
```javascript
// Add this middleware or in your route handler
router.post('/uniform', authenticateToken, async (req, res) => {
  console.log("=== AUTHENTICATION CHECK ===");
  console.log("User from token:", req.user);
  console.log("User ID:", req.user?.id || req.user?.sispaId);
  console.log("User Role:", req.user?.role);
  
  // Continue with your logic...
});
```

**Check Token Validity:**
```bash
# Decode JWT token (online tool: jwt.io)
# Or use Node.js:
node -e "const jwt = require('jsonwebtoken'); const decoded = jwt.decode('YOUR_TOKEN'); console.log(JSON.stringify(decoded, null, 2));"
```

## Code Snippets for Debugging

### 1. Add Comprehensive Request Logging

**Express.js Route Handler:**
```javascript
// POST /api/members/uniform
router.post('/uniform', authenticateToken, async (req, res) => {
  try {
    console.log("=== UNIFORM SAVE REQUEST (POST) ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Method:", req.method);
    console.log("User from token:", JSON.stringify(req.user, null, 2));
    console.log("User SISPA ID:", req.user?.sispaId || req.user?.id);
    console.log("Request Body:", JSON.stringify(req.body, null, 2));
    console.log("Items Count:", req.body?.items?.length || 0);
    
    // Validate request body
    if (!req.body.items || !Array.isArray(req.body.items)) {
      console.error("ERROR: Invalid request body - items array missing");
      return res.status(400).json({
        success: false,
        message: "Items array is required"
      });
    }
    
    // Log each item
    req.body.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        category: item.category,
        type: item.type,
        size: item.size,
        quantity: item.quantity,
        notes: item.notes
      });
    });
    
    // Continue with save logic...
    const userId = req.user.sispaId || req.user.id;
    
    // Your existing save logic here...
    
  } catch (error) {
    console.error("=== UNIFORM SAVE ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/members/uniform
router.put('/uniform', authenticateToken, async (req, res) => {
  try {
    console.log("=== UNIFORM UPDATE REQUEST (PUT) ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Method:", req.method);
    console.log("User from token:", JSON.stringify(req.user, null, 2));
    console.log("Request Body:", JSON.stringify(req.body, null, 2));
    console.log("Items Count:", req.body?.items?.length || 0);
    
    // Continue with update logic...
    
  } catch (error) {
    console.error("=== UNIFORM UPDATE ERROR ===");
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});
```

### 2. Add Database Operation Logging

**Prisma ORM:**
```javascript
// Save uniform data
const savedUniform = await prisma.memberUniform.upsert({
  where: { sispaId: userId },
  update: {
    items: req.body.items,
    updatedAt: new Date()
  },
  create: {
    sispaId: userId,
    items: req.body.items
  }
});

console.log("=== DATABASE SAVE RESULT ===");
console.log("Saved Uniform ID:", savedUniform.id);
console.log("SISPA ID:", savedUniform.sispaId);
console.log("Items Count:", savedUniform.items?.length || 0);
console.log("Items:", JSON.stringify(savedUniform.items, null, 2));
console.log("Created At:", savedUniform.createdAt);
console.log("Updated At:", savedUniform.updatedAt);
```

**Sequelize ORM:**
```javascript
// Find or create uniform
const [uniform, created] = await MemberUniform.findOrCreate({
  where: { sispaId: userId },
  defaults: {
    sispaId: userId,
    items: req.body.items
  }
});

if (!created) {
  uniform.items = req.body.items;
  uniform.updatedAt = new Date();
  await uniform.save();
}

console.log("=== DATABASE SAVE RESULT ===");
console.log("Was Created:", created);
console.log("Uniform ID:", uniform.id);
console.log("SISPA ID:", uniform.sispaId);
console.log("Items Count:", uniform.items?.length || 0);
console.log("Items:", JSON.stringify(uniform.items, null, 2));
```

**MongoDB (Mongoose):**
```javascript
const uniform = await MemberUniform.findOneAndUpdate(
  { sispaId: userId },
  {
    $set: {
      items: req.body.items,
      updatedAt: new Date()
    }
  },
  {
    new: true,
    upsert: true,
    runValidators: true
  }
);

console.log("=== DATABASE SAVE RESULT ===");
console.log("Uniform ID:", uniform._id);
console.log("SISPA ID:", uniform.sispaId);
console.log("Items Count:", uniform.items?.length || 0);
console.log("Items:", JSON.stringify(uniform.items, null, 2));
```

### 3. Add Response Logging

```javascript
// Before sending response
const responseData = {
  success: true,
  message: "Uniform saved successfully",
  uniform: {
    sispaId: savedUniform.sispaId,
    items: savedUniform.items,
    itemCount: savedUniform.items?.length || 0
  }
};

console.log("=== SENDING RESPONSE ===");
console.log("Status Code: 200");
console.log("Response:", JSON.stringify(responseData, null, 2));

res.status(200).json(responseData);
```

### 4. Add Admin Fetch Endpoint Logging

```javascript
// GET /api/members/:sispaId/uniform (Admin endpoint)
router.get('/:sispaId/uniform', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sispaId } = req.params;
    
    console.log("=== ADMIN FETCH UNIFORM ===");
    console.log("Requested SISPA ID:", sispaId);
    console.log("Admin User:", req.user?.name || req.user?.sispaId);
    
    // Fetch uniform data
    const uniform = await MemberUniform.findOne({
      where: { sispaId } // Adjust based on your ORM
    });
    
    console.log("Uniform Found:", !!uniform);
    if (uniform) {
      console.log("Items Count:", uniform.items?.length || 0);
      console.log("Items:", JSON.stringify(uniform.items, null, 2));
    } else {
      console.log("No uniform data found for SISPA ID:", sispaId);
    }
    
    if (!uniform) {
      return res.status(404).json({
        success: false,
        message: "Uniform data not found"
      });
    }
    
    const responseData = {
      success: true,
      uniform: {
        sispaId: uniform.sispaId,
        items: uniform.items || []
      }
    };
    
    console.log("Sending Response:", JSON.stringify(responseData, null, 2));
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error("=== ADMIN FETCH ERROR ===");
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});
```

## Validation Checks

### 1. Validate Item Type Names

```javascript
// Allowed type names mapping (old to new)
const TYPE_NAME_MAPPING = {
  // Uniform No 3
  "Cloth No 3": "Uniform No 3 Male",
  "Pants No 3": "Uniform No 3 Female",
  "Uniform No 3 Male": "Uniform No 3 Male",
  "Uniform No 3 Female": "Uniform No 3 Female",
  
  // Uniform No 4
  "Cloth No 4": "Uniform No 4",
  "Pants No 4": "Uniform No 4",
  "Uniform No 4": "Uniform No 4",
  
  // Accessories
  "Gold Badge": "Shoulder Badge", // Legacy support
  "Shoulder Badge": "Shoulder Badge",
  
  // Others (PVC Shoes, Boot, Beret, etc.)
};

function normalizeTypeName(type) {
  return TYPE_NAME_MAPPING[type] || type;
}

// Use in validation
req.body.items = req.body.items.map(item => ({
  ...item,
  type: normalizeTypeName(item.type)
}));
```

### 2. Validate Category Names

```javascript
const ALLOWED_CATEGORIES = [
  "Uniform No 3",
  "Uniform No 4",
  "T-Shirt",
  "Shirt" // Legacy support
];

function validateCategory(category) {
  // Normalize category name
  if (category === "Shirt") return "T-Shirt";
  return ALLOWED_CATEGORIES.includes(category) ? category : null;
}

// Validate each item
for (const item of req.body.items) {
  const validCategory = validateCategory(item.category);
  if (!validCategory) {
    console.error("Invalid category:", item.category);
    return res.status(400).json({
      success: false,
      message: `Invalid category: ${item.category}`
    });
  }
  item.category = validCategory; // Normalize
}
```

### 3. Validate Size Format

```javascript
function normalizeSize(size, type) {
  if (!size || size === "N/A") return "N/A";
  
  // For shoes/boots, ensure UK prefix
  const shoeTypes = ["PVC Shoes", "Boot", "Shoe"];
  const isShoe = shoeTypes.some(st => type.includes(st));
  
  if (isShoe) {
    // Remove "UK " prefix if present, then add it back
    const cleanSize = size.replace(/^UK\s*/i, "").trim();
    return `UK ${cleanSize}`;
  }
  
  return size.trim();
}

// Normalize sizes
req.body.items = req.body.items.map(item => ({
  ...item,
  size: normalizeSize(item.size, item.type)
}));
```

## Common Fixes

### Fix 1: Handle PUT Request Correctly (Merge All Items)

```javascript
// PUT /api/members/uniform
router.put('/uniform', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sispaId || req.user.id;
    
    // PUT should replace ALL items (frontend sends merged data)
    const uniform = await MemberUniform.findOne({ where: { sispaId: userId } });
    
    if (!uniform) {
      // If no uniform exists, create new one (same as POST)
      const newUniform = await MemberUniform.create({
        sispaId: userId,
        items: req.body.items
      });
      return res.status(201).json({
        success: true,
        message: "Uniform created successfully",
        uniform: {
          sispaId: newUniform.sispaId,
          items: newUniform.items
        }
      });
    }
    
    // Update with ALL items (frontend already merged)
    uniform.items = req.body.items;
    uniform.updatedAt = new Date();
    await uniform.save();
    
    res.status(200).json({
      success: true,
      message: "Uniform updated successfully",
      uniform: {
        sispaId: uniform.sispaId,
        items: uniform.items
      }
    });
    
  } catch (error) {
    console.error("PUT /uniform error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});
```

### Fix 2: Ensure Transaction Safety

```javascript
// Using Sequelize transaction
const transaction = await sequelize.transaction();

try {
  const uniform = await MemberUniform.findOne({
    where: { sispaId: userId },
    transaction
  });
  
  if (uniform) {
    await uniform.update({ items: req.body.items }, { transaction });
  } else {
    await MemberUniform.create({
      sispaId: userId,
      items: req.body.items
    }, { transaction });
  }
  
  await transaction.commit();
  
  res.status(200).json({ success: true });
  
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### Fix 3: Add Type Validation Middleware

```javascript
function validateUniformItems(req, res, next) {
  if (!req.body.items || !Array.isArray(req.body.items)) {
    return res.status(400).json({
      success: false,
      message: "Items must be an array"
    });
  }
  
  for (const item of req.body.items) {
    if (!item.category || !item.type) {
      return res.status(400).json({
        success: false,
        message: "Each item must have category and type"
      });
    }
    
    if (!item.size) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a size"
      });
    }
  }
  
  next();
}

// Use middleware
router.post('/uniform', authenticateToken, validateUniformItems, async (req, res) => {
  // Handler logic...
});
```

## Testing Checklist Script

Create a test file `test-uniform-save.js`:

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const MEMBER_TOKEN = 'YOUR_MEMBER_TOKEN';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN';
const TEST_SISPA_ID = 'B1184040';

async function testUniformSave() {
  console.log("=== TESTING UNIFORM SAVE ===\n");
  
  // Test 1: POST new uniform
  console.log("Test 1: POST new uniform");
  try {
    const response = await axios.post(
      `${API_URL}/members/uniform`,
      {
        items: [
          {
            category: "Uniform No 3",
            type: "Uniform No 3 Male",
            size: "XL",
            quantity: 1
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${MEMBER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("✓ Success:", response.data);
  } catch (error) {
    console.log("✗ Failed:", error.response?.data || error.message);
  }
  
  // Test 2: GET member's own uniform
  console.log("\nTest 2: GET member's uniform");
  try {
    const response = await axios.get(
      `${API_URL}/members/uniform`,
      {
        headers: {
          Authorization: `Bearer ${MEMBER_TOKEN}`
        }
      }
    );
    console.log("✓ Success:", response.data);
  } catch (error) {
    console.log("✗ Failed:", error.response?.data || error.message);
  }
  
  // Test 3: GET admin view
  console.log("\nTest 3: GET admin view");
  try {
    const response = await axios.get(
      `${API_URL}/members/${TEST_SISPA_ID}/uniform`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`
        }
      }
    );
    console.log("✓ Success:", response.data);
  } catch (error) {
    console.log("✗ Failed:", error.response?.data || error.message);
  }
  
  // Test 4: PUT update uniform
  console.log("\nTest 4: PUT update uniform");
  try {
    const response = await axios.put(
      `${API_URL}/members/uniform`,
      {
        items: [
          {
            category: "Uniform No 3",
            type: "Uniform No 3 Male",
            size: "XL",
            quantity: 1
          },
          {
            category: "Uniform No 3",
            type: "Uniform No 3 Female",
            size: "M",
            quantity: 1
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${MEMBER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("✓ Success:", response.data);
  } catch (error) {
    console.log("✗ Failed:", error.response?.data || error.message);
  }
}

testUniformSave();
```

Run with:
```bash
node test-uniform-save.js
```

## Quick Verification Commands

**Check Database After Save:**
```sql
-- PostgreSQL/MySQL
SELECT 
    mu.sispa_id,
    JSON_PRETTY(mu.items) as items_json,
    mu.updated_at
FROM member_uniforms mu
WHERE mu.sispa_id = 'B1184040'
ORDER BY mu.updated_at DESC
LIMIT 1;
```

**Check API Response:**
```bash
# Get member's uniform
curl -X GET http://localhost:5000/api/members/uniform \
  -H "Authorization: Bearer TOKEN" | jq .

# Get admin view
curl -X GET http://localhost:5000/api/members/B1184040/uniform \
  -H "Authorization: Bearer ADMIN_TOKEN" | jq .
```

---

**End of Document**

