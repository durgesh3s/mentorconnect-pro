# Backend Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Google OAuth credentials

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the following:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A strong random secret for JWT tokens
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `GOOGLE_REDIRECT_URI`: Should match your frontend callback URL (e.g., `http://localhost:5173/auth/callback`)

3. **Get Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Set Application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (for development)
     - Your production callback URL
   - Copy the Client ID and Client Secret to your `.env` file

4. **Start MongoDB**
   - If using local MongoDB:
     ```bash
     mongod
     ```
   - Or use MongoDB Atlas (cloud) and update `MONGODB_URI` in `.env`

5. **Start the Server**
   ```bash
   npm run dev
   ```
   
   The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `GET /api/auth/google` - Get Google OAuth URL
- `POST /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/check-username/:username` - Check username availability
- `POST /api/auth/complete-profile` - Complete student profile
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/students/profile` - Get student profile
- `PATCH /api/students/profile` - Update student profile
- `POST /api/students/follow/:studentId` - Follow/Unfollow student
- `GET /api/students/:username` - Get student by username

### Admin
- `GET /api/admin/students` - Get all students (with pagination and filters)
- `GET /api/admin/students/:id` - Get student details
- `PATCH /api/admin/students/:id` - Update student
- `DELETE /api/admin/students/:id` - Delete student
- `GET /api/admin/students/stats` - Get student statistics

## Student Schema

The Student model includes:

### Google Auth Fields
- `username` (unique, required)
- `email` (unique, required)
- `googleGmailPhoto`
- `googleId` (unique)

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

## Testing

You can test the API using:
- Postman
- curl
- The frontend application

Example:
```bash
# Health check
curl http://localhost:3000/health

# Get Google OAuth URL
curl http://localhost:3000/api/auth/google
```

