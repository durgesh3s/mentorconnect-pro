import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Student } from '../models/Student.js';
import Review from '../models/Review.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { parseYouTubeUrl, getYouTubeThumbnailUrl } from '../utils/youtubeParser.js';
import { fetchYouTubePlaylistVideos, fetchYouTubeVideoDetails } from '../utils/youtubeFetcher.js';
import { CourseLevel, YouTubeType, SubscriptionPlan } from '../types/index.js';

const router = express.Router();

interface CreateCourseRequestBody {
  title: string;
  description: string;
  youtubeUrl: string;
  category?: string;
  level?: CourseLevel;
  tags?: string[];
  thumbnail?: string;
  isFree?: boolean;
  price?: number;
  currency?: string;
  instructor?: string;
  language?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  resources?: Array<{
    type: 'pdf' | 'link' | 'code' | 'other';
    title: string;
    url: string;
    description?: string;
  }>;
}

interface UpdateCourseRequestBody extends Partial<CreateCourseRequestBody> {
  isPublished?: boolean;
  isFeatured?: boolean;
}

interface CoursesQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  level?: CourseLevel;
  isPublished?: string;
  isFree?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ==================== ADMIN ROUTES ====================

// Get all courses (Admin) - with filters
router.get(
  '/admin',
  authenticate,
  isAdmin,
  async (req: Request<{}, {}, {}, CoursesQueryParams>, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        search = '',
        category,
        level,
        isPublished,
        isFree,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const query: any = {};

      // Search filter
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Level filter
      if (level) {
        query.level = level;
      }

      // Published filter
      if (isPublished !== undefined) {
        query.isPublished = isPublished === 'true';
      }

      // Free filter
      if (isFree !== undefined) {
        query.isFree = isFree === 'true';
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      const sort: { [key: string]: 1 | -1 } = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [courses, total] = await Promise.all([
        Course.find(query)
          .populate('createdBy', 'name username email')
          .populate('lastModifiedBy', 'name username email')
          .sort(sort)
          .skip(skip)
          .limit(limitNum),
        Course.countDocuments(query),
      ]);

      res.json({
        courses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Admin get courses error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch courses', error: errorMessage });
    }
  }
);

// Get single course (Admin)
router.get(
  '/admin/:id',
  authenticate,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const course = await Course.findById(req.params.id)
        .populate('createdBy', 'name username email')
        .populate('lastModifiedBy', 'name username email');

      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      res.json(course);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch course', error: errorMessage });
    }
  }
);

// Create course (Admin)
router.post(
  '/admin',
  authenticate,
  isAdmin,
  async (req: Request<{}, {}, CreateCourseRequestBody>, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        youtubeUrl,
        category = 'General',
        level = 'beginner',
        tags = [],
        thumbnail,
        isFree = true,
        price,
        currency = 'INR',
        instructor = 'CodeMentor Pro',
        language = 'en',
        isPublished = false,
        isFeatured = false,
        resources = [],
      } = req.body;

      // Validate required fields
      if (!title || !description || !youtubeUrl) {
        res.status(400).json({ message: 'Title, description, and YouTube URL are required' });
        return;
      }

      // Validate title and description lengths
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();
      
      if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
        res.status(400).json({ message: 'Title must be between 3 and 200 characters' });
        return;
      }
      
      if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) {
        res.status(400).json({ message: 'Description must be between 10 and 5000 characters' });
        return;
      }

      // Parse YouTube URL
      const youtubeParse = parseYouTubeUrl(youtubeUrl);
      if (!youtubeParse.isValid) {
        res.status(400).json({ message: 'Invalid YouTube URL' });
        return;
      }

      // Prepare course data
      const courseData: any = {
        title: title.trim(),
        description: description.trim(),
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: youtubeParse.videoId || youtubeParse.playlistId || '',
        youtubeType: youtubeParse.type as YouTubeType,
        videoCount: 1, // Default to 1 (will be updated when playlist is parsed)
        duration: 0, // Will be calculated from videos
        category: category.trim(),
        level,
        tags: tags.map((tag) => tag.trim().toLowerCase()),
        isFree,
        price: isFree ? undefined : price,
        currency,
        instructor: instructor.trim(),
        language: language.toLowerCase(),
        isPublished,
        isFeatured,
        resources,
        createdBy: req.user!._id,
        enrollmentsCount: 0,
        reviewCount: 0,
      };

      // Set thumbnail
      if (thumbnail) {
        courseData.thumbnail = thumbnail;
      } else if (youtubeParse.videoId) {
        courseData.thumbnail = getYouTubeThumbnailUrl(youtubeParse.videoId);
      }

      // For single video, fetch video details
      if (youtubeParse.type === 'video' && youtubeParse.videoId) {
        try {
          const videoDetails = await fetchYouTubeVideoDetails(youtubeParse.videoId);
          courseData.videos = [videoDetails];
          courseData.videoCount = 1;
          courseData.duration = Math.ceil(videoDetails.duration / 60); // Convert seconds to minutes
        } catch (error) {
          // Fallback if API fails
          console.warn('Failed to fetch video details, using fallback:', error);
          courseData.videos = [
            {
              videoId: youtubeParse.videoId,
              title: title,
              duration: 0,
              order: 1,
              thumbnail: getYouTubeThumbnailUrl(youtubeParse.videoId),
            },
          ];
          courseData.videoCount = 1;
          courseData.duration = 0;
        }
      } else if (youtubeParse.type === 'playlist' && youtubeParse.playlistId) {
        // Fetch playlist videos
        console.log(`[Course Routes] Creating course with playlist: ${youtubeParse.playlistId}`);
        try {
          const playlistVideos = await fetchYouTubePlaylistVideos(youtubeParse.playlistId);
          console.log(`[Course Routes] ✅ Fetched ${playlistVideos.length} videos for new course`);
          courseData.videos = playlistVideos;
          courseData.videoCount = playlistVideos.length;
          // Calculate total duration in minutes
          const totalDurationSeconds = playlistVideos.reduce((sum, video) => sum + video.duration, 0);
          courseData.duration = Math.ceil(totalDurationSeconds / 60);
          
          console.log(`[Course Routes] Course metadata set:`, {
            videoCount: courseData.videoCount,
            duration: courseData.duration
          });
          
          // Set thumbnail from first video if not provided
          if (!thumbnail && playlistVideos.length > 0 && playlistVideos[0].thumbnail) {
            courseData.thumbnail = playlistVideos[0].thumbnail;
            console.log(`[Course Routes] Set thumbnail from first video`);
          }
        } catch (error) {
          console.error('[Course Routes] ❌ Failed to fetch playlist videos:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Course Routes] Error details:', {
            message: errorMessage,
            playlistId: youtubeParse.playlistId,
            hasApiKey: !!process.env.YOUTUBE_API_KEY
          });
          res.status(500).json({ 
            message: 'Failed to fetch playlist videos', 
            error: errorMessage,
            hint: 'Please ensure YOUTUBE_API_KEY is set in your environment variables'
          });
          return;
        }
      }

      const course = new Course(courseData);
      await course.save();

      res.status(201).json(course);
    } catch (error) {
      console.error('Create course error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to create course', error: errorMessage });
    }
  }
);

// Update course (Admin)
router.patch(
  '/admin/:id',
  authenticate,
  isAdmin,
  async (req: Request<{ id: string }, {}, UpdateCourseRequestBody>, res: Response): Promise<void> => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      // Validate title and description lengths if provided
      if (req.body.title !== undefined) {
        const trimmedTitle = req.body.title.trim();
        if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
          res.status(400).json({ message: 'Title must be between 3 and 200 characters' });
          return;
        }
      }
      
      if (req.body.description !== undefined) {
        const trimmedDescription = req.body.description.trim();
        if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) {
          res.status(400).json({ message: 'Description must be between 10 and 5000 characters' });
          return;
        }
      }

      const allowedUpdates: (keyof UpdateCourseRequestBody)[] = [
        'title',
        'description',
        'youtubeUrl',
        'category',
        'level',
        'tags',
        'thumbnail',
        'isFree',
        'price',
        'currency',
        'instructor',
        'language',
        'isPublished',
        'isFeatured',
        'resources',
      ];

      // Handle YouTube URL update
      if (req.body.youtubeUrl && req.body.youtubeUrl !== course.youtubeUrl) {
        const youtubeParse = parseYouTubeUrl(req.body.youtubeUrl);
        if (!youtubeParse.isValid) {
          res.status(400).json({ message: 'Invalid YouTube URL' });
          return;
        }

        course.youtubeUrl = req.body.youtubeUrl.trim();
        course.youtubeId = youtubeParse.videoId || youtubeParse.playlistId || '';
        course.youtubeType = youtubeParse.type as YouTubeType;

        if (youtubeParse.type === 'video' && youtubeParse.videoId) {
          try {
            const videoDetails = await fetchYouTubeVideoDetails(youtubeParse.videoId);
            course.videos = [videoDetails];
            course.videoCount = 1;
            course.duration = Math.ceil(videoDetails.duration / 60); // Convert seconds to minutes
          } catch (error) {
            // Fallback if API fails
            console.warn('Failed to fetch video details, using fallback:', error);
            course.videos = [
              {
                videoId: youtubeParse.videoId,
                title: course.title,
                duration: 0,
                order: 1,
                thumbnail: getYouTubeThumbnailUrl(youtubeParse.videoId),
              },
            ];
            course.videoCount = 1;
            course.duration = 0;
          }
        } else if (youtubeParse.type === 'playlist' && youtubeParse.playlistId) {
          console.log(`[Course Routes] Updating course to playlist: ${youtubeParse.playlistId}`);
          try {
            const playlistVideos = await fetchYouTubePlaylistVideos(youtubeParse.playlistId);
            console.log(`[Course Routes] ✅ Fetched ${playlistVideos.length} videos for updated course`);
            course.videos = playlistVideos;
            course.videoCount = playlistVideos.length;
            // Calculate total duration in minutes
            const totalDurationSeconds = playlistVideos.reduce((sum, video) => sum + video.duration, 0);
            course.duration = Math.ceil(totalDurationSeconds / 60);
            
            console.log(`[Course Routes] Updated course metadata:`, {
              videoCount: course.videoCount,
              duration: course.duration
            });
            
            // Set thumbnail from first video if not provided in update
            if (!req.body.thumbnail && playlistVideos.length > 0 && playlistVideos[0].thumbnail) {
              course.thumbnail = playlistVideos[0].thumbnail;
              console.log(`[Course Routes] Updated thumbnail from first video`);
            }
          } catch (error) {
            console.error('[Course Routes] ❌ Failed to fetch playlist videos:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[Course Routes] Error details:', {
              message: errorMessage,
              playlistId: youtubeParse.playlistId,
              hasApiKey: !!process.env.YOUTUBE_API_KEY
            });
            res.status(500).json({ 
              message: 'Failed to fetch playlist videos', 
              error: errorMessage,
              hint: 'Please ensure YOUTUBE_API_KEY is set in your environment variables'
            });
            return;
          }
        }
      }

      // Update other fields
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined && field !== 'youtubeUrl') {
          if (field === 'tags' && Array.isArray(req.body[field])) {
            (course as any)[field] = req.body[field]!.map((tag: string) => tag.trim().toLowerCase());
          } else if (field === 'title' || field === 'description') {
            (course as any)[field] = (req.body[field] as string).trim();
          } else {
            (course as any)[field] = req.body[field];
          }
        }
      });

      course.lastModifiedBy = req.user!._id;
      await course.save();

      res.json(course);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to update course', error: errorMessage });
    }
  }
);

// Refresh playlist videos (Student) - Re-fetch videos from YouTube playlist for enrolled courses
router.post(
  '/:id/refresh-videos',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    console.log(`[Course Routes] Student refresh videos request for course: ${courseId}`);
    console.log(`[Course Routes] User: ${req.user?.email}`);
    
    try {
      const course = await Course.findOne({
        _id: courseId,
        isPublished: true,
      });

      if (!course) {
        console.error(`[Course Routes] Course not found or not published: ${courseId}`);
        res.status(404).json({ message: 'Course not found or not published' });
        return;
      }

      // Check if student is enrolled
      const student = await Student.findById(req.user!._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      const enrollment = student.coursesEnrolledIn.find(
        (e) => e.courseId.toString() === course._id.toString()
      );

      if (!enrollment) {
        console.warn(`[Course Routes] Student not enrolled in course: ${courseId}`);
        res.status(403).json({ message: 'You must be enrolled in this course to refresh videos' });
        return;
      }

      console.log(`[Course Routes] Course found, student enrolled:`, {
        id: course._id,
        title: course.title,
        youtubeType: course.youtubeType,
        youtubeId: course.youtubeId,
        currentVideoCount: course.videoCount,
        currentVideosLength: course.videos?.length || 0
      });

      if (course.youtubeType !== 'playlist') {
        console.warn(`[Course Routes] Course is not a playlist: ${course.youtubeType}`);
        res.status(400).json({ message: 'This endpoint is only for playlist courses' });
        return;
      }

      if (!course.youtubeId) {
        console.error(`[Course Routes] Course missing youtubeId: ${course._id}`);
        res.status(400).json({ message: 'Course does not have a valid playlist ID' });
        return;
      }

      console.log(`[Course Routes] Starting playlist fetch for playlistId: ${course.youtubeId}`);
      
      try {
        const playlistVideos = await fetchYouTubePlaylistVideos(course.youtubeId);
        
        console.log(`[Course Routes] ✅ Successfully fetched ${playlistVideos.length} videos`);
        console.log(`[Course Routes] Video details:`, playlistVideos.map(v => ({
          order: v.order,
          title: v.title.substring(0, 50),
          videoId: v.videoId,
          duration: v.duration
        })));

        course.videos = playlistVideos;
        course.videoCount = playlistVideos.length;
        // Calculate total duration in minutes
        const totalDurationSeconds = playlistVideos.reduce((sum, video) => sum + video.duration, 0);
        course.duration = Math.ceil(totalDurationSeconds / 60);
        
        console.log(`[Course Routes] Updated course metadata:`, {
          videoCount: course.videoCount,
          duration: course.duration,
          totalDurationSeconds
        });
        
        // Update thumbnail from first video if not set
        if (!course.thumbnail && playlistVideos.length > 0 && playlistVideos[0].thumbnail) {
          course.thumbnail = playlistVideos[0].thumbnail;
          console.log(`[Course Routes] Updated course thumbnail from first video`);
        }
        
        await course.save();

        console.log(`[Course Routes] ✅ Course saved successfully by student`);

        res.json({ 
          message: 'Playlist videos refreshed successfully',
          course,
          videosCount: playlistVideos.length
        });
      } catch (error) {
        console.error('[Course Routes] ❌ Failed to refresh playlist videos:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Course Routes] Error details:', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          playlistId: course.youtubeId,
          hasApiKey: !!process.env.YOUTUBE_API_KEY
        });
        res.status(500).json({ 
          message: 'Failed to refresh playlist videos', 
          error: errorMessage,
          hint: 'Please ensure YOUTUBE_API_KEY is set in your environment variables'
        });
      }
    } catch (error) {
      console.error('[Course Routes] ❌ Unexpected error in refresh endpoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to refresh videos', error: errorMessage });
    }
  }
);

// Refresh playlist videos (Admin) - Re-fetch videos from YouTube playlist
router.post(
  '/admin/:id/refresh-videos',
  authenticate,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    console.log(`[Course Routes] Refresh videos request for course: ${courseId}`);
    console.log(`[Course Routes] User: ${req.user?.email}, Admin: ${req.user?.role === 'admin'}`);
    
    try {
      const course = await Course.findById(courseId);

      if (!course) {
        console.error(`[Course Routes] Course not found: ${courseId}`);
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      console.log(`[Course Routes] Course found:`, {
        id: course._id,
        title: course.title,
        youtubeType: course.youtubeType,
        youtubeId: course.youtubeId,
        currentVideoCount: course.videoCount,
        currentVideosLength: course.videos?.length || 0
      });

      if (course.youtubeType !== 'playlist') {
        console.warn(`[Course Routes] Course is not a playlist: ${course.youtubeType}`);
        res.status(400).json({ message: 'This endpoint is only for playlist courses' });
        return;
      }

      if (!course.youtubeId) {
        console.error(`[Course Routes] Course missing youtubeId: ${course._id}`);
        res.status(400).json({ message: 'Course does not have a valid playlist ID' });
        return;
      }

      console.log(`[Course Routes] Starting playlist fetch for playlistId: ${course.youtubeId}`);
      
      try {
        const playlistVideos = await fetchYouTubePlaylistVideos(course.youtubeId);
        
        console.log(`[Course Routes] ✅ Successfully fetched ${playlistVideos.length} videos`);
        console.log(`[Course Routes] Video details:`, playlistVideos.map(v => ({
          order: v.order,
          title: v.title.substring(0, 50),
          videoId: v.videoId,
          duration: v.duration
        })));

        course.videos = playlistVideos;
        course.videoCount = playlistVideos.length;
        // Calculate total duration in minutes
        const totalDurationSeconds = playlistVideos.reduce((sum, video) => sum + video.duration, 0);
        course.duration = Math.ceil(totalDurationSeconds / 60);
        
        console.log(`[Course Routes] Updated course metadata:`, {
          videoCount: course.videoCount,
          duration: course.duration,
          totalDurationSeconds
        });
        
        // Update thumbnail from first video if not set
        if (!course.thumbnail && playlistVideos.length > 0 && playlistVideos[0].thumbnail) {
          course.thumbnail = playlistVideos[0].thumbnail;
          console.log(`[Course Routes] Updated course thumbnail from first video`);
        }
        
        course.lastModifiedBy = req.user!._id;
        await course.save();

        console.log(`[Course Routes] ✅ Course saved successfully`);

        res.json({ 
          message: 'Playlist videos refreshed successfully',
          course,
          videosCount: playlistVideos.length
        });
      } catch (error) {
        console.error('[Course Routes] ❌ Failed to refresh playlist videos:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Course Routes] Error details:', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          playlistId: course.youtubeId,
          hasApiKey: !!process.env.YOUTUBE_API_KEY
        });
        res.status(500).json({ 
          message: 'Failed to refresh playlist videos', 
          error: errorMessage,
          hint: 'Please ensure YOUTUBE_API_KEY is set in your environment variables'
        });
      }
    } catch (error) {
      console.error('[Course Routes] ❌ Unexpected error in refresh endpoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to refresh videos', error: errorMessage });
    }
  }
);

// Delete course (Admin)
router.delete(
  '/admin/:id',
  authenticate,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      // Remove course enrollments from all students
      await Student.updateMany(
        { 'coursesEnrolledIn.courseId': course._id },
        { $pull: { coursesEnrolledIn: { courseId: course._id } } }
      );

      await course.deleteOne();

      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to delete course', error: errorMessage });
    }
  }
);

// Get course statistics (Admin)
router.get(
  '/admin/stats',
  authenticate,
  isAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const [
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        categoryStats,
        levelStats,
      ] = await Promise.all([
        Course.countDocuments(),
        Course.countDocuments({ isPublished: true }),
        Course.countDocuments({ isPublished: false }),
        Course.aggregate([
          { $group: { _id: null, total: { $sum: '$enrollmentsCount' } } },
        ]),
        Course.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Course.aggregate([
          { $group: { _id: '$level', count: { $sum: 1 } } },
        ]),
      ]);

      res.json({
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments: totalEnrollments[0]?.total || 0,
        categoryStats,
        levelStats,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch statistics', error: errorMessage });
    }
  }
);

// ==================== STUDENT ROUTES ====================

// Get all published courses (Student) - with filters
router.get(
  '/',
  authenticate,
  async (req: Request<{}, {}, {}, CoursesQueryParams>, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        search = '',
        category,
        level,
        isFree,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const query: any = {
        isPublished: true, // Only show published courses
      };

      // Search filter
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      // Category filter (skip if "all")
      if (category && category !== 'all') {
        query.category = category;
      }

      // Level filter (skip if "all", also handle "difficulty" parameter)
      const difficultyLevel = level || (req.query as any).difficulty;
      if (difficultyLevel && difficultyLevel !== 'all') {
        query.level = difficultyLevel;
      }

      // Free filter
      if (isFree !== undefined) {
        query.isFree = isFree === 'true';
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // Handle sortBy - map frontend sort values to database fields
      let sortField = sortBy;
      if (sortBy === 'popularity') {
        sortField = 'enrollmentsCount'; // Sort by enrollment count for popularity
      } else if (sortBy === 'newest') {
        sortField = 'createdAt';
      } else if (sortBy === 'rating') {
        sortField = 'averageRating';
      }
      
      const sort: { [key: string]: 1 | -1 } = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

      const [courses, total] = await Promise.all([
        Course.find(query)
          .select('-__v')
          .sort(sort)
          .skip(skip)
          .limit(limitNum),
        Course.countDocuments(query),
      ]);

      // Get student's enrollment status for each course
      const student = await Student.findById(req.user!._id).select('coursesEnrolledIn');
      const enrolledCourseIds = new Set(
        student?.coursesEnrolledIn.map((e) => e.courseId.toString()) || []
      );

      const coursesWithEnrollment = courses.map((course) => {
        const enrollment = student?.coursesEnrolledIn.find(
          (e) => e.courseId.toString() === course._id.toString()
        );

        return {
          ...course.toObject(),
          isEnrolled: enrolledCourseIds.has(course._id.toString()),
          enrollment: enrollment
            ? {
                status: enrollment.status,
                progress: enrollment.progress,
                enrolledAt: enrollment.enrolledAt,
                plan: enrollment.plan,
                subscriptionAmount: enrollment.subscriptionAmount,
                subscriptionCurrency: enrollment.subscriptionCurrency,
                subscriptionExpiresAt: enrollment.subscriptionExpiresAt,
              }
            : null,
        };
      });

      res.json({
        courses: coursesWithEnrollment,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get courses error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch courses', error: errorMessage });
    }
  }
);

// Get single course (Student)
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const courseId = req.params.id;
  console.log(`[Course Routes] Get course request: ${courseId} by user: ${req.user?.email}`);
  
  try {
    const course = await Course.findOne({
      _id: courseId,
      isPublished: true,
    });

    if (!course) {
      console.error(`[Course Routes] Course not found or not published: ${courseId}`);
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }

    console.log(`[Course Routes] Course found:`, {
      id: course._id,
      title: course.title,
      youtubeType: course.youtubeType,
      videoCount: course.videoCount,
      videosLength: course.videos?.length || 0,
      hasVideos: !!(course.videos && course.videos.length > 0)
    });

    // Get student's enrollment status
    const student = await Student.findById(req.user!._id).select('coursesEnrolledIn');
    const enrollment = student?.coursesEnrolledIn.find(
      (e) => e.courseId.toString() === course._id.toString()
    );

    // Get notes and completion status for videos in this course
    const videoNotesMap: Record<string, string> = {};
    const completedVideoIds = new Set<string>();
    
    if (enrollment) {
      if (enrollment.videoNotes) {
        enrollment.videoNotes.forEach((note) => {
          videoNotesMap[note.videoId] = note.notes;
        });
      }
      if (enrollment.completedVideos) {
        enrollment.completedVideos.forEach((v) => {
          completedVideoIds.add(v.videoId);
        });
      }
    }

    // Attach notes and completion status to videos
    const videosWithNotes = course.videos.map((video) => {
      const videoObj = (video as any).toObject ? (video as any).toObject() : video;
      return {
        ...videoObj,
        notes: videoNotesMap[video.videoId] || '',
        completed: completedVideoIds.has(video.videoId),
      };
    });

    const courseWithEnrollment = {
      ...course.toObject(),
      videos: videosWithNotes,
      isEnrolled: !!enrollment,
      enrollment: enrollment
        ? {
            status: enrollment.status,
            progress: enrollment.progress,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
            plan: enrollment.plan,
            subscriptionAmount: enrollment.subscriptionAmount,
            subscriptionCurrency: enrollment.subscriptionCurrency,
            subscriptionExpiresAt: enrollment.subscriptionExpiresAt,
          }
        : null,
    };

    console.log(`[Course Routes] Returning course with ${courseWithEnrollment.videos?.length || 0} videos`);

    res.json(courseWithEnrollment);
  } catch (error) {
    console.error(`[Course Routes] ❌ Error fetching course ${courseId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch course', error: errorMessage });
  }
});

// Get course curriculum with pagination (Student)
router.get('/:id/curriculum', authenticate, async (req: Request<{ id: string }, {}, {}, { page?: string; limit?: string }>, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const { page = '1', limit = '20' } = req.query;

    const course = await Course.findOne({
      _id: courseId,
      isPublished: true,
    }).select('videos');

    if (!course) {
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const total = course.videos.length;

    // Get student's enrollment status for completion info
    const student = await Student.findById(req.user!._id).select('coursesEnrolledIn');
    const enrollment = student?.coursesEnrolledIn.find(
      (e) => e.courseId.toString() === courseId
    );

    const completedVideoIds = new Set<string>();
    if (enrollment?.completedVideos) {
      enrollment.completedVideos.forEach((v) => {
        completedVideoIds.add(v.videoId);
      });
    }

    // Paginate videos
    const paginatedVideos = course.videos
      .slice(skip, skip + limitNum)
      .map((video: any) => {
        const videoObj = video.toObject ? video.toObject() : video;
        return {
          ...videoObj,
          completed: completedVideoIds.has(video.videoId),
        };
      });

    res.json({
      videos: paginatedVideos,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error(`[Course Routes] ❌ Error fetching curriculum:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch curriculum', error: errorMessage });
  }
});

// Get course reviews with pagination (Student)
router.get('/:id/reviews', authenticate, async (req: Request<{ id: string }, {}, {}, { page?: string; limit?: string }>, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const { page = '1', limit = '10' } = req.query;

    const course = await Course.findOne({
      _id: courseId,
      isPublished: true,
    }).select('_id');

    if (!course) {
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find({ course: courseId })
        .populate('author', 'name username avatar googleGmailPhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ course: courseId }),
    ]);

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error(`[Course Routes] ❌ Error fetching reviews:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch reviews', error: errorMessage });
  }
});

// Create a review for a course (Student)
router.post('/:id/reviews', authenticate, async (req: Request<{ id: string }, {}, { rating: number; content?: string }>, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id;
    const { rating, content } = req.body;
    const userId = req.user!._id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    const course = await Course.findOne({
      _id: courseId,
      isPublished: true,
    }).select('_id');

    if (!course) {
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }

    // Check if user is enrolled (optional check - you may want to require enrollment)
    const student = await Student.findById(userId).select('coursesEnrolledIn');
    const isEnrolled = student?.coursesEnrolledIn.some(
      (e) => e.courseId.toString() === courseId
    );

    if (!isEnrolled) {
      res.status(403).json({ message: 'You must be enrolled in the course to leave a review' });
      return;
    }

    // Check if user already has a review
    const existingReview = await Review.findOne({ course: courseId, author: userId });
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      if (content !== undefined) {
        existingReview.content = content;
      }
      await existingReview.save();
    } else {
      // Create new review
      const review = new Review({
        course: courseId,
        author: userId,
        rating,
        content: content || '',
      });
      await review.save();
    }

    // Recalculate course average rating and review count
    const allReviews = await Review.find({ course: courseId }).select('rating');
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    const reviewCount = allReviews.length;

    await Course.findByIdAndUpdate(courseId, {
      averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
      reviewCount,
    });

    // Fetch the updated review with author info
    const updatedReview = await Review.findOne({ course: courseId, author: userId })
      .populate('author', 'name username avatar googleGmailPhoto')
      .lean();

    res.status(existingReview ? 200 : 201).json({
      message: existingReview ? 'Review updated successfully' : 'Review created successfully',
      review: updatedReview,
    });
  } catch (error: any) {
    console.error(`[Course Routes] ❌ Error creating/updating review:`, error);
    if (error.code === 11000) {
      // Duplicate key error (shouldn't happen with our logic, but handle it)
      res.status(400).json({ message: 'You have already reviewed this course' });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to create review', error: errorMessage });
  }
});

// Helper function to calculate subscription price based on plan
function calculateSubscriptionPrice(
  basePrice: number,
  plan: SubscriptionPlan,
  currency: string = 'INR'
): { amount: number; currency: string; expiresAt: Date } {
  let amount = 0;
  let expiresAt = new Date();

  if (basePrice === 0) {
    // Free course
    return { amount: 0, currency, expiresAt: new Date('2099-12-31') }; // Never expires for free courses
  }

  switch (plan) {
    case 'monthly':
      amount = basePrice;
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    case 'quarterly':
      // Apply 10% discount for quarterly
      amount = Math.round(basePrice * 3 * 0.9);
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      break;
    case 'annual':
      // Apply 20% discount for annual
      amount = Math.round(basePrice * 12 * 0.8);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      break;
  }

  return { amount, currency, expiresAt };
}

// Subscribe to course with plan selection (Student)
router.post('/:id/subscribe', authenticate, async (req: Request<{ id: string }, {}, { plan: SubscriptionPlan }>, res: Response): Promise<void> => {
  try {
    const { plan } = req.body;
    const courseId = req.params.id;

    // Validate plan
    if (!plan || !['monthly', 'quarterly', 'annual'].includes(plan)) {
      res.status(400).json({ message: 'Invalid plan. Must be monthly, quarterly, or annual' });
      return;
    }

    const course = await Course.findOne({
      _id: courseId,
      isPublished: true,
    });

    if (!course) {
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }

    const student = await Student.findById(req.user!._id);
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = student.coursesEnrolledIn.find(
      (e) => e.courseId.toString() === course._id.toString()
    );

    // Calculate subscription price
    const basePrice = course.isFree ? 0 : (course.price || 0);
    const { amount, currency, expiresAt } = calculateSubscriptionPrice(
      basePrice,
      plan,
      course.currency || 'INR'
    );

    // If free course, enroll directly
    if (basePrice === 0) {
      if (existingEnrollment) {
        // Update existing enrollment with plan
        existingEnrollment.plan = plan;
        existingEnrollment.subscriptionAmount = 0;
        existingEnrollment.subscriptionCurrency = currency;
        existingEnrollment.subscriptionExpiresAt = expiresAt;
        await student.save();
        res.json({ message: 'Subscription updated', enrollment: existingEnrollment, orderId: null, amount: 0 });
        return;
      }

      // Enroll student with plan
      await student.enrollInCourse(
        course._id,
        'inprogress',
        plan,
        0,
        currency,
        expiresAt
      );

      // Increment course enrollment count
      course.enrollmentsCount += 1;
      await course.save();

      res.json({ message: 'Successfully enrolled in free course', enrollment: { plan, amount: 0 }, orderId: null, amount: 0 });
      return;
    }

    // For paid courses, return payment details for Razorpay/Stripe
    // In production, you would create an order here and return orderId
    // For now, we'll return the amount and a mock orderId
    const orderId = `order_${Date.now()}_${course._id.toString().slice(-6)}`;

    res.json({
      message: 'Payment initialization',
      orderId,
      amount: amount * 100, // Convert to paise for Razorpay
      currency,
      plan,
      course: {
        id: course._id,
        title: course.title,
      },
    });
  } catch (error) {
    console.error('Subscribe course error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to initialize subscription', error: errorMessage });
  }
});

// Verify payment and complete enrollment (Student)
router.post('/:id/verify-payment', authenticate, async (
  req: Request<{ id: string }, {}, { 
    orderId: string; 
    paymentId: string; 
    signature: string;
    plan: SubscriptionPlan;
  }>, 
  res: Response
): Promise<void> => {
  try {
    const { orderId, paymentId, signature, plan } = req.body;
    const courseId = req.params.id;

    if (!orderId || !paymentId || !signature || !plan) {
      res.status(400).json({ message: 'Missing required payment verification fields' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const student = await Student.findById(req.user!._id);
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // TODO: Verify Razorpay signature in production
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.RAZORPAY_SECRET)
    //   .update(orderId + '|' + paymentId)
    //   .digest('hex');
    // if (expectedSignature !== signature) {
    //   res.status(400).json({ message: 'Invalid payment signature' });
    //   return;
    // }

    // Calculate subscription details
    const basePrice = course.isFree ? 0 : (course.price || 0);
    const { amount, currency, expiresAt } = calculateSubscriptionPrice(
      basePrice,
      plan,
      course.currency || 'INR'
    );

    // Check if already enrolled
    const existingEnrollment = student.coursesEnrolledIn.find(
      (e) => e.courseId.toString() === course._id.toString()
    );

    if (existingEnrollment) {
      // Update existing enrollment
      existingEnrollment.plan = plan;
      existingEnrollment.subscriptionAmount = amount;
      existingEnrollment.subscriptionCurrency = currency;
      existingEnrollment.subscriptionExpiresAt = expiresAt;
      existingEnrollment.status = 'inprogress';
      await student.save();
    } else {
      // Create new enrollment
      await student.enrollInCourse(
        course._id,
        'inprogress',
        plan,
        amount,
        currency,
        expiresAt
      );

      // Increment course enrollment count
      course.enrollmentsCount += 1;
      await course.save();
    }

    res.json({
      message: 'Payment verified and enrollment completed',
      enrollment: {
        plan,
        amount,
        currency,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to verify payment', error: errorMessage });
  }
});

// Enroll in course (Student) - for free courses or direct enrollment
router.post('/:id/enroll', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      isPublished: true,
    });

    if (!course) {
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }

    const student = await Student.findById(req.user!._id);
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = student.coursesEnrolledIn.find(
      (e) => e.courseId.toString() === course._id.toString()
    );

    if (existingEnrollment) {
      res.json({ message: 'Already enrolled in this course', enrollment: existingEnrollment });
      return;
    }

    // Enroll student (for free courses or direct enrollment without plan)
    await student.enrollInCourse(course._id, 'inprogress');

    // Increment course enrollment count
    course.enrollmentsCount += 1;
    await course.save();

    res.json({ message: 'Successfully enrolled in course', course });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to enroll in course', error: errorMessage });
  }
});

// Update course progress (Student)
router.patch(
  '/:id/progress',
  authenticate,
  async (req: Request<{ id: string }, {}, { progress?: number; videoId?: string }>, res: Response): Promise<void> => {
    try {
      const { progress, videoId } = req.body;
      const courseId = req.params.id;

      if (progress === undefined || progress < 0 || progress > 100) {
        res.status(400).json({ message: 'Progress must be between 0 and 100' });
        return;
      }

      const student = await Student.findById(req.user!._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      // Update progress
      await student.updateCourseProgress(new mongoose.Types.ObjectId(courseId), progress);

      // If progress is 100, mark as completed
      if (progress >= 100) {
        const enrollment = student.coursesEnrolledIn.find(
          (e) => e.courseId.toString() === courseId
        );
        if (enrollment && enrollment.status === 'inprogress') {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
          await student.save();
        }
      }

      res.json({ message: 'Progress updated successfully', progress });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to update progress', error: errorMessage });
    }
  }
);

// Get enrolled courses (Student)
router.get('/enrolled/list', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.user!._id)
      .populate('coursesEnrolledIn.courseId');

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const enrolledCourses = student.coursesEnrolledIn.map((enrollment) => {
      const course = enrollment.courseId as any;
      return {
        ...course.toObject(),
        enrollment: {
          status: enrollment.status,
          progress: enrollment.progress,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          plan: enrollment.plan,
          subscriptionAmount: enrollment.subscriptionAmount,
          subscriptionCurrency: enrollment.subscriptionCurrency,
          subscriptionExpiresAt: enrollment.subscriptionExpiresAt,
        },
      };
    });

    res.json({ courses: enrolledCourses });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch enrolled courses', error: errorMessage });
  }
});

// Save notes for a video in a course (Student)
router.post(
  '/:id/videos/:videoId/notes',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    const videoId = req.params.videoId;
    const { notes } = req.body;

    console.log(`[Course Routes] Save notes request:`, {
      courseId,
      videoId,
      userId: req.user?._id,
      notesLength: notes?.length || 0
    });

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      const student = await Student.findById(req.user!._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      // Check if student is enrolled
      const enrollment = student.coursesEnrolledIn.find(
        (e) => e.courseId.toString() === courseId
      );

      if (!enrollment) {
        res.status(403).json({ message: 'You must be enrolled in this course to save notes' });
        return;
      }

      // Initialize videoNotes array if it doesn't exist
      if (!enrollment.videoNotes) {
        enrollment.videoNotes = [];
      }

      // Find existing note for this video
      const existingNoteIndex = enrollment.videoNotes.findIndex(
        (note) => note.videoId === videoId
      );

      const noteData = {
        videoId,
        notes: notes || '',
        updatedAt: new Date(),
      };

      if (existingNoteIndex >= 0) {
        // Update existing note
        enrollment.videoNotes[existingNoteIndex] = noteData;
        console.log(`[Course Routes] Updated existing note for video: ${videoId}`);
      } else {
        // Add new note
        enrollment.videoNotes.push(noteData);
        console.log(`[Course Routes] Created new note for video: ${videoId}`);
      }

      await student.save();

      res.json({
        message: 'Notes saved successfully',
        note: noteData,
      });
    } catch (error) {
      console.error('[Course Routes] ❌ Failed to save notes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to save notes', error: errorMessage });
    }
  }
);

// Get notes for a video in a course (Student)
router.get(
  '/:id/videos/:videoId/notes',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    const videoId = req.params.videoId;

    console.log(`[Course Routes] Get notes request:`, {
      courseId,
      videoId,
      userId: req.user?._id
    });

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      const student = await Student.findById(req.user!._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      // Check if student is enrolled
      const enrollment = student.coursesEnrolledIn.find(
        (e) => e.courseId.toString() === courseId
      );

      if (!enrollment) {
        res.status(403).json({ message: 'You must be enrolled in this course to view notes' });
        return;
      }

      // Find note for this video
      const note = enrollment.videoNotes?.find((n) => n.videoId === videoId);

      res.json({
        notes: note?.notes || '',
        updatedAt: note?.updatedAt || null,
      });
    } catch (error) {
      console.error('[Course Routes] ❌ Failed to get notes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to get notes', error: errorMessage });
    }
  }
);

// Mark video as complete (Student)
router.post(
  '/:id/videos/:videoId/complete',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    const videoId = req.params.videoId;

    console.log(`[Course Routes] Mark video complete:`, {
      courseId,
      videoId,
      userId: req.user?._id
    });

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      const student = await Student.findById(req.user!._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      // Check if student is enrolled
      const enrollment = student.coursesEnrolledIn.find(
        (e) => e.courseId.toString() === courseId
      );

      if (!enrollment) {
        res.status(403).json({ message: 'You must be enrolled in this course' });
        return;
      }

      // Initialize completedVideos array if it doesn't exist
      if (!enrollment.completedVideos) {
        enrollment.completedVideos = [];
      }

      // Check if video is already completed
      const alreadyCompleted = enrollment.completedVideos.some(
        (v) => v.videoId === videoId
      );

      if (!alreadyCompleted) {
        // Add to completed videos
        enrollment.completedVideos.push({
          videoId,
          completedAt: new Date(),
        });
        console.log(`[Course Routes] Marked video ${videoId} as complete`);
      }

      // Calculate progress based on completed videos
      const totalVideos = course.videoCount || course.videos?.length || 1;
      const completedCount = enrollment.completedVideos.length;
      const newProgress = Math.min(100, Math.round((completedCount / totalVideos) * 100));

      enrollment.progress = newProgress;
      console.log(`[Course Routes] Updated progress: ${newProgress}% (${completedCount}/${totalVideos} videos)`);

      // Check if course is completed
      let courseCompleted = false;
      if (newProgress >= 100 && enrollment.status === 'inprogress') {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
        courseCompleted = true;
        console.log(`[Course Routes] Course marked as completed`);
      }

      await student.save();

      res.json({
        message: 'Video marked as complete',
        progress: newProgress,
        completedVideos: completedCount,
        totalVideos: totalVideos,
        courseCompleted: courseCompleted,
      });
    } catch (error) {
      console.error('[Course Routes] ❌ Failed to mark video as complete:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to mark video as complete', error: errorMessage });
    }
  }
);

// Legacy endpoint for lessons (redirects to videos endpoint)
router.post(
  '/:id/lessons/:lessonId/complete',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    // Redirect to videos endpoint
    req.params.videoId = req.params.lessonId;
    // Call the videos endpoint handler
    const courseId = req.params.id;
    const videoId = req.params.videoId;

    console.log(`[Course Routes] Legacy lesson complete endpoint, redirecting to video:`, {
      courseId,
      videoId,
      userId: req.user?._id
    });

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      const student = await Student.findById(req.user!._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      const enrollment = student.coursesEnrolledIn.find(
        (e) => e.courseId.toString() === courseId
      );

      if (!enrollment) {
        res.status(403).json({ message: 'You must be enrolled in this course' });
        return;
      }

      if (!enrollment.completedVideos) {
        enrollment.completedVideos = [];
      }

      const alreadyCompleted = enrollment.completedVideos.some(
        (v) => v.videoId === videoId
      );

      if (!alreadyCompleted) {
        enrollment.completedVideos.push({
          videoId,
          completedAt: new Date(),
        });
      }

      const totalVideos = course.videoCount || course.videos?.length || 1;
      const completedCount = enrollment.completedVideos.length;
      const newProgress = Math.min(100, Math.round((completedCount / totalVideos) * 100));

      enrollment.progress = newProgress;

      let courseCompleted = false;
      if (newProgress >= 100 && enrollment.status === 'inprogress') {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
        courseCompleted = true;
      }

      await student.save();

      res.json({
        message: 'Video marked as complete',
        progress: newProgress,
        completedVideos: completedCount,
        totalVideos: totalVideos,
        courseCompleted: courseCompleted,
      });
    } catch (error) {
      console.error('[Course Routes] ❌ Failed to mark video as complete:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to mark video as complete', error: errorMessage });
    }
  }
);

export default router;
