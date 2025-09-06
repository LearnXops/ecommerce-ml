import { createClient } from 'redis';
import { logger } from 'shared/utils/logger';

// Redis client configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection failed');
      }
      return Math.min(retries * 50, 1000);
    }
  }
});

// Redis event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redisClient.on('end', () => {
  logger.info('Redis client disconnected');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Cart-specific Redis operations
export class CartRedisService {
  private static readonly CART_PREFIX = 'cart:';
  private static readonly CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  static getCartKey(userId: string): string {
    return `${this.CART_PREFIX}${userId}`;
  }

  static async getCart(userId: string): Promise<any | null> {
    try {
      const cartData = await redisClient.get(this.getCartKey(userId));
      return cartData ? JSON.parse(cartData) : null;
    } catch (error) {
      logger.error('Error getting cart from Redis:', error);
      throw error;
    }
  }

  static async setCart(userId: string, cartData: any): Promise<void> {
    try {
      const cartKey = this.getCartKey(userId);
      await redisClient.setEx(
        cartKey,
        this.CART_TTL,
        JSON.stringify(cartData)
      );
    } catch (error) {
      logger.error('Error setting cart in Redis:', error);
      throw error;
    }
  }

  static async deleteCart(userId: string): Promise<void> {
    try {
      await redisClient.del(this.getCartKey(userId));
    } catch (error) {
      logger.error('Error deleting cart from Redis:', error);
      throw error;
    }
  }

  static async extendCartTTL(userId: string): Promise<void> {
    try {
      const cartKey = this.getCartKey(userId);
      await redisClient.expire(cartKey, this.CART_TTL);
    } catch (error) {
      logger.error('Error extending cart TTL:', error);
      throw error;
    }
  }

  static async getAllUserCarts(): Promise<string[]> {
    try {
      return await redisClient.keys(`${this.CART_PREFIX}*`);
    } catch (error) {
      logger.error('Error getting all cart keys:', error);
      throw error;
    }
  }

  static async clearAllCarts(): Promise<void> {
    try {
      const cartKeys = await this.getAllUserCarts();
      if (cartKeys.length > 0) {
        await redisClient.del(cartKeys);
      }
    } catch (error) {
      logger.error('Error clearing all carts:', error);
      throw error;
    }
  }
}

export default redisClient;