import { Document, Types } from 'mongoose';

export type EducationLevel = 'high' | 'secondary' | 'graduation';
export type CourseStatus = 'inprogress' | 'completed' | 'failed';
export type TagType = 'LOI' | 'Appreciation Letter' | 'Offer Letter' | 'Other';
export type UserRole = 'student' | 'admin';

export interface ICourseEnrollment {
  courseId: Types.ObjectId;
  status: CourseStatus;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number;
}

export interface ITaggedPost {
  postId: Types.ObjectId;
  tagType: TagType;
  taggedAt: Date;
}

export interface IStudent extends Document {
  // Google Auth Fields
  username: string;
  email: string;
  googleGmailPhoto?: string | null;
  googleId?: string;

  // Mandatory Fields
  description: string;
  phone: string;
  tagged: ITaggedPost[];

  // Social Fields
  followers: Types.ObjectId[];
  following: Types.ObjectId[];

  // Course Enrollment
  coursesEnrolledIn: ICourseEnrollment[];

  // Education
  education: EducationLevel;

  // Location
  location: string;

  // Fields of Interest
  fieldsOfInterest: string[];

  // Additional Fields
  name?: string;
  avatar?: string | null;
  skills?: string[];
  socialLinks?: Map<string, string>;
  isProfileComplete: boolean;
  role: UserRole;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  followerCount: number;
  followingCount: number;

  // Methods
  enrollInCourse(courseId: Types.ObjectId, status?: CourseStatus): Promise<IStudent>;
  updateCourseProgress(courseId: Types.ObjectId, progress: number): Promise<IStudent>;
  tagInPost(postId: Types.ObjectId, tagType: TagType): Promise<IStudent>;
}

export interface IGoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
}

export interface IJwtPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IStudent;
    }
  }
}

