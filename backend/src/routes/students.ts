import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
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

    // If query is empty, return empty results
    if (!searchQuery.trim()) {
      res.json({
        students: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          pages: 0,
        },
      });
      return;
    }

    // Search by username, name, or email (case-insensitive)
    const searchRegex = new RegExp(searchQuery.trim(), 'i');
    const searchFilter = {
      $or: [
        { username: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
      ],
    };

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

// Get student by username
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findOne({ username: req.params.username })
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar')
      // Note: Course model not yet implemented, so courseId will be returned as ObjectId
      // .populate('coursesEnrolledIn.courseId', 'title description')
      .select('-__v -email -phone');

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
    res.status(500).json({ message: 'Failed to fetch student', error: errorMessage });
  }
});

export default router;

