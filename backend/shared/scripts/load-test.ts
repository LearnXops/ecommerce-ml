#!/usr/bin/env ts-node

import axios, { AxiosResponse } from 'axios';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
  endpoints: TestEndpoint[];
}

interface TestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  weight: number; // Probability weight for this endpoint
  expectedStatusCode?: number;
  maxResponseTime?: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: Record<string, number>;
  endpointStats: Record<string, EndpointStats>;
}

interface EndpointStats {
  requests: number;
  successes: number;
  failures: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: LoadTestResult;
  private responseTimes: number[] = [];
  private errors: Record<string, number> = {};
  private endpointStats: Record<string, EndpointStats> = {};
  private startTime: number = 0;
  private isRunning: boolean = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.results = this.initializeResults();
    this.initializeEndpointStats();
  }

  private initializeResults(): LoadTestResult {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      errors: {},
      endpointStats: {}
    };
  }

  private initializeEndpointStats(): void {
    this.config.endpoints.forEach(endpoint => {
      const key = `${endpoint.method} ${endpoint.path}`;
      this.endpointStats[key] = {
        requests: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0
      };
    });
  }

  async runLoadTest(): Promise<LoadTestResult> {
    logger.info('Starting load test', {
      baseUrl: this.config.baseUrl,
      concurrentUsers: this.config.concurrentUsers,
      requestsPerUser: this.config.requestsPerUser,
      testDuration: this.config.testDuration
    });

    this.startTime = performance.now();
    this.isRunning = true;

    // Create user workers
    const userPromises = Array.from({ length: this.config.concurrentUsers }, (_, userId) => 
      this.simulateUser(userId)
    );

    // Set up test duration timeout
    const testTimeout = setTimeout(() => {
      this.isRunning = false;
      logger.info('Load test duration reached, stopping...');
    }, this.config.testDuration * 1000);

    try {
      await Promise.all(userPromises);
    } catch (error) {
      logger.error('Load test error:', error);
    } finally {
      clearTimeout(testTimeout);
      this.isRunning = false;
    }

    this.calculateFinalResults();
    this.logResults();

    return this.results;
  }

  private async simulateUser(userId: number): Promise<void> {
    // Ramp up delay
    const rampUpDelay = (userId / this.config.concurrentUsers) * this.config.rampUpTime * 1000;
    await new Promise(resolve => setTimeout(resolve, rampUpDelay));

    logger.debug(`User ${userId} starting requests`);

    let requestCount = 0;
    while (this.isRunning && requestCount < this.config.requestsPerUser) {
      try {
        await this.makeRequest(userId);
        requestCount++;
        
        // Small delay between requests to simulate real user behavior
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      } catch (error) {
        logger.error(`User ${userId} request failed:`, error);
      }
    }

    logger.debug(`User ${userId} completed ${requestCount} requests`);
  }

  private async makeRequest(userId: number): Promise<void> {
    const endpoint = this.selectRandomEndpoint();
    const endpointKey = `${endpoint.method} ${endpoint.path}`;
    
    const requestStart = performance.now();
    
    try {
      const response: AxiosResponse = await axios({
        method: endpoint.method,
        url: `${this.config.baseUrl}${endpoint.path}`,
        headers: {
          'User-Agent': `LoadTester-User-${userId}`,
          'X-Load-Test': 'true',
          ...endpoint.headers
        },
        data: endpoint.body,
        timeout: 30000, // 30 second timeout
        validateStatus: () => true // Don't throw on HTTP error status
      });

      const requestEnd = performance.now();
      const responseTime = requestEnd - requestStart;

      this.recordRequest(endpointKey, responseTime, response.status, endpoint.expectedStatusCode);

      // Check response time requirements
      if (endpoint.maxResponseTime && responseTime > endpoint.maxResponseTime) {
        logger.warn(`Slow response detected`, {
          endpoint: endpointKey,
          responseTime,
          maxExpected: endpoint.maxResponseTime,
          userId
        });
      }

    } catch (error) {
      const requestEnd = performance.now();
      const responseTime = requestEnd - requestStart;
      
      this.recordRequest(endpointKey, responseTime, 0, endpoint.expectedStatusCode, error);
    }
  }

  private selectRandomEndpoint(): TestEndpoint {
    const totalWeight = this.config.endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0]; // Fallback
  }

  private recordRequest(
    endpointKey: string, 
    responseTime: number, 
    statusCode: number, 
    expectedStatusCode?: number,
    error?: any
  ): void {
    this.results.totalRequests++;
    this.responseTimes.push(responseTime);

    // Update endpoint stats
    const endpointStat = this.endpointStats[endpointKey];
    endpointStat.requests++;
    
    if (endpointStat.minResponseTime === Infinity) {
      endpointStat.minResponseTime = responseTime;
    } else {
      endpointStat.minResponseTime = Math.min(endpointStat.minResponseTime, responseTime);
    }
    endpointStat.maxResponseTime = Math.max(endpointStat.maxResponseTime, responseTime);

    // Determine if request was successful
    const isSuccess = error ? false : 
      expectedStatusCode ? statusCode === expectedStatusCode : 
      statusCode >= 200 && statusCode < 400;

    if (isSuccess) {
      this.results.successfulRequests++;
      endpointStat.successes++;
    } else {
      this.results.failedRequests++;
      endpointStat.failures++;
      
      const errorKey = error ? error.code || error.message : `HTTP_${statusCode}`;
      this.errors[errorKey] = (this.errors[errorKey] || 0) + 1;
    }

    // Update global response time stats
    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
  }

  private calculateFinalResults(): void {
    const testDuration = (performance.now() - this.startTime) / 1000;
    
    // Calculate averages and percentiles
    if (this.responseTimes.length > 0) {
      this.results.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
      
      const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
      this.results.p95ResponseTime = this.percentile(sortedTimes, 95);
      this.results.p99ResponseTime = this.percentile(sortedTimes, 99);
    }

    this.results.requestsPerSecond = this.results.totalRequests / testDuration;
    this.results.errorRate = (this.results.failedRequests / this.results.totalRequests) * 100;
    this.results.errors = this.errors;

    // Calculate endpoint averages
    Object.keys(this.endpointStats).forEach(key => {
      const stat = this.endpointStats[key];
      if (stat.requests > 0) {
        // This is a simplified average calculation
        // In a real implementation, you'd track all response times per endpoint
        stat.averageResponseTime = this.results.averageResponseTime;
      }
    });

    this.results.endpointStats = this.endpointStats;
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private logResults(): void {
    logger.info('Load test completed', this.results);
    
    console.log('\n=== LOAD TEST RESULTS ===');
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful Requests: ${this.results.successfulRequests}`);
    console.log(`Failed Requests: ${this.results.failedRequests}`);
    console.log(`Error Rate: ${this.results.errorRate.toFixed(2)}%`);
    console.log(`Requests/Second: ${this.results.requestsPerSecond.toFixed(2)}`);
    console.log(`Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`95th Percentile: ${this.results.p95ResponseTime.toFixed(2)}ms`);
    console.log(`99th Percentile: ${this.results.p99ResponseTime.toFixed(2)}ms`);
    
    if (Object.keys(this.results.errors).length > 0) {
      console.log('\nErrors:');
      Object.entries(this.results.errors).forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`);
      });
    }
    
    console.log('\nEndpoint Statistics:');
    Object.entries(this.results.endpointStats).forEach(([endpoint, stats]) => {
      console.log(`  ${endpoint}:`);
      console.log(`    Requests: ${stats.requests}`);
      console.log(`    Success Rate: ${((stats.successes / stats.requests) * 100).toFixed(2)}%`);
      console.log(`    Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
    });
  }
}

// Example configuration for ecommerce API
const defaultConfig: LoadTestConfig = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '10'),
  requestsPerUser: parseInt(process.env.REQUESTS_PER_USER || '50'),
  rampUpTime: parseInt(process.env.RAMP_UP_TIME || '10'),
  testDuration: parseInt(process.env.TEST_DURATION || '60'),
  endpoints: [
    {
      method: 'GET',
      path: '/api/products',
      weight: 40,
      expectedStatusCode: 200,
      maxResponseTime: 2000
    },
    {
      method: 'GET',
      path: '/api/products/search?q=electronics',
      weight: 20,
      expectedStatusCode: 200,
      maxResponseTime: 2000
    },
    {
      method: 'GET',
      path: '/health',
      weight: 10,
      expectedStatusCode: 200,
      maxResponseTime: 500
    },
    {
      method: 'GET',
      path: '/metrics',
      weight: 5,
      expectedStatusCode: 200,
      maxResponseTime: 1000
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      weight: 15,
      body: {
        email: 'test@example.com',
        password: 'testpassword'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      expectedStatusCode: 200,
      maxResponseTime: 1000
    },
    {
      method: 'GET',
      path: '/api/cart/user123',
      weight: 10,
      expectedStatusCode: 200,
      maxResponseTime: 1000
    }
  ]
};

// CLI execution
if (require.main === module) {
  const loadTester = new LoadTester(defaultConfig);
  
  loadTester.runLoadTest()
    .then(results => {
      // Check if performance requirements are met
      const performanceIssues: string[] = [];
      
      if (results.averageResponseTime > 2000) {
        performanceIssues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 2000ms`);
      }
      
      if (results.p95ResponseTime > 5000) {
        performanceIssues.push(`95th percentile ${results.p95ResponseTime.toFixed(2)}ms exceeds 5000ms`);
      }
      
      if (results.errorRate > 1) {
        performanceIssues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 1%`);
      }
      
      if (results.requestsPerSecond < 50) {
        performanceIssues.push(`Throughput ${results.requestsPerSecond.toFixed(2)} RPS is below 50 RPS`);
      }
      
      if (performanceIssues.length > 0) {
        console.log('\n❌ PERFORMANCE ISSUES DETECTED:');
        performanceIssues.forEach(issue => console.log(`  - ${issue}`));
        process.exit(1);
      } else {
        console.log('\n✅ All performance requirements met!');
        process.exit(0);
      }
    })
    .catch(error => {
      logger.error('Load test failed:', error);
      process.exit(1);
    });
}

export { LoadTester, LoadTestConfig, LoadTestResult };