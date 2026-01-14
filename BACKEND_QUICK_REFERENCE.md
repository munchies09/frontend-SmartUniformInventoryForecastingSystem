# Backend Quick Reference - Frontend API Endpoints

Quick reference of all endpoints the frontend uses.

## Base URL
```
http://localhost:5000
```

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/members/login` | None | Login with sispaId and password |
| POST | `/api/members/signup` | None | Signup new member |
| POST | `/api/members/forgot-password` | None | Send password reset email |

---

## Member Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/members/profile` | Member | Get own profile |
| PUT | `/api/members/profile` | Member | Update own profile |

**Field Names:** `matricNumber`, `phoneNumber`, `profilePicture` (NOT `matricNo`, `phone`, `profileImage`)

---

## Uniforms

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/members/uniform` | Member | Get own uniform |
| POST | `/api/members/uniform` | Member | Create uniform |
| PUT | `/api/members/uniform` | Member | Update uniform |
| GET | `/api/members/:sispaId/uniform` | Admin | Get member uniform by SISPA ID |

**Important:** Return ALL items including accessories (items with `size: "N/A"` or `null`)

---

## Admin - Members

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/members` | Admin | Get all members |

---

## Inventory

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inventory` | Admin | Get all inventory items |
| POST | `/api/inventory` | Admin | Add inventory item |
| PUT | `/api/inventory/:id` | Admin | Update inventory item |
| POST | `/api/inventory/deduct` | Member/Admin | Deduct inventory (when saving uniform) |

**Status Values:**
- "In Stock" (quantity > 10)
- "Low Stock" (0 < quantity <= 10)
- "Out of Stock" (quantity === 0)

---

## Announcements

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/announcements` | Member/Admin | Get all announcements |
| POST | `/api/announcements` | Admin | Create announcement |
| PUT | `/api/announcements/:id` | Admin | Update announcement |
| DELETE | `/api/announcements/:id` | Admin | Delete announcement |

**Include `message` field in all announcement responses**

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Error message"
}
```

---

## Key Points

1. **Use `sispaId` only** - No `memberId` field
2. **Field names:** `matricNumber`, `phoneNumber`, `profilePicture`
3. **Return ALL items** - Including accessories in uniform responses
4. **JWT token** - Include `sispaId` and `role` in token payload
5. **Admin check** - Verify `role: "admin"` for admin endpoints
6. **Status field** - Include in inventory items
7. **Message field** - Include in announcements

---

## Testing Priority

1. ✅ Login
2. ✅ Get Members (Admin)
3. ✅ Get Inventory (Admin)
4. ✅ Get Uniform (Member)
5. ✅ Save Uniform (Member)
6. ✅ Deduct Inventory
7. ✅ Get Announcements

---

For detailed specifications, see `BACKEND_FRONTEND_CONNECTION_COMMANDS.md`

