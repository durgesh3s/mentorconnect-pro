# Admin Panel Routes - Testing Guide

## 🔐 Important Notes

- **Admin Email**: Configured via `ADMIN_EMAIL` environment variable (default: `durgesh.singh.sde@gmail.com`)
  - Set in `.env` file: `ADMIN_EMAIL=your-admin@email.com`
  - Only the email specified in `ADMIN_EMAIL` will have admin access
  - The email must match the Google account email used for login
- **Authentication Required**: You must be logged in as an admin user to access these routes
- **Backend Base URL**: `http://localhost:3000/api` (default)
- **Frontend Base URL**: `http://localhost:5173` (default Vite port)

---

## 📍 Frontend Routes (Browser URLs)

### Main Admin Routes

1. **Admin Dashboard**
   ```
   http://localhost:5173/admin
   ```
   - Main admin dashboard with statistics
   - Shows: Total Students, Completed Profiles, Enrolled Students, Education Distribution, Top Locations
   - Quick actions section

2. **Student Management**
   ```
   http://localhost:5173/admin/students
   ```
   - Full student management interface
   - Search, filter, pagination
   - View and delete student details

---

## 🔌 Backend API Endpoints

### Base Path: `/api/admin`

All admin endpoints require:
- **Authorization Header**: `Bearer <token>`
- **Admin Role**: User must be admin (email: `durgesh.singh.sde@gmail.com`)

### 1. Get Statistics
```http
GET /api/admin/students/stats
```

**Response:**
```json
{
  "totalStudents": 100,
  "completedProfiles": 75,
  "enrolledStudents": 60,
  "educationStats": [
    { "_id": "graduation", "count": 50 },
    { "_id": "secondary", "count": 30 },
    { "_id": "high", "count": 20 }
  ],
  "topLocations": [
    { "_id": "Mumbai", "count": 25 },
    { "_id": "Delhi", "count": 20 }
  ]
}
```

---

### 2. Get All Students (with pagination & filters)
```http
GET /api/admin/students?page=1&limit=20&search=john&status=enrolled&education=graduation&location=Mumbai&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, email, or username
- `status` (optional): Filter by status - `enrolled`, `in_progress`, `completed`, `failed`
- `education` (optional): Filter by education - `high`, `secondary`, `graduation`
- `location` (optional): Filter by location (partial match)
- `sortBy` (optional): Sort field - `createdAt`, `name`, `email` (default: `createdAt`)
- `sortOrder` (optional): Sort direction - `asc` or `desc` (default: `desc`)

**Response:**
```json
{
  "students": [
    {
      "id": "student_id",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "https://...",
      "description": "Student description",
      "phone": "+1234567890",
      "education": "graduation",
      "location": "Mumbai",
      "fieldsOfInterest": ["#webdev", "#javascript"],
      "enrolledCourses": [...],
      "averageProgress": 75,
      "status": "in_progress",
      "isProfileComplete": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Example Requests:**
```bash
# Get first page of students
GET /api/admin/students?page=1&limit=20

# Search for students
GET /api/admin/students?search=john

# Filter by status
GET /api/admin/students?status=enrolled

# Filter by education
GET /api/admin/students?education=graduation

# Filter by location
GET /api/admin/students?location=Mumbai

# Combined filters
GET /api/admin/students?page=1&limit=10&search=john&status=in_progress&education=graduation&location=Mumbai&sortBy=name&sortOrder=asc
```

---

### 3. Get Single Student Details
```http
GET /api/admin/students/:id
```

**Response:**
```json
{
  "_id": "student_id",
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "avatar": "https://...",
  "description": "Student description",
  "phone": "+1234567890",
  "education": "graduation",
  "location": "Mumbai",
  "fieldsOfInterest": ["#webdev"],
  "skills": ["JavaScript", "React"],
  "bio": "Student bio",
  "isProfileComplete": true,
  "followers": [...],
  "following": [...],
  "coursesEnrolledIn": [...],
  "tagged": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**Example:**
```bash
GET /api/admin/students/507f1f77bcf86cd799439011
```

---

### 4. Update Student (Admin)
```http
PATCH /api/admin/students/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "phone": "+1234567890",
  "education": "graduation",
  "location": "New Location",
  "fieldsOfInterest": ["#webdev", "#javascript"],
  "bio": "Updated bio",
  "avatar": "https://...",
  "skills": ["JavaScript", "React", "Node.js"],
  "isProfileComplete": true
}
```

**Note:** Role cannot be updated via API - it's set automatically based on email.

**Example:**
```bash
PATCH /api/admin/students/507f1f77bcf86cd799439011
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "John Updated",
  "location": "New York"
}
```

---

### 5. Delete Student
```http
DELETE /api/admin/students/:id
```

**Response:**
```json
{
  "message": "Student deleted successfully"
}
```

**Example:**
```bash
DELETE /api/admin/students/507f1f77bcf86cd799439011
```

---

## 🧪 Testing Checklist

### Prerequisites
- [ ] Backend server is running on `http://localhost:3000`
- [ ] Frontend dev server is running on `http://localhost:5173`
- [ ] You are logged in with admin account (`durgesh.singh.sde@gmail.com`)
- [ ] You have a valid authentication token

### Frontend Routes Testing

1. **Test Admin Dashboard** (`/admin`)
   - [ ] Navigate to `http://localhost:5173/admin`
   - [ ] Verify statistics cards are displayed
   - [ ] Verify education distribution chart is visible
   - [ ] Verify top locations list is displayed
   - [ ] Verify "Manage Students" button works
   - [ ] Test responsive design on mobile

2. **Test Student Management** (`/admin/students`)
   - [ ] Navigate to `http://localhost:5173/admin/students`
   - [ ] Verify student table is displayed
   - [ ] Test search functionality
   - [ ] Test status filter (enrolled, in_progress, completed, failed)
   - [ ] Test education filter (high, secondary, graduation)
   - [ ] Test location filter
   - [ ] Test sorting (by name, email, created date)
   - [ ] Test pagination (next/previous buttons)
   - [ ] Test view student details (click eye icon)
   - [ ] Test delete student (click trash icon with confirmation)

3. **Test Navigation**
   - [ ] Verify "Admin Panel" link appears in navigation for admin users
   - [ ] Verify admin link redirects to `/admin`
   - [ ] Test mobile navigation menu

### Backend API Testing

1. **Test Statistics Endpoint**
   ```bash
   curl -X GET "http://localhost:3000/api/admin/students/stats" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Test Get Students Endpoint**
   ```bash
   # Basic request
   curl -X GET "http://localhost:3000/api/admin/students?page=1&limit=20" \
     -H "Authorization: Bearer YOUR_TOKEN"
   
   # With search
   curl -X GET "http://localhost:3000/api/admin/students?search=john" \
     -H "Authorization: Bearer YOUR_TOKEN"
   
   # With filters
   curl -X GET "http://localhost:3000/api/admin/students?status=enrolled&education=graduation" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Test Get Student Details**
   ```bash
   curl -X GET "http://localhost:3000/api/admin/students/STUDENT_ID" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Test Update Student**
   ```bash
   curl -X PATCH "http://localhost:3000/api/admin/students/STUDENT_ID" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "Updated Name", "location": "New Location"}'
   ```

5. **Test Delete Student**
   ```bash
   curl -X DELETE "http://localhost:3000/api/admin/students/STUDENT_ID" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## 🚨 Error Scenarios to Test

1. **Unauthorized Access (No Token)**
   - [ ] Try accessing `/admin` without being logged in
   - [ ] Try accessing API endpoints without token
   - [ ] Should redirect to home page or show 401 error

2. **Non-Admin User**
   - [ ] Login as regular student
   - [ ] Try accessing `/admin`
   - [ ] Should redirect to home page with error message

3. **Invalid Student ID**
   - [ ] Try to view/update/delete non-existent student
   - [ ] Should show 404 error

4. **Invalid Filters**
   - [ ] Try invalid status filter
   - [ ] Try invalid education filter
   - [ ] Should handle gracefully

---

## 📝 Quick Test URLs

Replace `localhost:5173` with your frontend URL if different:

```
# Admin Dashboard
http://localhost:5173/admin

# Student Management
http://localhost:5173/admin/students

# Student Management with Search
http://localhost:5173/admin/students?search=test

# Student Management with Filters
http://localhost:5173/admin/students?status=enrolled&education=graduation
```

---

## 🔗 Related Routes

- **Authentication**: `/auth/select-role`, `/auth/callback`
- **Student Dashboard**: `/dashboard/student` (for regular users)
- **Home**: `/` (redirects to admin panel if admin user logs in)

---

## 📚 Additional Notes

- All admin routes are protected by `authenticate` and `isAdmin` middleware
- Admin role is automatically assigned based on email (`durgesh.singh.sde@gmail.com`)
- The admin panel uses the same authentication token as regular users
- All timestamps are in ISO 8601 format
- Pagination is 0-indexed on the frontend (page 1 = first page)
- Search is case-insensitive and matches name, email, or username
