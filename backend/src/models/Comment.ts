import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  thread: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    thread: {
      type: Schema.Types.ObjectId,
      ref: 'Thread',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    likes: [
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
commentSchema.index({ thread: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });

const Comment: Model<IComment> = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
