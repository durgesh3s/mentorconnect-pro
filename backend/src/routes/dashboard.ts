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
      .populate('followers', 'username name avatar googleGmailPhoto')
      .populate('following', 'username name avatar googleGmailPhoto')
      .populate({
        path: 'coursesEnrolledIn.courseId',
        select: 'title description thumbnail category level instructor createdBy youtubeType youtubeId videos',
        populate: {
          path: 'createdBy',
          select: 'name username avatar googleGmailPhoto'
        }
      })
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

    // Get filter parameter from query string
    const statusFilter = req.query.status as string | undefined;

    // Format enrolled courses for frontend with full course details
    let enrolledCourses = (studentResponse.coursesEnrolledIn || []).map((enrollment: any) => {
      const course = enrollment.courseId;
      if (!course) {
        return null;
      }

      // Get thumbnail URL (use course thumbnail or YouTube thumbnail)
      let thumbnail = course.thumbnail;
      if (!thumbnail) {
        if (course.youtubeType === 'video' && course.youtubeId) {
          thumbnail = `https://img.youtube.com/vi/${course.youtubeId}/hqdefault.jpg`;
        } else if (course.youtubeType === 'playlist' && course.videos && course.videos.length > 0) {
          thumbnail = `https://img.youtube.com/vi/${course.videos[0].videoId}/hqdefault.jpg`;
        }
      }

      return {
        id: course._id || course.id,
        courseId: course._id || course.id,
        title: course.title,
        description: course.description,
        thumbnail: thumbnail,
        category: course.category,
        level: course.level,
        instructor: {
          id: course.createdBy?._id || course.createdBy?.id,
          name: course.instructor || course.createdBy?.name || 'Unknown',
          avatar: course.createdBy?.avatar || course.createdBy?.googleGmailPhoto,
        },
        status: enrollment.status || 'inprogress',
        progress: enrollment.progress || 0,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
      };
    }).filter((course: any) => course !== null);

    // Filter courses by status if filter parameter is provided
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'enrolled') {
        // "Only Enrolled" shows courses with 'inprogress' status
        enrolledCourses = enrolledCourses.filter((course: any) => {
          const status = course.status || 'inprogress';
          return status === 'inprogress';
        });
      } else {
        // Filter by exact status match (inprogress, completed, failed)
        enrolledCourses = enrolledCourses.filter((course: any) => {
          const status = course.status || 'inprogress';
          return status === statusFilter;
        });
      }
    }

    res.json({
      enrolledCourses,
      profile: studentResponse,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dashboard error:', errorMessage);
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: errorMessage });
  }
});

export default router;

