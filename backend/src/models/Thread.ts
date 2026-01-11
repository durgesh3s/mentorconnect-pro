import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IThread extends Document {
  author: Types.ObjectId;
  content: string;
  images?: string[];
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  shares: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const threadSchema = new Schema<IThread>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    shares: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
threadSchema.index({ author: 1, createdAt: -1 });
threadSchema.index({ createdAt: -1 });

const Thread: Model<IThread> = mongoose.model<IThread>('Thread', threadSchema);

export default Thread;
