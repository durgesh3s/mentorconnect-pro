import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import { Student } from '../models/Student.js';
import { getGoogleAuthUrl, getGoogleUser } from '../utils/googleAuth.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { UserRole, EducationLevel } from '../types/index.js';

const router = express.Router();

interface CallbackRequestBody {
  code: string;
  // role is removed - role is automatically set based on email
}

interface CompleteProfileRequestBody {
  username?: string;
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

// Get Google OAuth URL
router.get('/google', (req: Request, res: Response): void => {
  try {
    // Allow redirect URI override from query param for flexibility
    const redirectUri = req.query.redirect_uri as string;
    let url: string;
    
    if (redirectUri) {
      // Use custom redirect URI if provided
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials are not properly configured');
      }
      
      const oauthClient = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
      );
      
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ];
      
      url = oauthClient.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
      });
    } else {
      // Use default from environment
      url = getGoogleAuthUrl();
    }
    
    res.json({ url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to generate Google auth URL', error: errorMessage });
  }
});

// Google OAuth Callback
router.post('/callback', async (req: Request<{}, {}, CallbackRequestBody>, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Authorization code is required' });
      return;
    }

    let googleUser;
    try {
      // Get user info from Google
      googleUser = await getGoogleUser(code);
    } catch (error) {
      // Handle invalid_grant error (code already used or expired)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('invalid_grant')) {
        // Code was already used or expired
        // Check if user is already authenticated via Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            
            if (decoded && decoded.id) {
              // User is already authenticated, return their existing data
              const existingStudent = await Student.findById(decoded.id);
              if (existingStudent) {
                const userData = {
                  id: existingStudent._id.toString(),
                  username: existingStudent.username,
                  email: existingStudent.email,
                  name: existingStudent.name,
                  avatar: existingStudent.avatar || existingStudent.googleGmailPhoto || undefined,
                  role: existingStudent.role,
                  skills: existingStudent.skills,
                  socialLinks: existingStudent.socialLinks ? Object.fromEntries(existingStudent.socialLinks) : {},
                  isProfileComplete: existingStudent.isProfileComplete,
                };
                res.json({ token, user: userData });
                return;
              }
            }
          } catch (tokenError) {
            // Token is invalid, continue with error handling
          }
        }
        
        // Code was used but user is not authenticated, return error
        res.status(400).json({ 
          message: 'Authorization code has already been used or has expired. Please try logging in again.',
          error: 'invalid_grant'
        });
        return;
      }
      // Re-throw other errors
      throw error;
    }

    // Find or create student
    let student = await Student.findOne({
      $or: [{ email: googleUser.email }, { googleId: googleUser.googleId }],
    });

    // Only durgesh.singh.sde@gmail.com can be admin
    const ADMIN_EMAIL = 'durgesh.singh.sde@gmail.com';
    const isAdminUser = googleUser.email === ADMIN_EMAIL;
    const userRole: UserRole = isAdminUser ? 'admin' : 'student';

    if (student) {
      // Update Google info if not present
      if (!student.googleId) {
        student.googleId = googleUser.googleId;
      }
      if (!student.googleGmailPhoto) {
        student.googleGmailPhoto = googleUser.picture;
      }
      if (!student.name && googleUser.name) {
        student.name = googleUser.name;
      }
      // Update avatar from Google picture if not set
      if (!student.avatar && googleUser.picture) {
        student.avatar = googleUser.picture;
      }
      // Ensure only admin email has admin role
      if (isAdminUser) {
        student.role = 'admin';
      } else if (!isAdminUser && student.role === 'admin') {
        // Don't downgrade existing admin, but new users get student role
        student.role = 'student';
      }
      await student.save();
    } else {
      // Generate a valid username from email (only letters, numbers, underscores)
      const emailPrefix = googleUser.email.split('@')[0];
      // Remove any invalid characters and keep only alphanumeric and underscores
      const sanitizedPrefix = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_');
      // Ensure it's not empty and add timestamp for uniqueness
      const baseUsername = sanitizedPrefix || 'user';
      let username = `${baseUsername}_${Date.now().toString().slice(-6)}`;
      
      // Ensure username is valid (only letters, numbers, underscores)
      username = username.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Check if username already exists and append more if needed
      let finalUsername = username;
      let counter = 1;
      while (await Student.findOne({ username: finalUsername })) {
        finalUsername = `${username}_${counter}`;
        counter++;
      }

      // Extract name from Google (use email prefix as fallback)
      const extractedName = googleUser.name || emailPrefix.replace(/[._]/g, ' ');

      // Create new student with info extracted from Google
      student = await Student.create({
        email: googleUser.email,
        googleId: googleUser.googleId,
        googleGmailPhoto: googleUser.picture,
        name: extractedName,
        avatar: googleUser.picture || null, // Use Google picture as avatar
        username: finalUsername,
        // Optional fields - will be required during profile completion
        description: undefined, // Will be filled in complete-profile
        phone: undefined, // Will be filled in complete-profile
        education: 'high', // Default value
        location: undefined, // Will be filled in complete-profile
        fieldsOfInterest: [],
        isProfileComplete: false, // Profile incomplete until mandatory fields are filled
        role: userRole, // Automatically set based on email
      });
    }

    // Generate token
    const token = generateToken(student._id.toString());

    // Return user data (excluding sensitive fields)
    const userData = {
      id: student._id.toString(),
      username: student.username,
      email: student.email,
      name: student.name,
      avatar: student.avatar || student.googleGmailPhoto || undefined,
      role: student.role,
      skills: student.skills,
      socialLinks: student.socialLinks ? Object.fromEntries(student.socialLinks) : {},
      isProfileComplete: student.isProfileComplete,
    };

    res.json({ token, user: userData });
  } catch (error) {
    console.error('Auth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Authentication failed', error: errorMessage });
  }
});

// Check username availability
router.get('/check-username/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const student = await Student.findOne({ username: username.toLowerCase() });
    res.json({ available: !student });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Error checking username', error: errorMessage });
  }
});

// Complete Profile
router.post(
  '/complete-profile',
  authenticate,
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('description')
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('phone')
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage('Please provide a valid phone number'),
    body('education')
      .isIn(['high', 'secondary', 'graduation'])
      .withMessage('Education must be high, secondary, or graduation'),
    body('location').notEmpty().withMessage('Location is required'),
    body('fieldsOfInterest').optional().isArray().withMessage('Fields of interest must be an array'),
  ],
  async (req: Request<{}, {}, CompleteProfileRequestBody>, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        username,
        name,
        description,
        phone,
        education,
        location,
        fieldsOfInterest,
        avatar,
        skills,
        socialLinks,
      } = req.body;

      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const student = await Student.findById(req.user._id);

      if (!student) {
        res.status(404).json({ message: 'Student not found' });
        return;
      }

      // Check username availability if changed
      if (username && username !== student.username) {
        const existingStudent = await Student.findOne({ username: username.toLowerCase() });
        if (existingStudent) {
          res.status(400).json({ message: 'Username is already taken' });
          return;
        }
        student.username = username.toLowerCase();
      }

      // Update fields
      if (name) student.name = name;
      if (description) student.description = description;
      if (phone) student.phone = phone;
      if (education) student.education = education;
      if (location) student.location = location;
      if (fieldsOfInterest) {
        // Ensure fields start with # if not already
        student.fieldsOfInterest = fieldsOfInterest.map((field: string) =>
          field.startsWith('#') ? field : `#${field}`
        );
      }
      if (avatar) student.avatar = avatar;
      if (skills) student.skills = skills;
      if (socialLinks) {
        student.socialLinks = new Map(Object.entries(socialLinks));
      }

      // Validate that all mandatory fields are present before marking as complete
      if (!student.description || student.description.trim().length < 10) {
        res.status(400).json({ message: 'Description is required and must be at least 10 characters' });
        return;
      }
      if (!student.phone || !student.phone.trim()) {
        res.status(400).json({ message: 'Phone number is required' });
        return;
      }
      if (!student.location || !student.location.trim()) {
        res.status(400).json({ message: 'Location is required' });
        return;
      }
      if (!student.education) {
        res.status(400).json({ message: 'Education level is required' });
        return;
      }

      // All mandatory fields are present, mark profile as complete
      student.isProfileComplete = true;
      await student.save();

      // Return updated user
      const userData = {
        id: student._id.toString(),
        username: student.username,
        email: student.email,
        name: student.name,
        avatar: student.avatar || student.googleGmailPhoto || undefined,
        role: student.role,
        skills: student.skills,
        socialLinks: student.socialLinks ? Object.fromEntries(student.socialLinks) : {},
        isProfileComplete: student.isProfileComplete,
        description: student.description,
        phone: student.phone,
        education: student.education,
        location: student.location,
        fieldsOfInterest: student.fieldsOfInterest,
        followerCount: student.followerCount,
        followingCount: student.followingCount,
      };

      res.json(userData);
    } catch (error) {
      console.error('Complete profile error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to complete profile', error: errorMessage });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const student = await Student.findById(req.user._id)
      .populate('followers', 'username name avatar')
      .populate('following', 'username name avatar')
      .populate('coursesEnrolledIn.courseId', 'title description')
      .select('-__v');

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to fetch user', error: errorMessage });
  }
});

export default router;

