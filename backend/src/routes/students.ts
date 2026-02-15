import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Student } from '../models/Student.js';
import { Course } from '../models/Course.js';
import Thread from '../models/Thread.js';
import { authenticate } from '../middleware/auth.js';
import { EducationLevel } from '../types/index.js';

const router = express.Router();

interface UpdateProfileRequestBody {
  name?: string;
  description?: string;
  phone?: string;
  education?: EducationLevel;
  location?: string;
  fieldsOfInterest?: string[];
  avatar?: string;
  skills?: string[];
  socialLinks?: Record<string, string>;
}

// Get student profile
router.get('/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const student = await Student.findById(req.user._id)
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar')
      // Note: Course model not yet implemented, so courseId will be returned as ObjectId
      // .populate('coursesEnrolledIn.courseId', 'title description')
      // .populate('tagged.postId', 'title content')
      .select('-__v');

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // Convert Map to object for JSON response
    const studentResponse: any = student.toObject();
    if (studentResponse.socialLinks instanceof Map) {
      studentResponse.socialLinks = Object.fromEntries(studentResponse.socialLinks) as Record<string, string>;
    }

    res.json(studentResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch profile', error: errorMessage });
  }
});

// Update student profile
router.patch(
  '/profile',
  authenticate,
  [
    body('name').optional().isLength({ min: 2, max: 100 }),
    body('description').optional().isLength({ min: 10 }),
    body('phone')
      .optional()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/),
    body('education').optional().isIn(['high', 'secondary', 'graduation']),
    body('location').optional().notEmpty(),
    body('fieldsOfInterest').optional().isArray(),
  ],
  async (req: Request<{}, {}, UpdateProfileRequestBody>, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const student = await Student.findById(req.user._id);
      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      const allowedUpdates: (keyof UpdateProfileRequestBody)[] = [
        'name',
        'description',
        'phone',
        'education',
        'location',
        'fieldsOfInterest',
        'avatar',
        'skills',
        'socialLinks',
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field === 'fieldsOfInterest') {
            student.fieldsOfInterest = (req.body[field] as string[]).map((field) =>
              field.startsWith('#') ? field : `#${field}`
            );
          } else if (field === 'socialLinks') {
            student.socialLinks = new Map(Object.entries(req.body[field] as Record<string, string>));
          } else {
            (student as any)[field] = req.body[field];
          }
        }
      });

      await student.save();

      // Convert Map to object for JSON response
      const studentResponse: any = student.toObject();
      if (studentResponse.socialLinks instanceof Map) {
        studentResponse.socialLinks = Object.fromEntries(studentResponse.socialLinks) as Record<string, string>;
      }

      res.json(studentResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to update profile', error: errorMessage });
    }
  }
);

// Search students
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit = '20', page = '1' } = req.query;
    const searchQuery = (q as string) || '';

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // If query is empty, return all students with pagination
    let searchFilter: any = {};
    if (searchQuery.trim()) {
      // Search by username, name, or email (case-insensitive)
      const searchRegex = new RegExp(searchQuery.trim(), 'i');
      searchFilter = {
        $or: [
          { username: searchRegex },
          { name: searchRegex },
          { email: searchRegex },
        ],
      };
    }

    const [students, total] = await Promise.all([
      Student.find(searchFilter)
        .select('username name avatar googleGmailPhoto description location education fieldsOfInterest')
        .limit(limitNum)
        .skip(skip)
        .lean(),
      Student.countDocuments(searchFilter),
    ]);

    // Convert socialLinks Map to object if needed
    const studentsResponse = students.map((student: any) => {
      if (student.socialLinks instanceof Map) {
        student.socialLinks = Object.fromEntries(student.socialLinks);
      }
      return student;
    });

    res.json({
      students: studentsResponse,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to search students', error: errorMessage });
  }
});

// Get followers list
router.get('/:username/followers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const { limit = '50', page = '1' } = req.query;

    const student = await Student.findOne({ username }).select('followers');

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const followerIds = student.followers.slice(skip, skip + limitNum);
    const followers = await Student.find({ _id: { $in: followerIds } })
      .select('username name avatar googleGmailPhoto description location education fieldsOfInterest')
      .lean();

    // Convert socialLinks Map to object if needed
    const followersResponse = followers.map((follower: any) => {
      if (follower.socialLinks instanceof Map) {
        follower.socialLinks = Object.fromEntries(follower.socialLinks);
      }
      return follower;
    });

    res.json({
      followers: followersResponse,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: student.followers.length,
        pages: Math.ceil(student.followers.length / limitNum),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch followers', error: errorMessage });
  }
});

// Get following list
router.get('/:username/following', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const { limit = '50', page = '1' } = req.query;

    const student = await Student.findOne({ username }).select('following');

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const followingIds = student.following.slice(skip, skip + limitNum);
    const following = await Student.find({ _id: { $in: followingIds } })
      .select('username name avatar googleGmailPhoto description location education fieldsOfInterest')
      .lean();

    // Convert socialLinks Map to object if needed
    const followingResponse = following.map((followed: any) => {
      if (followed.socialLinks instanceof Map) {
        followed.socialLinks = Object.fromEntries(followed.socialLinks);
      }
      return followed;
    });

    res.json({
      following: followingResponse,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: student.following.length,
        pages: Math.ceil(student.following.length / limitNum),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch following', error: errorMessage });
  }
});

// Follow/Unfollow student
router.post('/follow/:studentId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = req.user;
    const { studentId } = req.params;
    const currentStudent = await Student.findById(user._id);
    // Need to include 'followers' field so we can modify it
    const targetStudent = await Student.findById(studentId);

    if (!currentStudent || !targetStudent) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    if (studentId === user._id.toString()) {
      res.status(400).json({ message: 'Cannot follow yourself' });
      return;
    }

    const isFollowing = currentStudent.following.some(
      (id: mongoose.Types.ObjectId) => id.toString() === studentId
    );

    const targetObjectId = new mongoose.Types.ObjectId(studentId);
    const currentUserObjectId = user._id;

    if (isFollowing) {
      // Unfollow - use $pull to remove from arrays without triggering full document validation
      await Promise.all([
        Student.updateOne(
          { _id: currentUserObjectId },
          { $pull: { following: targetObjectId } }
        ),
        Student.updateOne(
          { _id: targetObjectId },
          { $pull: { followers: currentUserObjectId } }
        ),
      ]);
    } else {
      // Follow - use $addToSet to add to arrays (prevents duplicates)
      await Promise.all([
        Student.updateOne(
          { _id: currentUserObjectId },
          { $addToSet: { following: targetObjectId } }
        ),
        Student.updateOne(
          { _id: targetObjectId },
          { $addToSet: { followers: currentUserObjectId } }
        ),
      ]);
    }

    // Fetch updated target student for response
    const updatedTarget = await Student.findById(studentId)
      .select('username name avatar googleGmailPhoto followers')
      .lean();

    if (!updatedTarget) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // Prepare response with only the fields we need
    const targetResponse: any = {
      _id: updatedTarget._id,
      id: updatedTarget._id.toString(),
      username: updatedTarget.username,
      name: updatedTarget.name,
      avatar: updatedTarget.avatar,
      googleGmailPhoto: updatedTarget.googleGmailPhoto,
    };
    if (updatedTarget.socialLinks instanceof Map) {
      targetResponse.socialLinks = Object.fromEntries(updatedTarget.socialLinks);
    }

    // Emit Socket.io events for real-time updates
    const { emitToUser, emitToAll } = await import('../utils/socket.js');
    emitToUser(user._id.toString(), 'follow:updated', {
      targetUserId: studentId,
      following: !isFollowing,
      followerCount: updatedTarget.followers?.length || 0,
      user: targetResponse,
    });
    emitToUser(studentId, 'follower:updated', {
      followerId: user._id.toString(),
      followerCount: updatedTarget.followers?.length || 0,
      isFollowing: !isFollowing,
    });

    res.json({
      following: !isFollowing,
      followerCount: updatedTarget.followers?.length || 0,
      user: targetResponse,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to update follow status', error: errorMessage });
  }
});

// Helper function for optional authentication
const getOptionalUser = async (req: Request): Promise<mongoose.Types.ObjectId | undefined> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return undefined;

    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);
    if (decoded?.id) {
      return new mongoose.Types.ObjectId(decoded.id);
    }
  } catch {
    // Not authenticated or invalid token, return undefined
  }
  return undefined;
};

// Get student by username
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    
    // Get current user ID if authenticated (optional)
    const currentUserId = await getOptionalUser(req);

    // Find student with optimized query
    const student = await Student.findOne({ username })
      .select('-__v -email -phone -googleId')
      .lean();

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // Check if viewing own profile
    const isOwnProfile = currentUserId && student._id.toString() === currentUserId.toString();

    // Get followers and following counts and previews (more efficient than populating all)
    const followersArray = student.followers || [];
    const followingArray = student.following || [];
    
    const [followers, following] = await Promise.all([
      // Get limited followers for preview (first 6)
      followersArray.length > 0
        ? Student.find({ _id: { $in: followersArray.slice(0, 6) } })
            .select('username name avatar googleGmailPhoto')
            .lean()
        : Promise.resolve([]),
      // Get limited following for preview (first 6)
      followingArray.length > 0
        ? Student.find({ _id: { $in: followingArray.slice(0, 6) } })
            .select('username name avatar googleGmailPhoto')
            .lean()
        : Promise.resolve([]),
    ]);
    
    const followersCount = followersArray.length;
    const followingCount = followingArray.length;

    // Populate courses with course details (only if there are enrollments)
    let enrichedCourses = student.coursesEnrolledIn || [];
    if (enrichedCourses.length > 0) {
      const courseIds = enrichedCourses
        .map((enrollment: any) => {
          if (!enrollment.courseId) return null;
          return enrollment.courseId instanceof mongoose.Types.ObjectId 
            ? enrollment.courseId 
            : new mongoose.Types.ObjectId(enrollment.courseId);
        })
        .filter((id: any) => id !== null);

      if (courseIds.length > 0) {
        const courses = await Course.find({ _id: { $in: courseIds } })
          .select('title description thumbnail category level isFree')
          .lean();

        // Create course map for quick lookup
        const courseMap = new Map(courses.map(course => [course._id.toString(), course]));

        // Enhance coursesEnrolledIn with course details
        enrichedCourses = enrichedCourses.map((enrollment: any) => {
          const courseId = enrollment.courseId instanceof mongoose.Types.ObjectId
            ? enrollment.courseId.toString()
            : enrollment.courseId?.toString();
          const course = courseMap.get(courseId);
          
          return {
            ...enrollment,
            course: course ? {
              _id: course._id,
              title: course.title,
              description: course.description,
              thumbnail: course.thumbnail,
              category: course.category,
              level: course.level,
              isFree: course.isFree,
            } : null,
          };
        });
      }
    }

    // Check if current user is following this profile
    let isFollowing = false;
    if (currentUserId && !isOwnProfile) {
      const currentUser = await Student.findById(currentUserId)
        .select('following')
        .lean();
      isFollowing = currentUser?.following?.some(
        (id: mongoose.Types.ObjectId) => id.toString() === student._id.toString()
      ) || false;
    }

    // Fetch threads for this user
    const userThreads = await Thread.find({ author: student._id })
      .populate({
        path: 'author',
        select: 'username name avatar googleGmailPhoto',
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Format threads for response
    const formattedThreads = userThreads.map((thread: any) => {
      // Check if current user has liked this thread
      const liked = currentUserId && thread.likes && thread.likes.some(
        (likeId: mongoose.Types.ObjectId | string) => {
          const likeIdStr = typeof likeId === 'string' ? likeId : likeId.toString();
          return likeIdStr === currentUserId.toString();
        }
      );

      // Check if current user has shared this thread
      const sharesArray = Array.isArray(thread.shares) ? thread.shares : [];
      const shared = currentUserId && sharesArray.length > 0 && sharesArray.some(
        (shareId: mongoose.Types.ObjectId | string) => {
          const shareIdStr = typeof shareId === 'string' ? shareId : shareId.toString();
          return shareIdStr === currentUserId.toString();
        }
      );

      return {
        id: thread._id.toString(),
        author: {
          id: thread.author?._id?.toString() || '',
          username: thread.author?.username || '',
          name: thread.author?.name || thread.author?.username || '',
          avatar: thread.author?.avatar || null,
          googleGmailPhoto: thread.author?.googleGmailPhoto || null,
        },
        content: thread.content,
        images: thread.images || [],
        likes: thread.likes ? thread.likes.length : 0,
        comments: thread.comments ? thread.comments.length : 0,
        shares: sharesArray.length || (thread.shares || 0),
        liked: liked || false,
        shared: shared || false,
        createdAt: thread.createdAt.toISOString(),
      };
    });

    // Convert Map to object for JSON response
    const studentResponse: any = {
      ...student,
      followersCount,
      followingCount,
      followers: followers.map((f: any) => ({
        _id: f._id,
        username: f.username,
        name: f.name,
        avatar: f.avatar || f.googleGmailPhoto,
      })),
      following: following.map((f: any) => ({
        _id: f._id,
        username: f.username,
        name: f.name,
        avatar: f.avatar || f.googleGmailPhoto,
      })),
      coursesEnrolledIn: enrichedCourses,
      threads: formattedThreads,
      isFollowing: isOwnProfile ? undefined : isFollowing,
      isOwnProfile,
    };

    if (student.socialLinks instanceof Map) {
      studentResponse.socialLinks = Object.fromEntries(student.socialLinks);
    } else if (student.socialLinks) {
      studentResponse.socialLinks = student.socialLinks;
    }

    // Generate ETag for caching
    const responseString = JSON.stringify(studentResponse);
    const etag = crypto.createHash('md5').update(responseString).digest('hex');
    
    // Check if client has cached version
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === `"${etag}"`) {
      res.status(304).end();
      return;
    }

    // Set ETag header
    res.set('ETag', `"${etag}"`);
    res.set('Cache-Control', 'private, max-age=60'); // Cache for 60 seconds

    res.json(studentResponse);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific MongoDB errors
    if (error instanceof mongoose.Error.CastError) {
      res.status(400).json({ message: 'Invalid username format', error: errorMessage });
      return;
    }
    
    res.status(500).json({ message: 'Failed to fetch student profile', error: errorMessage });
  }
});

export default router;

