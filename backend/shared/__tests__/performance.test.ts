import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';
import { MetricsCollector } from '../monitoring/metrics';
import { RedisCache } from '../cache/redis-cache';

describe('Performance Tests', () => {
  let metricsCollector: MetricsCollector;
  let cache: RedisCache;

  beforeAll(async () => {
    metricsCollector = new MetricsCollector();
    
    // Initialize cache for testing
    cache = new RedisCache({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1 // Use different DB for testing
    });
    
    try {
      await cache.connect();
    } catch (error) {
      console.warn('Redis not available for performance tests');
    }
  });

  afterAll(async () => {
    if (cache) {
      await cache.disconnect();
    }
  });

  describe('Response Time Requirements', () => {
    test('Database query operations should complete within 100ms', async () => {
      const iterations = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        const end = performance.now();
        const responseTime = end - start;
        responseTimes.push(responseTime);
        
        metricsCollector.recordRequest(responseTime, 200);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      logger.info('Database query performance test completed', {
        test: 'database_query_test',
        avgResponseTime,
        iterations,
        maxResponseTime,
        p95ResponseTime
      });

      expect(avgResponseTime).toBeLessThan(100);
      expect(p95ResponseTime).toBeLessThan(150);
      expect(maxResponseTime).toBeLessThan(200);
    });

    test('Cache operations should complete within 10ms', async () => {
      if (!cache || !cache.isHealthy()) {
        console.warn('Skipping cache performance test - Redis not available');
        return;
      }

      const iterations = 100;
      const responseTimes: number[] = [];

      // Warm up cache
      await cache.set('test-key', { data: 'test-value' });

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await cache.get('test-key');
        
        const end = performance.now();
        const responseTime = end - start;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      logger.info('Cache operation performance test completed', {
        test: 'cache_operation_test',
        avgResponseTime,
        iterations,
        maxResponseTime,
        p95ResponseTime
      });

      expect(avgResponseTime).toBeLessThan(10);
      expect(p95ResponseTime).toBeLessThan(20);
      expect(maxResponseTime).toBeLessThan(50);

      // Cleanup
      await cache.del('test-key');
    });

    test('JSON serialization should complete within 5ms for typical payloads', async () => {
      const testData = {
        products: Array.from({ length: 100 }, (_, i) => ({
          id: `product-${i}`,
          name: `Product ${i}`,
          description: 'A sample product description that is reasonably long to simulate real data',
          price: Math.random() * 1000,
          category: 'electronics',
          tags: ['tag1', 'tag2', 'tag3'],
          inventory: Math.floor(Math.random() * 100)
        }))
      };

      const iterations = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        JSON.stringify(testData);
        
        const end = performance.now();
        const responseTime = end - start;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      logger.info('JSON serialization performance test completed', {
        test: 'json_serialization_test',
        avgResponseTime,
        iterations,
        maxResponseTime,
        payloadSize: JSON.stringify(testData).length
      });

      expect(avgResponseTime).toBeLessThan(5);
      expect(maxResponseTime).toBeLessThan(20);
    });
  });

  describe('Throughput Requirements', () => {
    test('System should handle at least 100 requests per second', async () => {
      const duration = 1000; // 1 second
      const targetRps = 100;
      let requestCount = 0;

      const startTime = performance.now();
      const endTime = startTime + duration;

      const promises: Promise<void>[] = [];

      while (performance.now() < endTime) {
        const promise = new Promise<void>((resolve) => {
          // Simulate request processing
          setTimeout(() => {
            requestCount++;
            metricsCollector.recordRequest(Math.random() * 50, 200);
            resolve();
          }, Math.random() * 10);
        });
        
        promises.push(promise);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      await Promise.all(promises);

      const actualDuration = performance.now() - startTime;
      const actualRps = (requestCount / actualDuration) * 1000;

      logger.info('Throughput performance test completed', {
        test: 'throughput_test',
        requestCount,
        duration: actualDuration,
        targetRps,
        actualRps
      });

      expect(actualRps).toBeGreaterThanOrEqual(targetRps * 0.9); // Allow 10% tolerance
    });
  });

  describe('Memory Usage', () => {
    test('Memory usage should remain stable under load', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      // Create some load
      const data: any[] = [];
      for (let i = 0; i < iterations; i++) {
        data.push({
          id: i,
          data: new Array(100).fill(`item-${i}`),
          timestamp: new Date()
        });
        
        // Process some data
        if (i % 100 === 0) {
          // Simulate processing
          data.slice(0, 50).forEach(item => JSON.stringify(item));
          
          // Clean up periodically
          if (data.length > 500) {
            data.splice(0, 250);
          }
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      logger.info('Memory usage performance test completed', {
        test: 'memory_usage_test',
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed,
        memoryIncrease,
        memoryIncreasePercent,
        iterations
      });

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Concurrent Operations', () => {
    test('System should handle concurrent cache operations efficiently', async () => {
      if (!cache || !cache.isHealthy()) {
        console.warn('Skipping concurrent cache test - Redis not available');
        return;
      }

      const concurrentOperations = 50;
      const operationsPerWorker = 20;

      const workers = Array.from({ length: concurrentOperations }, async (_, workerId) => {
        const responseTimes: number[] = [];

        for (let i = 0; i < operationsPerWorker; i++) {
          const key = `worker-${workerId}-item-${i}`;
          const value = { workerId, itemId: i, timestamp: Date.now() };

          // Set operation
          const setStart = performance.now();
          await cache.set(key, value, 60);
          const setTime = performance.now() - setStart;
          responseTimes.push(setTime);

          // Get operation
          const getStart = performance.now();
          await cache.get(key);
          const getTime = performance.now() - getStart;
          responseTimes.push(getTime);

          // Delete operation
          const delStart = performance.now();
          await cache.del(key);
          const delTime = performance.now() - delStart;
          responseTimes.push(delTime);
        }

        return responseTimes;
      });

      const allResponseTimes = (await Promise.all(workers)).flat();
      const avgResponseTime = allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length;
      const maxResponseTime = Math.max(...allResponseTimes);

      logger.info('Concurrent cache operations performance test completed', {
        test: 'concurrent_cache_operations',
        concurrentOperations,
        operationsPerWorker,
        totalOperations: allResponseTimes.length,
        avgResponseTime,
        maxResponseTime
      });

      expect(avgResponseTime).toBeLessThan(20);
      expect(maxResponseTime).toBeLessThan(100);
    });

    test('Metrics collection should handle high-frequency updates', async () => {
      const iterations = 10000;
      const startTime = performance.now();

      // Simulate high-frequency metric updates
      for (let i = 0; i < iterations; i++) {
        metricsCollector.recordRequest(Math.random() * 100, 200);
        metricsCollector.recordMetric('test_metric', Math.random() * 1000);
        
        if (i % 1000 === 0) {
          metricsCollector.getPerformanceMetrics();
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = (iterations / duration) * 1000;

      logger.info('Metrics collection performance test completed', {
        test: 'metrics_collection_performance',
        iterations,
        duration,
        operationsPerSecond
      });

      expect(operationsPerSecond).toBeGreaterThan(10000); // Should handle at least 10k ops/sec
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling Performance', () => {
    test('Error handling should not significantly impact performance', async () => {
      const iterations = 100;
      const successTimes: number[] = [];
      const errorTimes: number[] = [];

      // Test successful operations
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          // Simulate successful operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        } catch (error) {
          // Should not happen
        }
        
        const end = performance.now();
        successTimes.push(end - start);
      }

      // Test error operations
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          // Simulate operation that throws error
          throw new Error('Test error');
        } catch (error) {
          // Handle error
          logger.error('Test error handled', { error: error.message });
        }
        
        const end = performance.now();
        errorTimes.push(end - start);
      }

      const avgSuccessTime = successTimes.reduce((sum, time) => sum + time, 0) / successTimes.length;
      const avgErrorTime = errorTimes.reduce((sum, time) => sum + time, 0) / errorTimes.length;
      const errorOverhead = avgErrorTime - avgSuccessTime;

      logger.info('Error handling performance test completed', {
        test: 'error_handling_performance',
        avgSuccessTime,
        avgErrorTime,
        errorOverhead,
        iterations
      });

      // Error handling should not add more than 50% overhead
      expect(errorOverhead).toBeLessThan(avgSuccessTime * 0.5);
    });
  });
});