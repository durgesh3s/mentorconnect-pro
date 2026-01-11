import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  course: Types.ObjectId;
  author: Types.ObjectId;
  rating: number; // 1-5
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review content cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
reviewSchema.index({ course: 1, createdAt: -1 });
reviewSchema.index({ author: 1, createdAt: -1 });
// Ensure one review per user per course
reviewSchema.index({ course: 1, author: 1 }, { unique: true });

const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
