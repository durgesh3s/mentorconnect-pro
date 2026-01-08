import express, { Request, Response } from 'express';
import { Student } from '../models/Student.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { EducationLevel } from '../types/index.js';

const router = express.Router();

interface StudentsQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  education?: EducationLevel;
  location?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UpdateStudentRequestBody {
  name?: string;
  description?: string;
  phone?: string;
  education?: EducationLevel;
  location?: string;
  fieldsOfInterest?: string[];
  bio?: string;
  avatar?: string;
  skills?: string[];
  isProfileComplete?: boolean;
  // role is removed - role can only be set automatically based on email
}

interface StudentQuery {
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
  education?: EducationLevel;
  location?: { $regex: string; $options: string };
  'coursesEnrolledIn.0'?: { $exists: boolean };
  'coursesEnrolledIn.status'?: string;
}

// Apply authentication and admin check to all routes
router.use(authenticate);
router.use(isAdmin);

// Get all students with pagination and filters
router.get('/students', async (req: Request<{}, {}, {}, StudentsQueryParams>, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      status,
      education,
      location,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: StudentQuery = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    // Education filter
    if (education) {
      query.education = education;
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Status filter (based on course enrollment status)
    if (status) {
      if (status === 'enrolled') {
        query['coursesEnrolledIn.0'] = { $exists: true };
      } else if (status === 'in_progress') {
        query['coursesEnrolledIn.status'] = 'inprogress';
      } else if (status === 'completed') {
        query['coursesEnrolledIn.status'] = 'completed';
      } else if (status === 'failed') {
        query['coursesEnrolledIn.status'] = 'failed';
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const sort: { [key: string]: 1 | -1 } = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('-__v -followers -following -tagged')
        .populate('coursesEnrolledIn.courseId', 'title')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Student.countDocuments(query),
    ]);

    // Calculate average progress for each student
    const studentsWithProgress = students.map((student: any) => {
      const courses = student.coursesEnrolledIn || [];
      const totalProgress =
        courses.reduce((sum: number, course: any) => sum + (course.progress || 0), 0) / courses.length || 0;

      return {
        id: student._id.toString(),
        name: student.name,
        username: student.username,
        email: student.email,
        avatar: student.avatar || student.googleGmailPhoto || undefined,
        description: student.description,
        phone: student.phone,
        education: student.education,
        location: student.location,
        fieldsOfInterest: student.fieldsOfInterest,
        enrolledCourses: courses,
        averageProgress: Math.round(totalProgress),
        status: courses.length > 0 ? courses[0].status : 'enrolled',
        isProfileComplete: student.isProfileComplete,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      };
    });

    res.json({
      students: studentsWithProgress,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Admin get students error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch students', error: errorMessage });
  }
});

// Get single student details
router.get('/students/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('followers', 'username name avatar email')
      .populate('following', 'username name avatar email')
      .populate('coursesEnrolledIn.courseId', 'title description')
      .populate('tagged.postId', 'title content tagType')
      .select('-__v');

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch student', error: errorMessage });
  }
});

// Update student (admin)
router.patch('/students/:id', async (req: Request<{ id: string }, {}, UpdateStudentRequestBody>, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const allowedUpdates: (keyof UpdateStudentRequestBody)[] = [
      'name',
      'description',
      'phone',
      'education',
      'location',
      'fieldsOfInterest',
      'bio',
      'avatar',
      'skills',
      'isProfileComplete',
      // 'role' is removed - role can only be set automatically based on email
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'fieldsOfInterest') {
          student.fieldsOfInterest = (req.body[field] as string[]).map((field) =>
            field.startsWith('#') ? field : `#${field}`
          );
        } else {
          (student as any)[field] = req.body[field];
        }
      }
    });

    // Ensure role is always set correctly based on email
    const ADMIN_EMAIL = 'durgesh.singh.sde@gmail.com';
    student.role = student.email === ADMIN_EMAIL ? 'admin' : 'student';

    await student.save();

    res.json(student);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to update student', error: errorMessage });
  }
});

// Delete student
router.delete('/students/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    // Remove student from followers/following lists
    await Student.updateMany(
      { $or: [{ followers: student._id }, { following: student._id }] },
      {
        $pull: { followers: student._id, following: student._id },
      }
    );

    await student.deleteOne();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to delete student', error: errorMessage });
  }
});

// Get student statistics
router.get('/students/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalStudents,
      completedProfiles,
      enrolledStudents,
      educationStats,
      locationStats,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isProfileComplete: true }),
      Student.countDocuments({ 'coursesEnrolledIn.0': { $exists: true } }),
      Student.aggregate([
        {
          $group: {
            _id: '$education',
            count: { $sum: 1 },
          },
        },
      ]),
      Student.aggregate([
        {
          $group: {
            _id: '$location',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      totalStudents,
      completedProfiles,
      enrolledStudents,
      educationStats,
      topLocations: locationStats,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch statistics', error: errorMessage });
  }
});

export default router;

