import jwt from 'jsonwebtoken';
import { IJwtPayload } from '../types/index.js';

export const generateToken = (id: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): IJwtPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, jwtSecret) as IJwtPayload;
};

