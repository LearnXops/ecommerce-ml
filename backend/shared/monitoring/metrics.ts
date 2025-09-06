import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceMetrics {
  requestCount: number;
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number; // requests per second
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
}

/**
 * Metrics collector for application monitoring
 */
export class MetricsCollector {
  private metrics: Map<string, MetricData[]> = new Map();
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private activeConnections = 0;

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Keep only last 1000 entries per metric
    if (metricArray.length > 1000) {
      metricArray.shift();
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime: number, statusCode: number): void {
    this.requestCount++;
    this.requestTimes.push(responseTime);

    if (statusCode >= 400) {
      this.errorCount++;
    }

    // Keep only last 1000 response times for percentile calculations
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }

    this.recordMetric('request_count', this.requestCount);
    this.recordMetric('response_time', responseTime);
    this.recordMetric('error_count', this.errorCount);
  }

  /**
   * Record connection metrics
   */
  recordConnection(delta: number): void {
    this.activeConnections += delta;
    this.recordMetric('active_connections', this.activeConnections);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const uptimeSeconds = (now - this.startTime) / 1000;
    const throughput = this.requestCount / uptimeSeconds;

    const responseTime = this.calculateResponseTimeStats();
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      requestCount: this.requestCount,
      responseTime,
      errorRate,
      throughput,
      activeConnections: this.activeConnections,
      memoryUsage: process.memoryUsage(),
      cpuUsage: this.getCpuUsage()
    };
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string, limit?: number): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanMinutes: number = 60): void {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    for (const [name, metricArray] of this.metrics.entries()) {
      const filtered = metricArray.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.requestTimes = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    this.activeConnections = 0;
  }

  private calculateResponseTimeStats() {
    if (this.requestTimes.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.requestTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, time) => acc + time, 0);

    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99)
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private getCpuUsage(): number {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to seconds
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

/**
 * Metrics middleware for Express
 */
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Record new connection
    metricsCollector.recordConnection(1);

    // Override res.end to capture metrics
    const originalEnd = res.end.bind(res);
    
    res.end = function(chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Record request metrics
      metricsCollector.recordRequest(responseTime, res.statusCode);
      
      // Record connection closed
      metricsCollector.recordConnection(-1);
      
      return originalEnd(chunk, encoding);
    };

    next();
  };
}

/**
 * Health check endpoint middleware
 */
export function healthCheckMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health') {
      const metrics = metricsCollector.getPerformanceMetrics();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      // Determine health status based on metrics
      if (metrics.errorRate > 10) {
        health.status = 'degraded';
      }
      
      if (metrics.responseTime.avg > 5000 || metrics.errorRate > 50) {
        health.status = 'unhealthy';
      }

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      return res.status(statusCode).json(health);
    }

    if (req.path === '/metrics') {
      const metrics = metricsCollector.getPerformanceMetrics();
      return res.json({
        timestamp: new Date().toISOString(),
        metrics,
        detailed: {
          metricNames: metricsCollector.getMetricNames(),
          recentRequests: metricsCollector.getMetrics('response_time', 10)
        }
      });
    }

    return next();
  };
}

/**
 * Custom metrics recording functions
 */
export function recordCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
  metricsCollector.recordMetric(name, value, tags);
}

export function getMetricsCollector(): MetricsCollector {
  return metricsCollector;
}

/**
 * Database operation metrics
 */
export function recordDatabaseOperation(operation: string, duration: number, success: boolean): void {
  metricsCollector.recordMetric(`db_${operation}_duration`, duration, { success: success.toString() });
  metricsCollector.recordMetric(`db_${operation}_count`, 1, { success: success.toString() });
}

/**
 * Cache operation metrics
 */
export function recordCacheOperation(operation: string, hit: boolean, duration?: number): void {
  metricsCollector.recordMetric(`cache_${operation}`, 1, { hit: hit.toString() });
  if (duration !== undefined) {
    metricsCollector.recordMetric(`cache_${operation}_duration`, duration);
  }
}

/**
 * External API call metrics
 */
export function recordExternalApiCall(service: string, endpoint: string, duration: number, statusCode: number): void {
  const success = statusCode >= 200 && statusCode < 400;
  metricsCollector.recordMetric('external_api_call', 1, { 
    service, 
    endpoint, 
    success: success.toString(),
    statusCode: statusCode.toString()
  });
  metricsCollector.recordMetric('external_api_duration', duration, { service, endpoint });
}

/**
 * Business metrics
 */
export function recordBusinessMetric(event: string, value: number = 1, metadata?: Record<string, string>): void {
  metricsCollector.recordMetric(`business_${event}`, value, metadata);
}

// Examples of business metrics:
export const BusinessMetrics = {
  userRegistration: () => recordBusinessMetric('user_registration'),
  userLogin: () => recordBusinessMetric('user_login'),
  productView: (productId: string) => recordBusinessMetric('product_view', 1, { productId }),
  addToCart: (productId: string, quantity: number) => recordBusinessMetric('add_to_cart', quantity, { productId }),
  orderPlaced: (orderId: string, amount: number) => recordBusinessMetric('order_placed', amount, { orderId }),
  paymentProcessed: (amount: number, method: string) => recordBusinessMetric('payment_processed', amount, { method })
};

/**
 * Periodic metrics cleanup
 */
setInterval(() => {
  metricsCollector.clearOldMetrics(60); // Clear metrics older than 1 hour
}, 5 * 60 * 1000); // Run every 5 minutes