import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { User } from '@ecommerce/shared/models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('Access token required', 401);
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Verify user still exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      throw createError('User not found', 401);
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');