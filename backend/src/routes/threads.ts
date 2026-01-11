import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import Thread from '../models/Thread.js';
import Comment from '../models/Comment.js';
import mongoose from 'mongoose';

const router = express.Router();

interface CreateThreadRequestBody {
  content: string;
  images?: string[];
}

// Create thread
router.post(
  '/create',
  authenticate,
  async (req: Request<{}, {}, CreateThreadRequestBody>, res: Response): Promise<void> => {
    try {
      const { content, images = [] } = req.body;

      // Validate required fields
      if (!content || !content.trim()) {
        res.status(400).json({ message: 'Content is required' });
        return;
      }

      // Validate content length
      if (content.trim().length > 5000) {
        res.status(400).json({ message: 'Content cannot exceed 5000 characters' });
        return;
      }

      // Validate images array
      if (images.length > 10) {
        res.status(400).json({ message: 'Maximum 10 images allowed' });
        return;
      }

      // Check thread count limit (max 10 threads per user)
      const threadCount = await Thread.countDocuments({ author: req.user!._id });
      if (threadCount >= 10) {
        res.status(400).json({ message: 'Maximum 10 threads allowed. Delete some to create new ones.' });
        return;
      }

      // Create thread
      const thread = new Thread({
        author: req.user!._id,
        content: content.trim(),
        images: images.filter((img) => img && img.trim()),
        likes: [],
        comments: [],
        shares: [],
      });

      await thread.save();

      // Populate author information
      await thread.populate({
        path: 'author',
        select: 'username name avatar googleGmailPhoto',
      });

      // Format response to match frontend interface
      const response = {
        id: thread._id.toString(),
        author: {
          id: (thread.author as any)._id.toString(),
          username: (thread.author as any).username,
          name: (thread.author as any).name || (thread.author as any).username,
          avatar: (thread.author as any).avatar || null,
          googleGmailPhoto: (thread.author as any).googleGmailPhoto || null,
        },
        content: thread.content,
        images: thread.images || [],
        likes: thread.likes.length,
        comments: thread.comments.length,
        shares: thread.shares.length,
        liked: false,
        shared: false,
        createdAt: thread.createdAt.toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create thread error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to create thread', error: errorMessage });
    }
  }
);

// Like/Unlike thread
router.post(
  '/:threadId/like',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(threadId)) {
        res.status(400).json({ message: 'Invalid thread ID' });
        return;
      }

      const thread = await Thread.findById(threadId);
      if (!thread) {
        res.status(404).json({ message: 'Thread not found' });
        return;
      }

      const likedIndex = thread.likes.findIndex(
        (likeId) => likeId.toString() === userId.toString()
      );

      if (likedIndex === -1) {
        // Like the thread
        thread.likes.push(userId);
      } else {
        // Unlike the thread
        thread.likes.splice(likedIndex, 1);
      }

      await thread.save();

      res.json({
        liked: likedIndex === -1,
        likes: thread.likes.length,
      });
    } catch (error) {
      console.error('Like thread error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to like thread', error: errorMessage });
    }
  }
);

// Share thread
router.post(
  '/:threadId/share',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(threadId)) {
        res.status(400).json({ message: 'Invalid thread ID' });
        return;
      }

      const thread = await Thread.findById(threadId);
      if (!thread) {
        res.status(404).json({ message: 'Thread not found' });
        return;
      }

      // Handle migration from old format (number) to new format (array)
      if (!Array.isArray(thread.shares)) {
        // Convert old format to new format
        thread.shares = [];
      }

      const sharedIndex = thread.shares.findIndex(
        (shareId) => shareId.toString() === userId.toString()
      );

      if (sharedIndex === -1) {
        // Share the thread (only once per user)
        thread.shares.push(userId);
      }
      // If already shared, do nothing (user can only share once)

      await thread.save();

      res.json({
        shared: true,
        shares: thread.shares.length,
      });
    } catch (error) {
      console.error('Share thread error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to share thread', error: errorMessage });
    }
  }
);

// Create comment
interface CreateCommentRequestBody {
  content: string;
}

router.post(
  '/:threadId/comments',
  authenticate,
  async (req: Request<{ threadId: string }, {}, CreateCommentRequestBody>, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;
      const { content } = req.body;

      if (!mongoose.Types.ObjectId.isValid(threadId)) {
        res.status(400).json({ message: 'Invalid thread ID' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ message: 'Comment content is required' });
        return;
      }

      if (content.trim().length > 1000) {
        res.status(400).json({ message: 'Comment cannot exceed 1000 characters' });
        return;
      }

      const thread = await Thread.findById(threadId);
      if (!thread) {
        res.status(404).json({ message: 'Thread not found' });
        return;
      }

      // Create comment
      const comment = new Comment({
        thread: threadId,
        author: req.user!._id,
        content: content.trim(),
        likes: [],
      });

      await comment.save();

      // Add comment to thread
      thread.comments.push(comment._id);
      await thread.save();

      // Populate author information
      await comment.populate({
        path: 'author',
        select: 'username name avatar googleGmailPhoto',
      });

      // Format response
      const response = {
        id: comment._id.toString(),
        threadId: threadId,
        author: {
          id: (comment.author as any)._id.toString(),
          username: (comment.author as any).username,
          name: (comment.author as any).name || (comment.author as any).username,
          avatar: (comment.author as any).avatar || null,
          googleGmailPhoto: (comment.author as any).googleGmailPhoto || null,
        },
        content: comment.content,
        likes: comment.likes.length,
        liked: false,
        createdAt: comment.createdAt.toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create comment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to create comment', error: errorMessage });
    }
  }
);

// Get comments for a thread
router.get(
  '/:threadId/comments',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(threadId)) {
        res.status(400).json({ message: 'Invalid thread ID' });
        return;
      }

      const thread = await Thread.findById(threadId);
      if (!thread) {
        res.status(404).json({ message: 'Thread not found' });
        return;
      }

      const comments = await Comment.find({ thread: threadId })
        .populate({
          path: 'author',
          select: 'username name avatar googleGmailPhoto',
        })
        .sort({ createdAt: -1 })
        .lean();

      const currentUserId = req.user!._id;

      // Format response
      const formattedComments = comments.map((comment: any) => {
        const liked = comment.likes && comment.likes.some(
          (likeId: mongoose.Types.ObjectId | string) => {
            const likeIdStr = typeof likeId === 'string' ? likeId : likeId.toString();
            return likeIdStr === currentUserId.toString();
          }
        );

        return {
          id: comment._id.toString(),
          threadId: threadId,
          author: {
            id: comment.author._id.toString(),
            username: comment.author.username,
            name: comment.author.name || comment.author.username,
            avatar: comment.author.avatar || null,
            googleGmailPhoto: comment.author.googleGmailPhoto || null,
          },
          content: comment.content,
          likes: comment.likes ? comment.likes.length : 0,
          liked: liked || false,
          createdAt: comment.createdAt.toISOString(),
        };
      });

      res.json(formattedComments);
    } catch (error) {
      console.error('Get comments error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch comments', error: errorMessage });
    }
  }
);

// Delete comment
router.delete(
  '/:threadId/comments/:commentId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { threadId, commentId } = req.params;
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        res.status(400).json({ message: 'Invalid thread or comment ID' });
        return;
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ message: 'Comment not found' });
        return;
      }

      // Check if user is the author
      if (comment.author.toString() !== userId.toString()) {
        res.status(403).json({ message: 'You can only delete your own comments' });
        return;
      }

      // Remove comment from thread
      const thread = await Thread.findById(threadId);
      if (thread) {
        thread.comments = thread.comments.filter(
          (id) => id.toString() !== commentId
        );
        await thread.save();
      }

      // Delete comment
      await Comment.findByIdAndDelete(commentId);

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Delete comment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to delete comment', error: errorMessage });
    }
  }
);

export default router;
