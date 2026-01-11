# Course Schema Design & Implementation

## Product-Level Design

### Overview
A comprehensive course management system where:
- **Admin** can create, update, and delete courses using YouTube URLs (playlist or individual videos)
- **Students** can browse courses, enroll, and track their progress
- Progress tracking is automatic based on video/watch time
- YouTube integration for seamless video playback

---

## Database Schema

### Course Model

```typescript
interface ICourse {
  _id: ObjectId;
  
  // Basic Information
  title: string;                    // Course title (required)
  description: string;              // Course description (required)
  thumbnail?: string;               // Course thumbnail image URL
  category: string;                 // Course category (e.g., "Web Development", "Data Science")
  level: 'beginner' | 'intermediate' | 'advanced'; // Course difficulty level
  tags: string[];                   // Course tags for search/filtering
  
  // YouTube Integration
  youtubeUrl: string;               // Full YouTube URL (playlist or video)
  youtubeId: string;                // Extracted YouTube ID
  youtubeType: 'video' | 'playlist'; // Type of YouTube content
  videoCount: number;               // Number of videos (1 for single video, N for playlist)
  duration: number;                 // Total duration in minutes
  
  // Course Content
  videos: VideoContent[];           // Array of video content (parsed from playlist)
  resources?: Resource[];           // Additional resources (PDFs, links, etc.)
  
  // Pricing & Access
  isFree: boolean;                  // Is course free?
  price?: number;                   // Course price (if not free)
  currency?: string;                // Currency code (default: "INR")
  
  // Metadata
  instructor: string;               // Course instructor/creator name
  language: string;                 // Course language (default: "en")
  isPublished: boolean;             // Is course published? (only published courses visible to students)
  isFeatured: boolean;              // Featured course flag
  
  // Statistics
  enrollmentsCount: number;         // Number of students enrolled
  averageRating?: number;           // Average rating (0-5)
  reviewCount: number;              // Number of reviews
  
  // Admin Information
  createdBy: ObjectId;              // Admin user who created (ref: Student)
  lastModifiedBy?: ObjectId;        // Last admin who modified (ref: Student)
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface VideoContent {
  videoId: string;                  // YouTube video ID
  title: string;                    // Video title
  description?: string;             // Video description
  duration: number;                 // Duration in seconds
  order: number;                    // Playlist order
  thumbnail?: string;               // Video thumbnail URL
}

interface Resource {
  type: 'pdf' | 'link' | 'code' | 'other';
  title: string;
  url: string;
  description?: string;
}
```

---

## API Design

### Admin Routes (`/api/admin/courses`)

#### 1. Create Course
```http
POST /api/admin/courses
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Complete React Course",
  "description": "Learn React from scratch",
  "youtubeUrl": "https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMH7P1X1i2ZGpDV2Dq",
  "category": "Web Development",
  "level": "beginner",
  "tags": ["react", "javascript", "frontend"],
  "isFree": true,
  "instructor": "John Doe",
  "language": "en",
  "isPublished": false
}
```

**Response:**
```json
{
  "id": "course_id",
  "title": "Complete React Course",
  "youtubeType": "playlist",
  "videoCount": 50,
  "duration": 600,
  "videos": [...],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Get All Courses (Admin)
```http
GET /api/admin/courses?page=1&limit=20&search=react&category=Web Development&isPublished=true
```

#### 3. Get Single Course (Admin)
```http
GET /api/admin/courses/:id
```

#### 4. Update Course
```http
PATCH /api/admin/courses/:id
Authorization: Bearer <admin_token>

{
  "title": "Updated Title",
  "isPublished": true,
  "isFeatured": true
}
```

#### 5. Delete Course
```http
DELETE /api/admin/courses/:id
Authorization: Bearer <admin_token>
```

#### 6. Get Course Statistics
```http
GET /api/admin/courses/stats
```

---

### Student Routes (`/api/courses`)

#### 1. Get Published Courses (Student)
```http
GET /api/courses?page=1&limit=20&search=react&category=Web Development&level=beginner&isFree=true
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `search`: Search in title/description
- `category`: Filter by category
- `level`: Filter by level (beginner/intermediate/advanced)
- `isFree`: Filter free/paid courses
- `sortBy`: Sort by (popularity, newest, rating)
- `tags`: Filter by tags

#### 2. Get Single Course (Student)
```http
GET /api/courses/:id
```

**Response includes enrollment status:**
```json
{
  "id": "course_id",
  "title": "...",
  "isEnrolled": true,
  "enrollment": {
    "status": "inprogress",
    "progress": 45,
    "enrolledAt": "..."
  },
  ...
}
```

#### 3. Enroll in Course
```http
POST /api/courses/:id/enroll
Authorization: Bearer <student_token>
```

#### 4. Update Course Progress
```http
PATCH /api/courses/:id/progress
Authorization: Bearer <student_token>

{
  "videoId": "youtube_video_id",
  "watchedDuration": 300,  // seconds
  "isCompleted": false
}
```

#### 5. Get Enrolled Courses
```http
GET /api/courses/enrolled
Authorization: Bearer <student_token>
```

---

## YouTube URL Parsing

### Supported Formats

1. **Single Video:**
   - `https://www.youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`
   - `https://www.youtube.com/embed/VIDEO_ID`

2. **Playlist:**
   - `https://www.youtube.com/playlist?list=PLAYLIST_ID`
   - `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

### Parser Utility Functions

- Extract video/playlist ID from URL
- Determine if URL is video or playlist
- Fetch playlist metadata (title, video count, etc.)
- Parse individual video details from playlist

**Note:** For playlist parsing, we'll use YouTube Data API v3 (optional) or client-side parsing

---

## Progress Tracking System

### Progress Calculation

For **single video:**
```
progress = (watchedDuration / totalDuration) * 100
```

For **playlist:**
```
progress = (completedVideosCount / totalVideosCount) * 100
```

### Tracking Events

1. **Video Started:** Track when student starts watching
2. **Watch Time:** Update watched duration periodically (every 10-30 seconds)
3. **Video Completed:** Mark video as completed when watched >= 90% of duration
4. **Course Completed:** Auto-complete when all videos are completed

### Student Course Progress Schema (already exists)

```typescript
interface ICourseEnrollment {
  courseId: ObjectId;
  status: 'inprogress' | 'completed' | 'failed';
  enrolledAt: Date;
  completedAt?: Date;
  progress: number;  // 0-100
  watchedVideos?: {  // Track individual video progress
    videoId: string;
    watchedDuration: number;
    isCompleted: boolean;
    lastWatchedAt: Date;
  }[];
}
```

---

## Frontend Components

### Admin Components

1. **CourseList** (`/admin/courses`)
   - List all courses with filters
   - Create new course button
   - Edit/Delete actions

2. **CourseForm** (Create/Edit)
   - YouTube URL input with validation
   - Auto-parse YouTube URL
   - Course metadata fields
   - Preview course details
   - Publish/Unpublish toggle

3. **CourseDetail** (Admin View)
   - Full course details
   - Enrollment statistics
   - Student list
   - Edit course

### Student Components

1. **CourseListing** (`/courses`)
   - Grid/List view of courses
   - Search and filters
   - Enrollment status badges
   - Category/Level filters

2. **CourseDetail** (Student View)
   - Course information
   - Instructor details
   - Enroll button
   - Course preview

3. **CoursePlayer** (`/courses/:id/learn`)
   - YouTube player integration
   - Video playlist navigation
   - Progress tracking
   - Video completion indicators
   - Next/Previous video buttons

---

## Implementation Plan

### Phase 1: Backend Foundation
1. ✅ Create Course model
2. ✅ Add Course types
3. ✅ Create YouTube URL parser utility
4. ✅ Create admin routes
5. ✅ Create student routes

### Phase 2: Frontend Admin
1. ✅ Admin course management pages
2. ✅ Course form with YouTube URL parser
3. ✅ Course list with CRUD operations

### Phase 3: Frontend Student
1. ✅ Update course listing page
2. ✅ Course detail page
3. ✅ Course player with YouTube integration
4. ✅ Progress tracking UI

### Phase 4: Enhancements
1. YouTube Data API integration (optional, for better metadata)
2. Video thumbnail generation
3. Course analytics dashboard
4. Reviews and ratings system

---

## Security Considerations

1. **Admin Authorization:** Only admin users can create/edit/delete courses
2. **YouTube URL Validation:** Validate YouTube URLs before saving
3. **Progress Validation:** Ensure progress is between 0-100
4. **Rate Limiting:** Limit enrollment and progress update requests
5. **Content Moderation:** Admin should review courses before publishing

---

## Environment Variables

```env
# YouTube API (Optional - for enhanced metadata)
YOUTUBE_API_KEY=your_youtube_api_key
```

---

## Future Enhancements

1. **Multi-source support:** Support other platforms (Vimeo, custom video hosting)
2. **Course modules:** Organize videos into modules/chapters
3. **Quizzes/Assessments:** Add quizzes after videos
4. **Certificates:** Auto-generate certificates on course completion
5. **Discussion forums:** Per-course discussion threads
6. **Live sessions:** Support for live streaming
7. **Downloadable resources:** Support file uploads for course resources
