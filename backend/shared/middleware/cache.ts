import { Request, Response, NextFunction } from 'express';
import { getCacheInstance } from '../cache/redis-cache';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  skipCache?: (req: Request) => boolean;
}

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 3600, // Default 1 hour
    keyGenerator = defaultKeyGenerator,
    condition = () => true,
    skipCache = () => false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const cache = getCacheInstance();
    
    // Skip caching if Redis is not available or condition not met
    if (!cache || !cache.isHealthy() || !condition(req) || skipCache(req)) {
      return next();
    }

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      logger.debug(`Cache miss for key: ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(error => {
            logger.error(`Error caching response for key ${cacheKey}:`, error);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const { method, originalUrl, query, params } = req;
  const userId = (req as any).user?.id || 'anonymous';
  
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  
  const paramsString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${method}:${originalUrl}:${userId}:${queryString}:${paramsString}`;
}

/**
 * Product-specific cache middleware
 */
export function productCacheMiddleware(ttl: number = 3600) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const { method, path, query } = req;
      const queryString = Object.keys(query)
        .sort()
        .map(key => `${key}=${query[key]}`)
        .join('&');
      
      return `products:${method}:${path}:${queryString}`;
    },
    condition: (req) => req.method === 'GET'
  });
}

/**
 * User-specific cache middleware
 */
export function userCacheMiddleware(ttl: number = 1800) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      const { method, path } = req;
      
      return `user:${userId}:${method}:${path}`;
    },
    condition: (req) => {
      const userId = (req as any).user?.id;
      return req.method === 'GET' && !!userId;
    }
  });
}

/**
 * Search cache middleware
 */
export function searchCacheMiddleware(ttl: number = 1800) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const { query } = req;
      const searchParams = Object.keys(query)
        .sort()
        .map(key => `${key}=${query[key]}`)
        .join('&');
      
      return `search:${searchParams}`;
    },
    condition: (req) => req.method === 'GET' && Object.keys(req.query).length > 0
  });
}

/**
 * Cache invalidation middleware
 */
export function cacheInvalidationMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cache = getCacheInstance();
    
    if (!cache || !cache.isHealthy()) {
      return next();
    }

    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            const deletedCount = await cache.deletePattern(pattern);
            if (deletedCount > 0) {
              logger.debug(`Invalidated ${deletedCount} cache entries for pattern: ${pattern}`);
            }
          }
        } catch (error) {
          logger.error('Error invalidating cache:', error);
        }
      }
    };

    // Override response methods
    res.json = function(data: any) {
      invalidateCache();
      return originalJson(data);
    };

    res.send = function(data: any) {
      invalidateCache();
      return originalSend(data);
    };

    next();
  };
}

/**
 * Cache warming utility
 */
export class CacheWarmer {
  private cache = getCacheInstance();

  async warmProductCache(productIds: string[]): Promise<void> {
    if (!this.cache || !this.cache.isHealthy()) {
      logger.warn('Cache not available for warming');
      return;
    }

    try {
      // This would typically fetch from database and cache
      logger.info(`Warming cache for ${productIds.length} products`);
      
      // Implementation would depend on your product service
      // Example: fetch products and cache them
      
    } catch (error) {
      logger.error('Error warming product cache:', error);
    }
  }

  async warmUserRecommendations(userIds: string[]): Promise<void> {
    if (!this.cache || !this.cache.isHealthy()) {
      logger.warn('Cache not available for warming');
      return;
    }

    try {
      logger.info(`Warming recommendation cache for ${userIds.length} users`);
      
      // Implementation would depend on your ML service
      // Example: generate recommendations and cache them
      
    } catch (error) {
      logger.error('Error warming recommendation cache:', error);
    }
  }

  async warmPopularProducts(): Promise<void> {
    if (!this.cache || !this.cache.isHealthy()) {
      logger.warn('Cache not available for warming');
      return;
    }

    try {
      logger.info('Warming popular products cache');
      
      // Implementation: fetch popular products and cache them
      
    } catch (error) {
      logger.error('Error warming popular products cache:', error);
    }
  }
}

/**
 * Cache health check middleware
 */
export function cacheHealthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cache = getCacheInstance();
    
    if (req.path === '/health/cache') {
      if (!cache) {
        return res.status(503).json({
          status: 'error',
          message: 'Cache not initialized'
        });
      }

      const isHealthy = await cache.ping();
      const stats = await cache.getStats();

      return res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        connected: cache.isHealthy(),
        stats
      });
    }

    return next();
  };
}