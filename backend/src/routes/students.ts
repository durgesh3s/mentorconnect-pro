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

    if (isFollowing) {
      // Unfollow
      currentStudent.following = currentStudent.following.filter(
        (id: mongoose.Types.ObjectId) => id.toString() !== studentId
      );
      targetStudent.followers = targetStudent.followers.filter(
        (id: mongoose.Types.ObjectId) => id.toString() !== user._id.toString()
      );
    } else {
      // Follow
      currentStudent.following.push(studentId as any);
      targetStudent.followers.push(user._id);
    }

    await Promise.all([currentStudent.save(), targetStudent.save()]);

    res.json({ following: !isFollowing, followerCount: targetStudent.followers.length });
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

