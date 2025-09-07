import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'customer' | 'admin';
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_CONFIG_ERROR',
          message: 'Server configuration error'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User no longer exists'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add user to request object
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Continue without authentication if JWT secret is not configured
      next();
      return;
    }

    // Try to verify token
    const decoded = jwt.verify(token, jwtSecret) as any;
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role
      };
    }

    next();
  } catch (error) {
    // If token verification fails, continue without authentication
    // This allows public access while still providing user context if available
    next();
  }
};