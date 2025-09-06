import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Database optimization utilities for performance improvements
 */
export class DatabaseOptimizer {
  /**
   * Create additional performance indexes for frequently queried fields
   */
  static async createPerformanceIndexes(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      
      logger.info('Creating performance indexes...');

      // User collection additional indexes
      await db.collection('users').createIndex(
        { email: 1, role: 1 },
        { background: true, name: 'email_role_idx' }
      );
      
      // Product collection additional indexes
      await db.collection('products').createIndex(
        { category: 1, price: 1, inventory: 1 },
        { background: true, name: 'category_price_inventory_idx' }
      );
      
      await db.collection('products').createIndex(
        { isActive: 1, createdAt: -1 },
        { background: true, name: 'active_created_idx' }
      );
      
      await db.collection('products').createIndex(
        { tags: 1, category: 1 },
        { background: true, name: 'tags_category_idx' }
      );

      // Order collection additional indexes
      await db.collection('orders').createIndex(
        { userId: 1, status: 1, createdAt: -1 },
        { background: true, name: 'user_status_created_idx' }
      );
      
      await db.collection('orders').createIndex(
        { status: 1, paymentStatus: 1, createdAt: -1 },
        { background: true, name: 'status_payment_created_idx' }
      );
      
      await db.collection('orders').createIndex(
        { 'items.productId': 1 },
        { background: true, name: 'order_items_product_idx' }
      );

      // UserInteraction collection additional indexes
      await db.collection('userinteractions').createIndex(
        { userId: 1, productId: 1, timestamp: -1 },
        { background: true, name: 'user_product_time_idx' }
      );
      
      await db.collection('userinteractions').createIndex(
        { productId: 1, interactionType: 1, timestamp: -1 },
        { background: true, name: 'product_type_time_idx' }
      );
      
      await db.collection('userinteractions').createIndex(
        { sessionId: 1, interactionType: 1 },
        { background: true, name: 'session_type_idx' }
      );

      logger.info('Performance indexes created successfully');
    } catch (error) {
      logger.error('Error creating performance indexes:', error);
      throw error;
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  static async analyzeQueryPerformance(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      
      logger.info('Analyzing query performance...');

      // Get index usage statistics
      const collections = ['users', 'products', 'orders', 'userinteractions'];
      
      for (const collectionName of collections) {
        const stats = await db.collection(collectionName).aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        logger.info(`Index usage for ${collectionName}:`, {
          collection: collectionName,
          indexes: stats.map(stat => ({
            name: stat.name,
            accesses: stat.accesses.ops,
            since: stat.accesses.since
          }))
        });
      }
    } catch (error) {
      logger.error('Error analyzing query performance:', error);
    }
  }

  /**
   * Clean up unused indexes
   */
  static async cleanupUnusedIndexes(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      
      logger.info('Checking for unused indexes...');

      const collections = ['users', 'products', 'orders', 'userinteractions'];
      
      for (const collectionName of collections) {
        const stats = await db.collection(collectionName).aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        const unusedIndexes = stats.filter(stat => 
          stat.accesses.ops === 0 && 
          stat.name !== '_id_' // Never drop the _id index
        );
        
        if (unusedIndexes.length > 0) {
          logger.warn(`Found ${unusedIndexes.length} unused indexes in ${collectionName}:`, 
            unusedIndexes.map(idx => idx.name)
          );
          
          // Optionally drop unused indexes (commented out for safety)
          // for (const index of unusedIndexes) {
          //   await db.collection(collectionName).dropIndex(index.name);
          //   logger.info(`Dropped unused index: ${index.name} from ${collectionName}`);
          // }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up unused indexes:', error);
    }
  }

  /**
   * Get database performance metrics
   */
  static async getPerformanceMetrics(): Promise<any> {
    try {
      const db = mongoose.connection.db;
      
      const serverStatus = await db.admin().serverStatus();
      const dbStats = await db.stats();
      
      return {
        connections: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available,
          totalCreated: serverStatus.connections.totalCreated
        },
        operations: {
          insert: serverStatus.opcounters.insert,
          query: serverStatus.opcounters.query,
          update: serverStatus.opcounters.update,
          delete: serverStatus.opcounters.delete
        },
        memory: {
          resident: serverStatus.mem.resident,
          virtual: serverStatus.mem.virtual,
          mapped: serverStatus.mem.mapped
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize
        }
      };
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }
}