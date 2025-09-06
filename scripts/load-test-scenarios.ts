#!/usr/bin/env ts-node

import { LoadTester, LoadTestConfig } from '../backend/shared/scripts/load-test';
import { logger } from '../backend/shared/utils/logger';

interface ScenarioResult {
  name: string;
  passed: boolean;
  results: any;
  issues: string[];
}

class LoadTestScenarios {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.API_BASE_URL || 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  async runAllScenarios(): Promise<ScenarioResult[]> {
    const scenarios = [
      { name: 'Black Friday Traffic Spike', test: () => this.blackFridayScenario() },
      { name: 'Product Launch Peak', test: () => this.productLaunchScenario() },
      { name: 'Flash Sale Rush', test: () => this.flashSaleScenario() },
      { name: 'Normal Shopping Hours', test: () => this.normalTrafficScenario() },
      { name: 'Search Heavy Load', test: () => this.searchHeavyScenario() },
      { name: 'Checkout Bottleneck', test: () => this.checkoutBottleneckScenario() },
      { name: 'Mobile App Traffic', test: () => this.mobileAppScenario() },
      { name: 'Admin Dashboard Load', test: () => this.adminDashboardScenario() }
    ];

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      console.log(`\n🚀 Running scenario: ${scenario.name}`);
      try {
        const result = await scenario.test();
        results.push(result);
        
        if (result.passed) {
          console.log(`✅ ${scenario.name} - PASSED`);
        } else {
          console.log(`❌ ${scenario.name} - FAILED`);
          result.issues.forEach(issue => console.log(`   - ${issue}`));
        }
      } catch (error) {
        console.log(`💥 ${scenario.name} - ERROR: ${error.message}`);
        results.push({
          name: scenario.name,
          passed: false,
          results: null,
          issues: [`Test execution failed: ${error.message}`]
        });
      }
    }

    return results;
  }

  private async blackFridayScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 500, // High concurrent load
      requestsPerUser: 100,
      rampUpTime: 30, // Quick ramp up
      testDuration: 300, // 5 minutes
      endpoints: [
        {
          method: 'GET',
          path: '/api/products',
          weight: 35,
          expectedStatusCode: 200,
          maxResponseTime: 3000 // Allow higher response time during peak
        },
        {
          method: 'GET',
          path: '/api/products/search?q=deals',
          weight: 25,
          expectedStatusCode: 200,
          maxResponseTime: 3000
        },
        {
          method: 'GET',
          path: '/api/products/category/electronics',
          weight: 20,
          expectedStatusCode: 200,
          maxResponseTime: 3000
        },
        {
          method: 'POST',
          path: '/api/cart/user123/items',
          weight: 15,
          body: { productId: '507f1f77bcf86cd799439011', quantity: 1 },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'POST',
          path: '/api/orders',
          weight: 5,
          body: {
            items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1, price: 99.99 }],
            shippingAddress: { street: '123 Test St', city: 'Test', state: 'TS', zipCode: '12345', country: 'US' }
          },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 201,
          maxResponseTime: 5000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    // Black Friday specific requirements
    if (results.averageResponseTime > 3000) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 3000ms`);
    }
    
    if (results.errorRate > 2) { // Allow higher error rate during peak
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 2%`);
    }
    
    if (results.requestsPerSecond < 100) {
      issues.push(`Throughput ${results.requestsPerSecond.toFixed(2)} RPS is below 100 RPS`);
    }

    return {
      name: 'Black Friday Traffic Spike',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async productLaunchScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 200,
      requestsPerUser: 75,
      rampUpTime: 10, // Very quick ramp up for product launch
      testDuration: 180, // 3 minutes
      endpoints: [
        {
          method: 'GET',
          path: '/api/products/new-product-id',
          weight: 60, // Heavy focus on new product
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'GET',
          path: '/api/products',
          weight: 20,
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'POST',
          path: '/api/cart/user123/items',
          weight: 15,
          body: { productId: 'new-product-id', quantity: 1 },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 200,
          maxResponseTime: 1500
        },
        {
          method: 'GET',
          path: '/api/recommendations/user123',
          weight: 5,
          expectedStatusCode: 200,
          maxResponseTime: 2000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 2000) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 2000ms`);
    }
    
    if (results.errorRate > 1) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 1%`);
    }

    return {
      name: 'Product Launch Peak',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async flashSaleScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 300,
      requestsPerUser: 50,
      rampUpTime: 5, // Very quick ramp up for flash sale
      testDuration: 120, // 2 minutes - short duration like flash sale
      endpoints: [
        {
          method: 'GET',
          path: '/api/products/flash-sale',
          weight: 40,
          expectedStatusCode: 200,
          maxResponseTime: 1500
        },
        {
          method: 'POST',
          path: '/api/cart/user123/items',
          weight: 35, // High add to cart activity
          body: { productId: 'flash-sale-product', quantity: 1 },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 200,
          maxResponseTime: 1000
        },
        {
          method: 'POST',
          path: '/api/orders',
          weight: 20, // High checkout activity
          body: {
            items: [{ productId: 'flash-sale-product', quantity: 1, price: 49.99 }],
            shippingAddress: { street: '123 Test St', city: 'Test', state: 'TS', zipCode: '12345', country: 'US' }
          },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 201,
          maxResponseTime: 3000
        },
        {
          method: 'GET',
          path: '/api/products',
          weight: 5,
          expectedStatusCode: 200,
          maxResponseTime: 2000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 1500) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 1500ms`);
    }
    
    if (results.errorRate > 0.5) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 0.5%`);
    }

    return {
      name: 'Flash Sale Rush',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async normalTrafficScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 50,
      requestsPerUser: 100,
      rampUpTime: 60, // Gradual ramp up
      testDuration: 300, // 5 minutes
      endpoints: [
        {
          method: 'GET',
          path: '/api/products',
          weight: 30,
          expectedStatusCode: 200,
          maxResponseTime: 1000
        },
        {
          method: 'GET',
          path: '/api/products/search?q=laptop',
          weight: 20,
          expectedStatusCode: 200,
          maxResponseTime: 1500
        },
        {
          method: 'GET',
          path: '/api/products/507f1f77bcf86cd799439011',
          weight: 15,
          expectedStatusCode: 200,
          maxResponseTime: 800
        },
        {
          method: 'POST',
          path: '/api/auth/login',
          weight: 10,
          body: { email: 'test@example.com', password: 'testpassword' },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 200,
          maxResponseTime: 1000
        },
        {
          method: 'GET',
          path: '/api/cart/user123',
          weight: 10,
          expectedStatusCode: 200,
          maxResponseTime: 800
        },
        {
          method: 'POST',
          path: '/api/cart/user123/items',
          weight: 10,
          body: { productId: '507f1f77bcf86cd799439011', quantity: 1 },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 200,
          maxResponseTime: 1000
        },
        {
          method: 'GET',
          path: '/api/recommendations/user123',
          weight: 5,
          expectedStatusCode: 200,
          maxResponseTime: 2000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 1000) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 1000ms`);
    }
    
    if (results.errorRate > 0.1) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 0.1%`);
    }

    return {
      name: 'Normal Shopping Hours',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async searchHeavyScenario(): Promise<ScenarioResult> {
    const searchTerms = ['laptop', 'phone', 'headphones', 'camera', 'tablet', 'watch', 'shoes', 'jacket'];
    
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 100,
      requestsPerUser: 80,
      rampUpTime: 20,
      testDuration: 240,
      endpoints: searchTerms.map(term => ({
        method: 'GET' as const,
        path: `/api/products/search?q=${term}`,
        weight: 12,
        expectedStatusCode: 200,
        maxResponseTime: 2000
      })).concat([
        {
          method: 'GET',
          path: '/api/products?category=electronics',
          weight: 4,
          expectedStatusCode: 200,
          maxResponseTime: 1500
        }
      ])
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 2000) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 2000ms`);
    }
    
    if (results.errorRate > 0.5) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 0.5%`);
    }

    return {
      name: 'Search Heavy Load',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async checkoutBottleneckScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 150,
      requestsPerUser: 30,
      rampUpTime: 15,
      testDuration: 180,
      endpoints: [
        {
          method: 'POST',
          path: '/api/orders',
          weight: 60, // Heavy checkout load
          body: {
            items: [
              { productId: '507f1f77bcf86cd799439011', quantity: 1, price: 99.99 },
              { productId: '507f1f77bcf86cd799439012', quantity: 2, price: 49.99 }
            ],
            shippingAddress: { street: '123 Test St', city: 'Test', state: 'TS', zipCode: '12345', country: 'US' },
            paymentMethod: 'credit_card'
          },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 201,
          maxResponseTime: 5000
        },
        {
          method: 'GET',
          path: '/api/cart/user123',
          weight: 25,
          expectedStatusCode: 200,
          maxResponseTime: 1000
        },
        {
          method: 'PUT',
          path: '/api/cart/user123/items/item123',
          weight: 10,
          body: { quantity: 3 },
          headers: { 'Content-Type': 'application/json' },
          expectedStatusCode: 200,
          maxResponseTime: 1500
        },
        {
          method: 'GET',
          path: '/api/orders/user123',
          weight: 5,
          expectedStatusCode: 200,
          maxResponseTime: 2000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 3000) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 3000ms`);
    }
    
    if (results.errorRate > 1) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 1%`);
    }

    return {
      name: 'Checkout Bottleneck',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async mobileAppScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 80,
      requestsPerUser: 60,
      rampUpTime: 30,
      testDuration: 240,
      endpoints: [
        {
          method: 'GET',
          path: '/api/products',
          weight: 25,
          headers: { 'User-Agent': 'EcommerceApp/1.0 (iOS)' },
          expectedStatusCode: 200,
          maxResponseTime: 3000 // Mobile networks can be slower
        },
        {
          method: 'GET',
          path: '/api/products/featured',
          weight: 20,
          headers: { 'User-Agent': 'EcommerceApp/1.0 (Android)' },
          expectedStatusCode: 200,
          maxResponseTime: 3000
        },
        {
          method: 'POST',
          path: '/api/auth/login',
          weight: 15,
          body: { email: 'mobile@example.com', password: 'mobilepass' },
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'EcommerceApp/1.0 (iOS)'
          },
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'GET',
          path: '/api/recommendations/user123',
          weight: 15,
          headers: { 'User-Agent': 'EcommerceApp/1.0 (Android)' },
          expectedStatusCode: 200,
          maxResponseTime: 4000
        },
        {
          method: 'POST',
          path: '/api/cart/user123/items',
          weight: 15,
          body: { productId: '507f1f77bcf86cd799439011', quantity: 1 },
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'EcommerceApp/1.0 (iOS)'
          },
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'GET',
          path: '/api/orders/user123',
          weight: 10,
          headers: { 'User-Agent': 'EcommerceApp/1.0 (Android)' },
          expectedStatusCode: 200,
          maxResponseTime: 3000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 3000) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 3000ms`);
    }
    
    if (results.errorRate > 0.5) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 0.5%`);
    }

    return {
      name: 'Mobile App Traffic',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  private async adminDashboardScenario(): Promise<ScenarioResult> {
    const config: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 20, // Fewer admin users
      requestsPerUser: 100,
      rampUpTime: 10,
      testDuration: 300,
      endpoints: [
        {
          method: 'GET',
          path: '/api/admin/orders',
          weight: 25,
          headers: { 'Authorization': 'Bearer admin-token' },
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'GET',
          path: '/api/admin/products',
          weight: 20,
          headers: { 'Authorization': 'Bearer admin-token' },
          expectedStatusCode: 200,
          maxResponseTime: 2000
        },
        {
          method: 'GET',
          path: '/api/admin/users',
          weight: 15,
          headers: { 'Authorization': 'Bearer admin-token' },
          expectedStatusCode: 200,
          maxResponseTime: 3000
        },
        {
          method: 'GET',
          path: '/api/admin/analytics',
          weight: 15,
          headers: { 'Authorization': 'Bearer admin-token' },
          expectedStatusCode: 200,
          maxResponseTime: 5000 // Analytics can be slower
        },
        {
          method: 'PUT',
          path: '/api/orders/order123/status',
          weight: 10,
          body: { status: 'processing' },
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          },
          expectedStatusCode: 200,
          maxResponseTime: 1500
        },
        {
          method: 'POST',
          path: '/api/products',
          weight: 10,
          body: {
            name: 'New Product',
            description: 'Test product',
            price: 99.99,
            category: 'Test',
            inventory: 100
          },
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          },
          expectedStatusCode: 201,
          maxResponseTime: 2000
        },
        {
          method: 'GET',
          path: '/api/recommendations/performance',
          weight: 5,
          headers: { 'Authorization': 'Bearer admin-token' },
          expectedStatusCode: 200,
          maxResponseTime: 3000
        }
      ]
    };

    const tester = new LoadTester(config);
    const results = await tester.runLoadTest();

    const issues: string[] = [];
    
    if (results.averageResponseTime > 2500) {
      issues.push(`Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds 2500ms`);
    }
    
    if (results.errorRate > 0.1) {
      issues.push(`Error rate ${results.errorRate.toFixed(2)}% exceeds 0.1%`);
    }

    return {
      name: 'Admin Dashboard Load',
      passed: issues.length === 0,
      results,
      issues
    };
  }

  generateReport(results: ScenarioResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST SCENARIOS SUMMARY REPORT');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`\nOverall Results: ${passed}/${results.length} scenarios passed`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${status} ${result.name}`);
      
      if (result.results) {
        console.log(`  Requests: ${result.results.totalRequests}`);
        console.log(`  Success Rate: ${((result.results.successfulRequests / result.results.totalRequests) * 100).toFixed(1)}%`);
        console.log(`  Avg Response Time: ${result.results.averageResponseTime.toFixed(0)}ms`);
        console.log(`  Throughput: ${result.results.requestsPerSecond.toFixed(1)} RPS`);
      }
      
      if (result.issues.length > 0) {
        console.log('  Issues:');
        result.issues.forEach(issue => console.log(`    - ${issue}`));
      }
    });
    
    if (failed > 0) {
      console.log('\n⚠️  Performance issues detected. Review failed scenarios.');
    } else {
      console.log('\n🎉 All load test scenarios passed successfully!');
    }
  }
}

// CLI execution
if (require.main === module) {
  const scenarios = new LoadTestScenarios();
  
  scenarios.runAllScenarios()
    .then(results => {
      scenarios.generateReport(results);
      
      const failedCount = results.filter(r => !r.passed).length;
      process.exit(failedCount > 0 ? 1 : 0);
    })
    .catch(error => {
      logger.error('Load test scenarios failed:', error);
      process.exit(1);
    });
}

export { LoadTestScenarios };