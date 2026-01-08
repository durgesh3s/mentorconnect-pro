import express, { Request, Response } from 'express';
import { Student } from '../models/Student.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get student dashboard data
router.get('/student', authenticate, async (req: Request, res: Response): Promise<void> => {
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

    // Format enrolled courses for frontend
    // Since Course model doesn't exist yet, we'll return the courseId as is
    const enrolledCourses = studentResponse.coursesEnrolledIn || [];

    res.json({
      enrolledCourses: enrolledCourses.map((enrollment: any) => ({
        id: enrollment.courseId,
        courseId: enrollment.courseId,
        status: enrollment.status,
        progress: enrollment.progress || 0,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
      })),
      profile: studentResponse,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dashboard error:', errorMessage);
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: errorMessage });
  }
});

export default router;

