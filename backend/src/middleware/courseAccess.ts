import { Request, Response, NextFunction } from 'express';
import { Student } from '../models/Student.js';
import { Course } from '../models/Course.js';

/**
 * Middleware to validate course access and expiration
 * This ensures that:
 * 1. Student is enrolled in the course
 * 2. Course subscription hasn't expired (if applicable)
 * 3. Access cannot be bypassed by client-side manipulation
 */
export const validateCourseAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courseId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Check if course is published
    if (!course.isPublished && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Course is not available' });
      return;
    }

    // Find student enrollment
    const student = await Student.findById(userId);
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const enrollment = student.coursesEnrolledIn.find(
      (e) => e.courseId.toString() === courseId
    );

    // Admin can always access
    if (req.user?.role === 'admin') {
      next();
      return;
    }

    // Check if enrolled
    if (!enrollment) {
      res.status(403).json({ 
        message: 'You must be enrolled in this course to access it',
        requiresEnrollment: true 
      });
      return;
    }

    // Check expiration - CRITICAL SECURITY CHECK
    // Free courses never expire
    if (course.isFree) {
      next();
      return;
    }

    // For paid courses, check subscription expiration
    if (enrollment.subscriptionExpiresAt) {
      const now = new Date();
      const expirationDate = new Date(enrollment.subscriptionExpiresAt);

      // Add a small buffer (1 minute) to account for clock skew
      if (now > expirationDate) {
        res.status(403).json({
          message: 'Your course subscription has expired. Please renew to continue accessing the course.',
          expired: true,
          expiredAt: enrollment.subscriptionExpiresAt,
        });
        return;
      }
    } else {
      // If it's a paid course but no expiration date is set, deny access
      // This should not happen in normal flow, but we check for security
      res.status(403).json({
        message: 'Invalid course access. Please contact support.',
        requiresEnrollment: true,
      });
      return;
    }

    // All checks passed
    next();
  } catch (error) {
    console.error('[Course Access Middleware] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to validate course access', error: errorMessage });
  }
};

/**
 * Middleware to check if course is completed
 * Used for assessment access validation
 */
export const validateCourseCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courseId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const student = await Student.findById(userId);
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

    if (enrollment.status !== 'completed') {
      res.status(403).json({ 
        message: 'You must complete the course before taking the assessment',
        courseCompleted: false 
      });
      return;
    }

    if (!enrollment.completedAt) {
      res.status(403).json({ message: 'Course completion date not found' });
      return;
    }

    // Check if assessment window is still open (24 hours from completion)
    const completionDate = new Date(enrollment.completedAt);
    const now = new Date();
    const hoursSinceCompletion = (now.getTime() - completionDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCompletion > 24) {
      res.status(403).json({
        message: 'Assessment window has expired. You can only take the assessment within 24 hours of course completion.',
        windowExpired: true,
        completedAt: enrollment.completedAt,
        hoursSinceCompletion: Math.round(hoursSinceCompletion * 100) / 100,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[Course Completion Middleware] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to validate course completion', error: errorMessage });
  }
};
