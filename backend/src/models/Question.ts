import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IAnswer extends Document {
  questionId: Types.ObjectId;
  author: Types.ObjectId;
  answer: string;
  isMentorAnswer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestion extends Document {
  courseId: Types.ObjectId;
  author: Types.ObjectId;
  question: string;
  answers: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, 'Answer cannot exceed 5000 characters'],
    },
    isMentorAnswer: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const questionSchema = new Schema<IQuestion>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },
    answers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Answer',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
questionSchema.index({ courseId: 1, createdAt: -1 });
answerSchema.index({ questionId: 1, createdAt: 1 });

export const Answer: Model<IAnswer> = mongoose.model<IAnswer>('Answer', answerSchema);
export const Question: Model<IQuestion> = mongoose.model<IQuestion>('Question', questionSchema);
