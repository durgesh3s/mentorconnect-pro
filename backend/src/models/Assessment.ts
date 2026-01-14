import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ICustomField {
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'email';
  required: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  order: number;
}

export interface IAssessmentSubmission {
  studentId: Types.ObjectId;
  startedAt: Date;
  submittedAt: Date;
  completedAt?: Date;
  projectTitle?: string;
  projectDescription?: string;
  deployedLink?: string;
  githubLink?: string;
  customFields?: Record<string, any>; // Custom field values
  status: 'in_progress' | 'submitted' | 'expired';
}

export interface IAssessment extends Document {
  courseId: Types.ObjectId;
  title: string;
  description?: string;
  instructions?: string; // Instructions for students
  timeLimit: number; // in seconds - timer starts when user begins
  customFields: ICustomField[]; // Custom fields for project submission
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  submissions: IAssessmentSubmission[];
}

const customFieldSchema = new Schema<ICustomField>({
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Field label cannot exceed 200 characters'],
  },
  type: {
    type: String,
    enum: ['text', 'textarea', 'url', 'number', 'email'],
    required: true,
    default: 'text',
  },
  required: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    trim: true,
    maxlength: [500, 'Placeholder cannot exceed 500 characters'],
  },
  validation: {
    pattern: String,
    min: Number,
    max: Number,
  },
  order: {
    type: Number,
    required: true,
    min: 0,
  },
});

const assessmentSubmissionSchema = new Schema<IAssessmentSubmission>({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  projectTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Project title cannot exceed 200 characters'],
  },
  projectDescription: {
    type: String,
    trim: true,
    maxlength: [10000, 'Project description cannot exceed 10000 characters'],
  },
  deployedLink: {
    type: String,
    trim: true,
    validate: {
      validator: function (v: string) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Deployed link must be a valid URL',
    },
  },
  githubLink: {
    type: String,
    trim: true,
    validate: {
      validator: function (v: string) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'GitHub link must be a valid URL',
    },
  },
  customFields: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'expired'],
    default: 'in_progress',
  },
});

const assessmentSchema = new Schema<IAssessment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [10000, 'Instructions cannot exceed 10000 characters'],
    },
    timeLimit: {
      type: Number,
      required: true,
      min: 300, // Minimum 5 minutes
      max: 604800, // Maximum 7 days (604800 seconds)
      default: 3600, // Default 1 hour
    },
    customFields: {
      type: [customFieldSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    submissions: {
      type: [assessmentSubmissionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
assessmentSchema.index({ courseId: 1, isActive: 1 });
assessmentSchema.index({ 'submissions.studentId': 1 });
assessmentSchema.index({ 'submissions.startedAt': 1 });

// Transform output
assessmentSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    delete ret.__v;
    return ret;
  },
});

export const Assessment: Model<IAssessment> = mongoose.model<IAssessment>('Assessment', assessmentSchema);
