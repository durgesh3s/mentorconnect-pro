import mongoose, { Schema, Model, Document } from 'mongoose';
import { IStudent, ICourseEnrollment, ITaggedPost, EducationLevel, CourseStatus, TagType, UserRole } from '../types/index.js';

const courseEnrollmentSchema = new Schema<ICourseEnrollment>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  status: {
    type: String,
    enum: ['inprogress', 'completed', 'failed'] as CourseStatus[],
    default: 'inprogress' as CourseStatus,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

const taggedPostSchema = new Schema<ITaggedPost>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'CommunityPost',
    required: true,
  },
  tagType: {
    type: String,
    enum: ['LOI', 'Appreciation Letter', 'Offer Letter', 'Other'] as TagType[],
    required: true,
  },
  taggedAt: {
    type: Date,
    default: Date.now,
  },
});

const studentSchema = new Schema<IStudent>(
  {
    // Google Auth Fields
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    googleGmailPhoto: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Mandatory Fields (optional initially, required for profile completion)
    description: {
      type: String,
      required: false, // Will be required during profile completion
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
    },
    phone: {
      type: String,
      required: false, // Will be required during profile completion
      trim: true,
      match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Please provide a valid phone number'],
    },
    tagged: [taggedPostSchema],

    // Social Fields
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],

    // Course Enrollment
    coursesEnrolledIn: [courseEnrollmentSchema],

    // Education
    education: {
      type: String,
      enum: ['high', 'secondary', 'graduation'] as EducationLevel[],
      required: false, // Will be required during profile completion
      default: 'high', // Default value
    },

    // Location
    location: {
      type: String,
      required: false, // Will be required during profile completion
      trim: true,
    },

    // Fields of Interest (hashtags)
    fieldsOfInterest: [
      {
        type: String,
        trim: true,
        match: [/^#?[a-zA-Z0-9_]+$/, 'Field of interest must be alphanumeric'],
      },
    ],

    // Additional Fields
    name: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    skills: [String],
    socialLinks: {
      type: Map,
      of: String,
      default: {},
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: 'student',
      enum: ['student', 'admin'] as UserRole[],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
// Note: email, username, and googleId indexes are automatically created by unique: true
studentSchema.index({ 'coursesEnrolledIn.courseId': 1 });
studentSchema.index({ fieldsOfInterest: 1 });

// Virtual for follower count
studentSchema.virtual('followerCount').get(function () {
  return this.followers?.length || 0;
});

// Virtual for following count
studentSchema.virtual('followingCount').get(function () {
  return this.following?.length || 0;
});

// Method to add course enrollment
studentSchema.methods.enrollInCourse = function (
  courseId: mongoose.Types.ObjectId,
  status: CourseStatus = 'inprogress'
): Promise<IStudent> {
  const existingEnrollment = this.coursesEnrolledIn.find(
    (enrollment: ICourseEnrollment) => enrollment.courseId.toString() === courseId.toString()
  );

  if (existingEnrollment) {
    existingEnrollment.status = status;
    return this.save() as Promise<IStudent>;
  }

  this.coursesEnrolledIn.push({
    courseId,
    status,
    enrolledAt: new Date(),
    progress: 0,
  });

  return this.save() as Promise<IStudent>;
};

// Method to update course progress
studentSchema.methods.updateCourseProgress = function (
  courseId: mongoose.Types.ObjectId,
  progress: number
): Promise<IStudent> {
  const enrollment = this.coursesEnrolledIn.find(
    (enrollment: ICourseEnrollment) => enrollment.courseId.toString() === courseId.toString()
  );

  if (enrollment) {
    enrollment.progress = Math.min(100, Math.max(0, progress));
    if (progress >= 100 && enrollment.status === 'inprogress') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }
    return this.save() as Promise<IStudent>;
  }

  throw new Error('Course enrollment not found');
};

// Method to tag in community post
studentSchema.methods.tagInPost = function (
  postId: mongoose.Types.ObjectId,
  tagType: TagType
): Promise<IStudent> {
  const existingTag = this.tagged.find(
    (tag: ITaggedPost) => tag.postId.toString() === postId.toString()
  );

  if (existingTag) {
    existingTag.tagType = tagType;
    return this.save() as Promise<IStudent>;
  }

  this.tagged.push({
    postId,
    tagType,
    taggedAt: new Date(),
  });

  return this.save() as Promise<IStudent>;
};

// Transform output
studentSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export const Student: Model<IStudent> = mongoose.model<IStudent>('Student', studentSchema);

