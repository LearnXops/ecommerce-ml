import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from 'shared/models/User';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  };
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'NO_TOKEN', 'No authentication token provided');
    }

    const token = authHeader.substring(7);
    
    if (!process.env['JWT_SECRET']) {
      throw createError(500, 'JWT_SECRET_MISSING', 'JWT secret not configured');
    }

    const decoded = jwt.verify(token, process.env['JWT_SECRET']) as any;
    
    // Verify user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw createError(401, 'USER_NOT_FOUND', 'User no longer exists');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError(401, 'INVALID_TOKEN', 'Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError(401, 'TOKEN_EXPIRED', 'Authentication token has expired'));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(createError(401, 'NOT_AUTHENTICATED', 'Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(createError(403, 'INSUFFICIENT_PERMISSIONS', 'Admin access required'));
  }

  next();
};