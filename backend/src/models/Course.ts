import mongoose, { Schema, Model } from 'mongoose';
import { ICourse, IVideoContent, IResource, CourseLevel, YouTubeType, ResourceType } from '../types/index.js';

const resourceSchema = new Schema<IResource>({
  type: {
    type: String,
    enum: ['pdf', 'link', 'code', 'other'] as ResourceType[],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

const videoContentSchema = new Schema<IVideoContent>({
  videoId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 0,
  },
  order: {
    type: Number,
    required: true,
    min: 0,
  },
  thumbnail: {
    type: String,
  },
  resources: [resourceSchema],
});

const courseSchema = new Schema<ICourse>(
  {
    // Basic Information
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'General',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'] as CourseLevel[],
      required: true,
      default: 'beginner',
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // YouTube Integration
    youtubeUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          // Basic YouTube URL validation
          return /(youtube\.com|youtu\.be)/.test(v);
        },
        message: 'Please provide a valid YouTube URL',
      },
    },
    youtubeId: {
      type: String,
      required: true,
    },
    youtubeType: {
      type: String,
      enum: ['video', 'playlist'] as YouTubeType[],
      required: true,
    },
    videoCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // in minutes
    },

    // Course Content
    videos: [videoContentSchema],
    resources: [resourceSchema],

    // Pricing & Access
    isFree: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },

    // Metadata
    instructor: {
      type: String,
      required: true,
      trim: true,
      default: 'Mentorise',
    },
    language: {
      type: String,
      default: 'en',
      lowercase: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Statistics
    enrollmentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Admin Information
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
// Explicitly set language to 'none' to prevent MongoDB from using the document's language field
// as a language override (which doesn't support all language codes like 'hi')
courseSchema.index({ title: 'text', description: 'text', tags: 'text' }, { default_language: 'none' });
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ isFeatured: 1 });
courseSchema.index({ youtubeId: 1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ enrollmentsCount: -1 });

// Virtual for thumbnail URL (if not set, use YouTube thumbnail)
courseSchema.virtual('thumbnailUrl').get(function (this: ICourse) {
  if (this.thumbnail) {
    return this.thumbnail;
  }
  if (this.youtubeType === 'video' && this.youtubeId) {
    return `https://img.youtube.com/vi/${this.youtubeId}/hqdefault.jpg`;
  }
  if (this.youtubeType === 'playlist' && this.videos && this.videos.length > 0) {
    return `https://img.youtube.com/vi/${this.videos[0].videoId}/hqdefault.jpg`;
  }
  return null;
});

// Transform output
courseSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export const Course: Model<ICourse> = mongoose.model<ICourse>('Course', courseSchema);
