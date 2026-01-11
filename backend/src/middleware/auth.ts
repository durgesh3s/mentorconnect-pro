import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Student } from '../models/Student.js';
import { IJwtPayload } from '../types/index.js';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ message: 'JWT secret not configured' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as IJwtPayload;
    const student = await Student.findById(decoded.id).select('-__v');

    if (!student) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = student;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Authentication error', error: errorMessage });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Get admin email from environment variable, fallback to default
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'durgesh.singh.sde@gmail.com';
  
  if (req.user && req.user.email === ADMIN_EMAIL) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

