import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Assessment, ICustomField, IAssessmentSubmission } from '../models/Assessment.js';
import { Course } from '../models/Course.js';
import { Student } from '../models/Student.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validateCourseCompletion } from '../middleware/courseAccess.js';

const router = express.Router();

interface CreateAssessmentRequestBody {
  courseId: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit: number;
  customFields?: ICustomField[];
  isActive?: boolean;
}

interface UpdateAssessmentRequestBody extends Partial<CreateAssessmentRequestBody> {
  isActive?: boolean;
}

interface StartAssessmentResponse {
  assessmentId: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit: number;
  customFields: ICustomField[];
  startedAt: Date;
  expiresAt: Date;
}

interface SubmitAssessmentRequestBody {
  projectTitle?: string;
  projectDescription?: string;
  deployedLink?: string;
  githubLink?: string;
  customFields?: Record<string, any>;
}

// ==================== ADMIN ROUTES ====================

// Create assessment (Admin)
router.post(
  '/admin',
  authenticate,
  isAdmin,
  async (req: Request<{}, {}, CreateAssessmentRequestBody>, res: Response): Promise<void> => {
    try {
      const {
        courseId,
        title,
        description,
        instructions,
        timeLimit,
        customFields = [],
        isActive = true,
      } = req.body;

      // Validate required fields
      if (!courseId || !title) {
        res.status(400).json({ message: 'Course ID and title are required' });
        return;
      }

      // Validate course exists
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      // Validate time limit
      if (timeLimit < 300 || timeLimit > 604800) {
        res.status(400).json({ 
          message: 'Time limit must be between 300 seconds (5 minutes) and 604800 seconds (7 days)' 
        });
        return;
      }

      // Validate custom fields
      if (customFields && Array.isArray(customFields)) {
        for (let i = 0; i < customFields.length; i++) {
          const field = customFields[i];
          if (!field.label || !field.type) {
            res.status(400).json({ message: `Custom field ${i + 1} is invalid. Label and type are required.` });
            return;
          }
          if (!['text', 'textarea', 'url', 'number', 'email'].includes(field.type)) {
            res.status(400).json({ message: `Custom field ${i + 1} has invalid type` });
            return;
          }
        }
      }

      // Check if assessment already exists for this course
      const existingAssessment = await Assessment.findOne({ courseId, isActive: true });
      if (existingAssessment) {
        res.status(400).json({ 
          message: 'An active assessment already exists for this course. Please deactivate it first or update the existing one.' 
        });
        return;
      }

      const assessment = new Assessment({
        courseId,
        title,
        description,
        instructions,
        timeLimit,
        customFields: customFields || [],
        isActive,
        createdBy: req.user!._id,
      });

      await assessment.save();

      res.status(201).json({
        message: 'Assessment created successfully',
        assessment: {
          id: assessment._id,
          courseId: assessment.courseId,
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          timeLimit: assessment.timeLimit,
          customFields: assessment.customFields,
          isActive: assessment.isActive,
          createdAt: assessment.createdAt,
        },
      });
    } catch (error) {
      console.error('Create assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to create assessment', error: errorMessage });
    }
  }
);

// Get all assessments (Admin)
router.get(
  '/admin',
  authenticate,
  isAdmin,
  async (req: Request<{}, {}, {}, { courseId?: string; page?: string; limit?: string }>, res: Response): Promise<void> => {
    try {
      const { courseId, page = '1', limit = '20' } = req.query;

      const query: any = {};
      if (courseId) {
        query.courseId = courseId;
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [assessments, total] = await Promise.all([
        Assessment.find(query)
          .populate('courseId', 'title')
          .populate('createdBy', 'name username email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Assessment.countDocuments(query),
      ]);

      res.json({
        assessments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get assessments error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch assessments', error: errorMessage });
    }
  }
);

// Get single assessment (Admin)
router.get(
  '/admin/:id',
  authenticate,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assessment = await Assessment.findById(req.params.id)
        .populate('courseId', 'title')
        .populate('createdBy', 'name username email');

      if (!assessment) {
        res.status(404).json({ message: 'Assessment not found' });
        return;
      }

      res.json(assessment);
    } catch (error) {
      console.error('Get assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch assessment', error: errorMessage });
    }
  }
);

// Update assessment (Admin)
router.patch(
  '/admin/:id',
  authenticate,
  isAdmin,
  async (req: Request<{ id: string }, {}, UpdateAssessmentRequestBody>, res: Response): Promise<void> => {
    try {
      const assessment = await Assessment.findById(req.params.id);
      if (!assessment) {
        res.status(404).json({ message: 'Assessment not found' });
        return;
      }

      const { title, description, instructions, timeLimit, customFields, isActive } = req.body;

      if (title !== undefined) assessment.title = title;
      if (description !== undefined) assessment.description = description;
      if (instructions !== undefined) assessment.instructions = instructions;
      if (timeLimit !== undefined) {
        if (timeLimit < 300 || timeLimit > 604800) {
          res.status(400).json({ 
            message: 'Time limit must be between 300 seconds (5 minutes) and 604800 seconds (7 days)' 
          });
          return;
        }
        assessment.timeLimit = timeLimit;
      }
      if (customFields !== undefined) {
        // Validate custom fields
        if (Array.isArray(customFields)) {
          for (let i = 0; i < customFields.length; i++) {
            const field = customFields[i];
            if (!field.label || !field.type) {
              res.status(400).json({ message: `Custom field ${i + 1} is invalid` });
              return;
            }
          }
        }
        assessment.customFields = customFields as ICustomField[];
      }
      if (isActive !== undefined) assessment.isActive = isActive;

      await assessment.save();

      res.json({
        message: 'Assessment updated successfully',
        assessment,
      });
    } catch (error) {
      console.error('Update assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to update assessment', error: errorMessage });
    }
  }
);

// Delete assessment (Admin)
router.delete(
  '/admin/:id',
  authenticate,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assessment = await Assessment.findById(req.params.id);
      if (!assessment) {
        res.status(404).json({ message: 'Assessment not found' });
        return;
      }

      await assessment.deleteOne();

      res.json({ message: 'Assessment deleted successfully' });
    } catch (error) {
      console.error('Delete assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to delete assessment', error: errorMessage });
    }
  }
);

// Get assessment submissions (Admin)
router.get(
  '/admin/:id/submissions',
  authenticate,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const assessment = await Assessment.findById(req.params.id)
        .populate('submissions.studentId', 'name username email');

      if (!assessment) {
        res.status(404).json({ message: 'Assessment not found' });
        return;
      }

      res.json({
        submissions: assessment.submissions,
        total: assessment.submissions.length,
      });
    } catch (error) {
      console.error('Get submissions error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch submissions', error: errorMessage });
    }
  }
);

// ==================== STUDENT ROUTES ====================

// Get assessment info (Student) - before starting
router.get(
  '/course/:id',
  authenticate,
  validateCourseCompletion,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const courseId = req.params.id;

      const assessment = await Assessment.findOne({
        courseId,
        isActive: true,
      });

      if (!assessment) {
        res.status(404).json({ message: 'No active assessment found for this course' });
        return;
      }

      // Check if student has already started or submitted
      const existingSubmission = assessment.submissions.find(
        (s) => s.studentId.toString() === req.user!._id.toString()
      );

      if (existingSubmission) {
        if (existingSubmission.status === 'submitted') {
          res.status(400).json({
            message: 'You have already submitted this assessment',
            submitted: true,
            submittedAt: existingSubmission.submittedAt,
          });
          return;
        }

        // Return existing submission with time remaining
        const now = new Date();
        const startedAt = new Date(existingSubmission.startedAt);
        const expiresAt = new Date(startedAt.getTime() + assessment.timeLimit * 1000);
        const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

        res.json({
          assessmentId: assessment._id,
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          timeLimit: assessment.timeLimit,
          customFields: assessment.customFields,
          startedAt: existingSubmission.startedAt,
          expiresAt,
          timeRemaining,
          inProgress: true,
        });
        return;
      }

      // Return assessment info without starting it
      res.json({
        id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        timeLimit: assessment.timeLimit,
        customFields: assessment.customFields,
        canStart: true,
      });
    } catch (error) {
      console.error('Get assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch assessment', error: errorMessage });
    }
  }
);

// Start assessment (Student) - starts the timer
router.post(
  '/course/:id/start',
  authenticate,
  validateCourseCompletion,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const courseId = req.params.id;

      const assessment = await Assessment.findOne({
        courseId,
        isActive: true,
      });

      if (!assessment) {
        res.status(404).json({ message: 'No active assessment found for this course' });
        return;
      }

      // Check if already submitted
      const existingSubmission = assessment.submissions.find(
        (s) => s.studentId.toString() === req.user!._id.toString()
      );

      if (existingSubmission && existingSubmission.status === 'submitted') {
        res.status(400).json({ message: 'You have already submitted this assessment' });
        return;
      }

      if (!existingSubmission) {
        // Create new submission
        const startedAt = new Date();
        const submission: IAssessmentSubmission = {
          studentId: req.user!._id,
          startedAt,
          submittedAt: startedAt,
          status: 'in_progress',
        };

        assessment.submissions.push(submission);
        await assessment.save();
      }

      const submission = assessment.submissions.find(
        (s) => s.studentId.toString() === req.user!._id.toString()
      );

      if (!submission) {
        res.status(500).json({ message: 'Failed to start assessment' });
        return;
      }

      const startedAt = new Date(submission.startedAt);
      const expiresAt = new Date(startedAt.getTime() + assessment.timeLimit * 1000);

      res.json({
        message: 'Assessment started',
        assessmentId: assessment._id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        timeLimit: assessment.timeLimit,
        customFields: assessment.customFields,
        startedAt: submission.startedAt,
        expiresAt,
      });
    } catch (error) {
      console.error('Start assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to start assessment', error: errorMessage });
    }
  }
);

// Submit assessment (Student)
router.post(
  '/course/:id/submit',
  authenticate,
  validateCourseCompletion,
  async (req: Request<{ id: string }, {}, SubmitAssessmentRequestBody>, res: Response): Promise<void> => {
    try {
      const courseId = req.params.id;
      const { projectTitle, projectDescription, deployedLink, githubLink, customFields } = req.body;

      const assessment = await Assessment.findOne({
        courseId,
        isActive: true,
      });

      if (!assessment) {
        res.status(404).json({ message: 'No active assessment found for this course' });
        return;
      }

      // Find existing submission
      const submissionIndex = assessment.submissions.findIndex(
        (s) => s.studentId.toString() === req.user!._id.toString()
      );

      if (submissionIndex === -1) {
        res.status(400).json({ message: 'You must start the assessment before submitting' });
        return;
      }

      const submission = assessment.submissions[submissionIndex];

      if (submission.status === 'submitted') {
        res.status(400).json({ message: 'You have already submitted this assessment' });
        return;
      }

      // Check if time has expired
      const now = new Date();
      const startedAt = new Date(submission.startedAt);
      const expiresAt = new Date(startedAt.getTime() + assessment.timeLimit * 1000);

      if (now > expiresAt) {
        submission.status = 'expired';
        await assessment.save();
        res.status(400).json({ 
          message: 'Assessment time has expired',
          expired: true,
          expiresAt,
        });
        return;
      }

      // Update submission
      submission.projectTitle = projectTitle;
      submission.projectDescription = projectDescription;
      submission.deployedLink = deployedLink;
      submission.githubLink = githubLink;
      if (customFields) {
        submission.customFields = new Map(Object.entries(customFields));
      }
      submission.submittedAt = now;
      submission.completedAt = now;
      submission.status = 'submitted';

      assessment.submissions[submissionIndex] = submission;
      await assessment.save();

      res.json({
        message: 'Assessment submitted successfully',
        submittedAt: submission.submittedAt,
      });
    } catch (error) {
      console.error('Submit assessment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to submit assessment', error: errorMessage });
    }
  }
);

// Get student's submission (Student)
router.get(
  '/course/:id/my-submission',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const courseId = req.params.id;

      const assessment = await Assessment.findOne({
        courseId,
        isActive: true,
      });

      if (!assessment) {
        res.status(404).json({ message: 'No active assessment found for this course' });
        return;
      }

      const submission = assessment.submissions.find(
        (s) => s.studentId.toString() === req.user!._id.toString()
      );

      if (!submission) {
        res.status(404).json({ message: 'You have not started this assessment yet' });
        return;
      }

      // Convert Map to object if needed
      let customFieldsObj: Record<string, any> = {};
      if (submission.customFields) {
        if (submission.customFields instanceof Map) {
          customFieldsObj = Object.fromEntries(submission.customFields);
        } else if (typeof submission.customFields === 'object') {
          customFieldsObj = submission.customFields as Record<string, any>;
        }
      }

      res.json({
        submission: {
          startedAt: submission.startedAt,
          submittedAt: submission.submittedAt,
          status: submission.status,
          projectTitle: submission.projectTitle,
          projectDescription: submission.projectDescription,
          deployedLink: submission.deployedLink,
          githubLink: submission.githubLink,
          customFields: customFieldsObj,
        },
      });
    } catch (error) {
      console.error('Get submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch submission', error: errorMessage });
    }
  }
);

export default router;
