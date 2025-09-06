import jwt from 'jsonwebtoken';
import { createError } from '../middleware/errorHandler';

export interface JWTPayload {
  id: string;
  email: string;
  role: 'customer' | 'admin';
}

export const generateToken = (payload: JWTPayload): string => {
  const jwtSecret = process.env['JWT_SECRET'];
  const jwtExpiration = process.env['JWT_EXPIRATION'] || '24h';

  if (!jwtSecret) {
    throw createError('JWT secret not configured', 500);
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiration,
    issuer: 'ecommerce-auth-service',
    audience: 'ecommerce-app'
  } as any);
};

export const verifyToken = (token: string): JWTPayload => {
  const jwtSecret = process.env['JWT_SECRET'];

  if (!jwtSecret) {
    throw createError('JWT secret not configured', 500);
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'ecommerce-auth-service',
      audience: 'ecommerce-app'
    }) as JWTPayload;

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw createError('Token expired', 401);
    } else if (error.name === 'JsonWebTokenError') {
      throw createError('Invalid token', 401);
    } else {
      throw createError('Token verification failed', 401);
    }
  }
};