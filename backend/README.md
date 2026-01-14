# Mentorise Backend API

Backend API for Mentorise platform built with TypeScript.

## Features

- Google OAuth Authentication
- Student Management
- Course Enrollment Tracking
- Admin Panel Integration
- RESTful API
- Full TypeScript support with type safety

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - MongoDB connection string
   - JWT secret
   - Google OAuth credentials
   - Cloudinary credentials (for image uploads)

4. Start the development server:
```bash
npm run dev
```

The development server uses `tsx` for hot-reloading TypeScript files.

5. Build for production:
```bash
npm run build
```

6. Start production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Get Google OAuth URL
- `POST /api/auth/callback` - Handle Google OAuth callback
- `GET /api/auth/check-username/:username` - Check username availability
- `POST /api/auth/complete-profile` - Complete student profile
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/students/profile` - Get student profile
- `PATCH /api/students/profile` - Update student profile
- `POST /api/students/follow/:studentId` - Follow/Unfollow student
- `GET /api/students/:username` - Get student by username

### Upload
- `POST /api/upload/avatar` - Upload avatar image (requires authentication)
- `POST /api/upload/thread-image` - Upload thread image (requires authentication)

### Admin
- `GET /api/admin/students` - Get all students (with pagination and filters)
- `GET /api/admin/students/:id` - Get student details
- `PATCH /api/admin/students/:id` - Update student
- `DELETE /api/admin/students/:id` - Delete student
- `GET /api/admin/students/stats` - Get student statistics

## Student Schema

### Google Auth Fields
- `username` (unique, required)
- `email` (unique, required)
- `googleGmailPhoto`

### Mandatory Fields
- `description` (min 10 characters)
- `phone` (valid phone format)
- `tagged` (array of community post tags)

### Social Fields
- `followers` (array of student IDs)
- `following` (array of student IDs)

### Course Enrollment
- `coursesEnrolledIn` (array with status: inprogress, completed, failed)

### Education
- `education` (enum: high, secondary, graduation)

### Location
- `location` (string)

### Fields of Interest
- `fieldsOfInterest` (array of hashtags, e.g., #Datascience, #development)

## Environment Variables

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI (e.g., `http://localhost:5173/auth/callback`)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `YOUTUBE_API_KEY` - YouTube Data API v3 key (required for fetching playlist videos)
- `ADMIN_EMAIL` - Admin email address for admin panel access (default: `durgesh.singh.sde@gmail.com`)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

