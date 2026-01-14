// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible paths for .env file
const possiblePaths = [
  resolve(__dirname, '../.env'), // When running from dist/
  resolve(__dirname, '../../.env'), // When running from dist/server.js
  resolve(process.cwd(), '.env'), // From current working directory
];

let envPath: string | undefined;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    envPath = path;
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded .env from: ${envPath}`);
  
  // Verify Cloudinary config is loaded
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    console.log('✅ Cloudinary configuration detected in .env');
  } else {
    console.warn('⚠️  Cloudinary configuration missing in .env file');
  }
  
  // Verify YouTube API key is loaded
  if (process.env.YOUTUBE_API_KEY) {
    console.log('✅ YouTube API key detected in .env');
    console.log(`   API Key prefix: ${process.env.YOUTUBE_API_KEY.substring(0, 10)}...`);
  } else {
    console.warn('⚠️  YouTube API key missing in .env file (YOUTUBE_API_KEY)');
    console.warn('   Playlist video fetching will not work without this key');
  }
} else {
  console.warn('⚠️  .env file not found. Tried:', possiblePaths);
  // Fallback to default dotenv behavior
  dotenv.config();
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import dashboardRoutes from './routes/dashboard.js';
import courseRoutes from './routes/courses.js';
import assessmentRoutes from './routes/assessments.js';
import feedRoutes from './routes/feed.js';
import threadRoutes from './routes/threads.js';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  // credentials: true, // Cannot use credentials with origin: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', message: 'Mentorise API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/threads', threadRoutes);

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('Error:', err);
  res.status(500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Connect to database and start server
const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

