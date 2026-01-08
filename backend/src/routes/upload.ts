import express, { Request, Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const router = express.Router();

// Helper function to get Cloudinary config
const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  
  return { cloudName, apiKey, apiSecret };
};

// Cloudinary will be configured at request time to ensure env vars are available
// This avoids timing issues with module loading and dotenv initialization

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to convert buffer to stream
const bufferToStream = (buffer: Buffer): Readable => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Upload avatar
router.post(
  '/avatar',
  authenticate,
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Check Cloudinary configuration (read at request time)
      const config = getCloudinaryConfig();
      if (!config) {
        res.status(500).json({ 
          message: 'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.' 
        });
        return;
      }
      
      // Ensure Cloudinary is configured
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
      });

      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      // Convert buffer to stream
      const stream = bufferToStream(req.file.buffer);

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'avatars',
            resource_type: 'image',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });

      res.json({ url: uploadResult.secure_url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('Avatar upload error:', errorMessage);
      res.status(500).json({ message: 'Failed to upload avatar', error: errorMessage });
    }
  }
);

// Upload thread image
router.post(
  '/thread-image',
  authenticate,
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Check Cloudinary configuration (read at request time)
      const config = getCloudinaryConfig();
      if (!config) {
        res.status(500).json({ 
          message: 'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.' 
        });
        return;
      }
      
      // Ensure Cloudinary is configured
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
      });

      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      // Convert buffer to stream
      const stream = bufferToStream(req.file.buffer);

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'threads',
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });

      res.json({ url: uploadResult.secure_url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('Thread image upload error:', errorMessage);
      res.status(500).json({ message: 'Failed to upload image', error: errorMessage });
    }
  }
);

export default router;

