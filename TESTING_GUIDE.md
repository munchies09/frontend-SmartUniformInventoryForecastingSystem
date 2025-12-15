# Testing Guide

## Prerequisites
1. Make sure your backend server is running on `http://localhost:5000`
2. Node.js and npm (or yarn/pnpm) installed

## Step 1: Install Dependencies
If you haven't installed dependencies yet, run:
```bash
npm install
```

## Step 2: Start the Development Server
```bash
npm run dev
```

The application will start on `http://localhost:3000`

## Step 3: Testing the Application

### Testing Admin Interface

1. **Login as Admin:**
   - Go to `http://localhost:3000/login`
   - Login with admin credentials (your backend should return `role: "admin"`)
   - You should be redirected to `/admin/dashboard`

2. **Test Admin Pages:**
   - **Dashboard**: Overview with stats and quick actions
   - **Batch**: Create and manage batches
   - **Member**: View all members
   - **Inventory**: View inventory items
   - **Forecasting**: View demand forecasts

### Testing Member Interface

1. **Login as Member:**
   - Go to `http://localhost:3000/login`
   - Login with member credentials (your backend should return `role: "member"`)
   - You should be redirected to `/member/dashboard`

2. **Test Member Pages:**
   - **Dashboard**: Overview with quick access cards
   - **Profile**: Update name and email
   - **Uniform**: 
     - First time: Add uniform information
     - After adding: Update and view uniform details

### Testing Protected Routes

1. **Without Login:**
   - Try accessing `/admin/dashboard` or `/member/dashboard` directly
   - Should redirect to `/login`

2. **Wrong Role Access:**
   - Login as member, try accessing `/admin/dashboard`
   - Should redirect to `/member/dashboard`
   - Login as admin, try accessing `/member/dashboard`
   - Should redirect to `/admin/dashboard`

## Backend API Requirements

Make sure your backend returns the following structure on login:

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "memberId": "SISPA-ID",
    "name": "User Name",
    "email": "user@example.com",
    "role": "admin" // or "member"
  },
  "token": "jwt-token"
}
```

## Common Issues

1. **Port 3000 already in use:**
   - Change port: `npm run dev -- -p 3001`

2. **Backend not running:**
   - Make sure backend is on `http://localhost:5000`
   - Or update API URLs in the code

3. **TypeScript errors:**
   - Run `npm run build` to check for errors

4. **Styling not working:**
   - Make sure Tailwind CSS is properly configured
   - Check `tailwind.config.js` and `postcss.config.js`


