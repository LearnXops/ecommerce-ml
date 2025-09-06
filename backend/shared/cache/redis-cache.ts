import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
}

export class RedisCache {
  private client: Redis;
  private isConnected: boolean = false;

  constructor(config: CacheConfig) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'ecommerce:',
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Redis cache connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis cache disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  isHealthy(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isHealthy()) {
        logger.warn('Redis not healthy, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      if (value === null) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        logger.warn('Redis not healthy, skipping cache set');
        return false;
      }

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isHealthy()) {
        logger.warn('Redis not healthy, skipping cache delete');
        return false;
      }

      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isHealthy()) return false;
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key existence ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.isHealthy()) return false;
      
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  // Product-specific caching methods
  async getProduct(productId: string): Promise<any | null> {
    return this.get(`product:${productId}`);
  }

  async setProduct(productId: string, product: any, ttlSeconds: number = 3600): Promise<boolean> {
    return this.set(`product:${productId}`, product, ttlSeconds);
  }

  async deleteProduct(productId: string): Promise<boolean> {
    return this.del(`product:${productId}`);
  }

  async getProductList(cacheKey: string): Promise<any | null> {
    return this.get(`products:${cacheKey}`);
  }

  async setProductList(cacheKey: string, products: any[], ttlSeconds: number = 1800): Promise<boolean> {
    return this.set(`products:${cacheKey}`, products, ttlSeconds);
  }

  // User session caching methods
  async getUserSession(sessionId: string): Promise<any | null> {
    return this.get(`session:${sessionId}`);
  }

  async setUserSession(sessionId: string, sessionData: any, ttlSeconds: number = 86400): Promise<boolean> {
    return this.set(`session:${sessionId}`, sessionData, ttlSeconds);
  }

  async deleteUserSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Cart caching methods
  async getUserCart(userId: string): Promise<any | null> {
    return this.get(`cart:${userId}`);
  }

  async setUserCart(userId: string, cart: any, ttlSeconds: number = 86400): Promise<boolean> {
    return this.set(`cart:${userId}`, cart, ttlSeconds);
  }

  async deleteUserCart(userId: string): Promise<boolean> {
    return this.del(`cart:${userId}`);
  }

  // Recommendation caching methods
  async getUserRecommendations(userId: string): Promise<any | null> {
    return this.get(`recommendations:${userId}`);
  }

  async setUserRecommendations(userId: string, recommendations: any[], ttlSeconds: number = 7200): Promise<boolean> {
    return this.set(`recommendations:${userId}`, recommendations, ttlSeconds);
  }

  // Search result caching
  async getSearchResults(searchQuery: string, filters: any = {}): Promise<any | null> {
    const cacheKey = this.generateSearchCacheKey(searchQuery, filters);
    return this.get(`search:${cacheKey}`);
  }

  async setSearchResults(searchQuery: string, filters: any = {}, results: any[], ttlSeconds: number = 1800): Promise<boolean> {
    const cacheKey = this.generateSearchCacheKey(searchQuery, filters);
    return this.set(`search:${cacheKey}`, results, ttlSeconds);
  }

  private generateSearchCacheKey(query: string, filters: any): string {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    
    return `${query}:${filterString}`.toLowerCase().replace(/[^a-z0-9:|-]/g, '');
  }

  // Bulk operations
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      if (!this.isHealthy() || keys.length === 0) return [];
      
      const values = await this.client.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Error in bulk get operation:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isHealthy()) return false;
      
      const pipeline = this.client.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          pipeline.setex(key, ttlSeconds, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Error in bulk set operation:', error);
      return false;
    }
  }

  // Pattern-based operations
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isHealthy()) return 0;
      
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      logger.error(`Error deleting keys with pattern ${pattern}:`, error);
      return 0;
    }
  }

  // Cache statistics
  async getStats(): Promise<any> {
    try {
      if (!this.isHealthy()) return null;
      
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.isConnected,
        status: this.client.status
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

export function createCacheInstance(config: CacheConfig): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(config);
  }
  return cacheInstance;
}

export function getCacheInstance(): RedisCache | null {
  return cacheInstance;
}