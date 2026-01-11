import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import Thread from '../models/Thread.js';
import { Student } from '../models/Student.js';
import mongoose from 'mongoose';

const router = express.Router();

interface FeedQueryParams {
  limit?: string;
  filter?: 'all' | 'following';
}

// Get feed (threads/posts)
router.get(
  '/',
  authenticate,
  async (req: Request<{}, {}, {}, FeedQueryParams>, res: Response): Promise<void> => {
    try {
      const { limit = '20', filter = 'all' } = req.query;
      const limitNum = parseInt(limit, 10) || 20;
      const currentUserId = req.user!._id;

      // Build query based on filter
      let query: any = {};

      if (filter === 'following') {
        // Get the current user's following list
        const currentUser = await Student.findById(currentUserId).select('following');
        if (!currentUser || !currentUser.following || currentUser.following.length === 0) {
          // User is not following anyone, return empty array
          res.json([]);
          return;
        }
        // Only get threads from users the current user follows
        query.author = { $in: currentUser.following };
      }
      // If filter === 'all', query remains empty (get all threads)

      // Fetch threads with populated author information
      const threads = await Thread.find(query)
        .populate({
          path: 'author',
          select: 'username name avatar googleGmailPhoto',
        })
        .sort({ createdAt: -1 }) // Newest first
        .limit(limitNum)
        .lean(); // Use lean() for better performance

      // Format response to match frontend interface
      const formattedThreads = threads.map((thread: any) => {
        // Check if current user has liked this thread
        const liked = thread.likes && thread.likes.some(
          (likeId: mongoose.Types.ObjectId | string) => {
            const likeIdStr = typeof likeId === 'string' ? likeId : likeId.toString();
            return likeIdStr === currentUserId.toString();
          }
        );

        // Check if current user has shared this thread
        // Handle both old format (number) and new format (array)
        const sharesArray = Array.isArray(thread.shares) ? thread.shares : [];
        const shared = sharesArray && sharesArray.length > 0 && sharesArray.some(
          (shareId: mongoose.Types.ObjectId | string) => {
            const shareIdStr = typeof shareId === 'string' ? shareId : shareId.toString();
            return shareIdStr === currentUserId.toString();
          }
        );

        // Ensure author exists (should always exist, but handle edge case)
        if (!thread.author) {
          console.warn(`Thread ${thread._id} has no author`);
          return null;
        }

        return {
          id: thread._id.toString(),
          author: {
            id: thread.author._id.toString(),
            username: thread.author.username,
            name: thread.author.name || thread.author.username,
            avatar: thread.author.avatar || null,
            googleGmailPhoto: thread.author.googleGmailPhoto || null,
          },
          content: thread.content,
          images: thread.images || [],
          likes: thread.likes ? thread.likes.length : 0,
          comments: thread.comments ? thread.comments.length : 0,
          shares: Array.isArray(thread.shares) ? thread.shares.length : (thread.shares || 0),
          liked: liked || false,
          shared: shared || false,
          createdAt: thread.createdAt.toISOString(),
        };
      }).filter((thread) => thread !== null); // Remove any null entries

      res.json(formattedThreads);
    } catch (error) {
      console.error('Get feed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: 'Failed to fetch feed', error: errorMessage });
    }
  }
);

export default router;
