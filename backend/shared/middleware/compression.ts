import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Enhanced compression middleware with performance optimizations
 */
export function compressionMiddleware() {
  return compression({
    // Compression level (1-9, 6 is default)
    level: 6,
    
    // Minimum response size to compress (in bytes)
    threshold: 1024,
    
    // Filter function to determine what to compress
    filter: (req: Request, res: Response) => {
      // Don't compress if client doesn't support it
      if (!req.headers['accept-encoding']) {
        return false;
      }

      // Don't compress if response is already compressed
      if (res.getHeader('content-encoding')) {
        return false;
      }

      // Don't compress images, videos, or already compressed files
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        const skipTypes = [
          'image/',
          'video/',
          'audio/',
          'application/zip',
          'application/gzip',
          'application/x-gzip',
          'application/x-compress',
          'application/x-compressed'
        ];
        
        if (skipTypes.some(type => contentType.includes(type))) {
          return false;
        }
      }

      // Use default compression filter for other cases
      return compression.filter(req, res);
    }
  });
}

/**
 * Request size limiting middleware
 */
export function requestSizeLimitMiddleware(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        logger.warn(`Request size ${sizeInBytes} exceeds limit ${maxSizeInBytes}`, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path
        });
        
        return res.status(413).json({
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request size exceeds maximum allowed size of ${maxSize}`
          }
        });
      }
    }
    
    next();
  };
}

/**
 * Response optimization middleware
 */
export function responseOptimizationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set performance-related headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Enable keep-alive connections
    res.setHeader('Connection', 'keep-alive');
    
    // Set cache control for static assets
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    // Set ETag for dynamic content
    if (req.method === 'GET' && !req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    }
    
    next();
  };
}

/**
 * Request timing middleware for performance monitoring
 */
export function requestTimingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Add timing information to request
    (req as any).startTime = startTime;
    
    // Override res.end to capture response time
    const originalEnd = res.end.bind(res);
    
    res.end = function(chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Set response time header
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      
      // Log slow requests
      if (responseTime > 1000) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      // Log request metrics
      logger.debug('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.getHeader('content-length')
      });
      
      return originalEnd(chunk, encoding);
    };
    
    next();
  };
}

/**
 * JSON response optimization middleware
 */
export function jsonOptimizationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(obj: any) {
      // Set appropriate content type
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      
      // Optimize JSON serialization
      try {
        // Remove undefined values and functions
        const optimizedObj = JSON.parse(JSON.stringify(obj));
        
        // Add metadata for debugging in development
        if (process.env.NODE_ENV === 'development') {
          if (typeof optimizedObj === 'object' && optimizedObj !== null) {
            optimizedObj._meta = {
              timestamp: new Date().toISOString(),
              responseTime: res.getHeader('X-Response-Time')
            };
          }
        }
        
        return originalJson(optimizedObj);
      } catch (error) {
        logger.error('JSON serialization error:', error);
        return originalJson(obj);
      }
    };
    
    next();
  };
}

/**
 * Request deduplication middleware to prevent duplicate requests
 */
export function requestDeduplicationMiddleware(windowMs: number = 1000) {
  const requestMap = new Map<string, number>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply to non-idempotent methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }
    
    const userId = (req as any).user?.id || req.ip;
    const requestKey = `${userId}:${req.method}:${req.path}:${JSON.stringify(req.body)}`;
    const now = Date.now();
    
    const lastRequestTime = requestMap.get(requestKey);
    
    if (lastRequestTime && (now - lastRequestTime) < windowMs) {
      logger.warn('Duplicate request detected', {
        userId,
        method: req.method,
        path: req.path,
        timeSinceLastRequest: now - lastRequestTime
      });
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'Duplicate request detected. Please wait before retrying.'
        }
      });
    }
    
    requestMap.set(requestKey, now);
    
    // Clean up old entries periodically
    if (requestMap.size > 10000) {
      const cutoff = now - windowMs * 2;
      for (const [key, timestamp] of requestMap.entries()) {
        if (timestamp < cutoff) {
          requestMap.delete(key);
        }
      }
    }
    
    next();
  };
}

/**
 * Utility function to parse size strings (e.g., "10mb", "1gb")
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * Batch request middleware for handling multiple operations
 */
export function batchRequestMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== '/batch' || req.method !== 'POST') {
      return next();
    }
    
    const { requests } = req.body;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH_REQUEST',
          message: 'Batch request must contain an array of requests'
        }
      });
    }
    
    if (requests.length > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_SIZE_EXCEEDED',
          message: 'Batch request cannot contain more than 10 operations'
        }
      });
    }
    
    const results = [];
    
    for (const batchReq of requests) {
      try {
        // This would need to be implemented based on your routing structure
        // For now, just return a placeholder
        results.push({
          id: batchReq.id,
          status: 'success',
          data: { message: 'Batch operation placeholder' }
        });
      } catch (error) {
        results.push({
          id: batchReq.id,
          status: 'error',
          error: {
            code: 'BATCH_OPERATION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  };
}