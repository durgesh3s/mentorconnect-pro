import { Document, Types } from 'mongoose';

export type EducationLevel = 'high' | 'secondary' | 'graduation';
export type CourseStatus = 'inprogress' | 'completed' | 'failed';
export type TagType = 'LOI' | 'Appreciation Letter' | 'Offer Letter' | 'Other';
export type UserRole = 'student' | 'admin';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type YouTubeType = 'video' | 'playlist';
export type ResourceType = 'pdf' | 'link' | 'code' | 'other';
export type SubscriptionPlan = 'monthly' | 'quarterly' | 'annual';

export interface IVideoNote {
  videoId: string;
  notes: string;
  updatedAt: Date;
}

export interface ICompletedVideo {
  videoId: string;
  completedAt: Date;
}

export interface ICourseEnrollment {
  courseId: Types.ObjectId;
  status: CourseStatus;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number;
  plan?: SubscriptionPlan;
  subscriptionAmount?: number;
  subscriptionCurrency?: string;
  subscriptionExpiresAt?: Date;
  videoNotes?: IVideoNote[];
  completedVideos?: ICompletedVideo[];
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
  enrollInCourse(
    courseId: Types.ObjectId,
    status?: CourseStatus,
    plan?: SubscriptionPlan,
    subscriptionAmount?: number,
    subscriptionCurrency?: string,
    subscriptionExpiresAt?: Date
  ): Promise<IStudent>;
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

export interface IVideoContent {
  videoId: string;
  title: string;
  description?: string;
  duration: number; // in seconds
  order: number;
  thumbnail?: string;
  resources?: IResource[];
}

export interface IResource {
  type: ResourceType;
  title: string;
  url: string;
  description?: string;
}

export interface ICourse extends Document {
  // Basic Information
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  level: CourseLevel;
  tags: string[];

  // YouTube Integration
  youtubeUrl: string;
  youtubeId: string;
  youtubeType: YouTubeType;
  videoCount: number;
  duration: number; // total duration in minutes

  // Course Content
  videos: IVideoContent[];
  resources?: IResource[];

  // Pricing & Access
  isFree: boolean;
  price?: number;
  currency?: string;

  // Metadata
  instructor: string;
  language: string;
  isPublished: boolean;
  isFeatured: boolean;

  // Statistics
  enrollmentsCount: number;
  averageRating?: number;
  reviewCount: number;

  // Admin Information
  createdBy: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: IStudent;
    }
  }
}

