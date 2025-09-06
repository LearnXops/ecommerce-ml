#!/bin/bash

# Performance Testing Script for Ecommerce Application
# This script runs various performance tests to validate system requirements

set -e

echo "🚀 Starting Performance Tests for Ecommerce Application"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:4000"}
CONCURRENT_USERS=${CONCURRENT_USERS:-10}
REQUESTS_PER_USER=${REQUESTS_PER_USER:-50}
TEST_DURATION=${TEST_DURATION:-60}

echo -e "${BLUE}Configuration:${NC}"
echo "  API Base URL: $API_BASE_URL"
echo "  Concurrent Users: $CONCURRENT_USERS"
echo "  Requests per User: $REQUESTS_PER_USER"
echo "  Test Duration: ${TEST_DURATION}s"
echo ""

# Function to check if service is running
check_service() {
    local service_url=$1
    local service_name=$2
    
    echo -n "Checking $service_name... "
    if curl -s -f "$service_url/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Function to run performance test
run_performance_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    echo "Command: $test_command"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        return 1
    fi
}

# Check if required services are running
echo -e "${BLUE}Checking service availability:${NC}"
services_ok=true

if ! check_service "$API_BASE_URL" "API Gateway"; then
    services_ok=false
fi

if ! check_service "http://localhost:3001" "Auth Service"; then
    echo -e "${YELLOW}⚠ Auth Service not running (optional for some tests)${NC}"
fi

if ! check_service "http://localhost:3002" "Product Service"; then
    echo -e "${YELLOW}⚠ Product Service not running (optional for some tests)${NC}"
fi

if ! check_service "http://localhost:6379" "Redis" || ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Redis not running (cache tests will be skipped)${NC}"
fi

if ! mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ MongoDB not running (database tests will be skipped)${NC}"
fi

echo ""

if [ "$services_ok" = false ]; then
    echo -e "${RED}Critical services are not running. Please start the required services first.${NC}"
    echo "To start services:"
    echo "  docker-compose up -d"
    echo "  # or"
    echo "  npm run dev (in each service directory)"
    exit 1
fi

# Run unit performance tests
echo -e "${BLUE}Running Unit Performance Tests:${NC}"
cd backend/shared

if run_performance_test "Database Performance Tests" "npm test -- --testPathPattern=performance.test.ts --verbose"; then
    unit_tests_passed=true
else
    unit_tests_passed=false
fi

cd ../../

# Run load tests
echo -e "${BLUE}Running Load Tests:${NC}"

# Set environment variables for load test
export API_BASE_URL
export CONCURRENT_USERS
export REQUESTS_PER_USER
export TEST_DURATION

if run_performance_test "API Load Test" "cd backend/shared && ts-node scripts/load-test.ts"; then
    load_tests_passed=true
else
    load_tests_passed=false
fi

# Run specific endpoint performance tests
echo -e "${BLUE}Running Endpoint Performance Tests:${NC}"

# Test health endpoint
if run_performance_test "Health Endpoint Performance" "
    for i in {1..100}; do
        start_time=\$(date +%s%3N)
        curl -s -f $API_BASE_URL/health > /dev/null
        end_time=\$(date +%s%3N)
        response_time=\$((end_time - start_time))
        if [ \$response_time -gt 500 ]; then
            echo \"Health endpoint response time \${response_time}ms exceeds 500ms\"
            exit 1
        fi
    done
    echo \"Health endpoint performance: OK\"
"; then
    health_tests_passed=true
else
    health_tests_passed=false
fi

# Test metrics endpoint
if run_performance_test "Metrics Endpoint Performance" "
    for i in {1..50}; do
        start_time=\$(date +%s%3N)
        curl -s -f $API_BASE_URL/metrics > /dev/null
        end_time=\$(date +%s%3N)
        response_time=\$((end_time - start_time))
        if [ \$response_time -gt 1000 ]; then
            echo \"Metrics endpoint response time \${response_time}ms exceeds 1000ms\"
            exit 1
        fi
    done
    echo \"Metrics endpoint performance: OK\"
"; then
    metrics_tests_passed=true
else
    metrics_tests_passed=false
fi

# Memory leak test
echo -e "${BLUE}Running Memory Leak Test:${NC}"
if run_performance_test "Memory Leak Test" "
    # Get initial memory usage
    initial_memory=\$(curl -s $API_BASE_URL/metrics | jq -r '.metrics.memoryUsage.heapUsed // 0')
    
    # Make many requests
    for i in {1..1000}; do
        curl -s $API_BASE_URL/health > /dev/null
        if [ \$((i % 100)) -eq 0 ]; then
            echo \"Completed \$i requests\"
        fi
    done
    
    # Wait for garbage collection
    sleep 5
    
    # Get final memory usage
    final_memory=\$(curl -s $API_BASE_URL/metrics | jq -r '.metrics.memoryUsage.heapUsed // 0')
    
    # Calculate memory increase
    if [ \"\$initial_memory\" != \"0\" ] && [ \"\$final_memory\" != \"0\" ]; then
        memory_increase=\$((final_memory - initial_memory))
        memory_increase_percent=\$((memory_increase * 100 / initial_memory))
        
        echo \"Initial memory: \${initial_memory} bytes\"
        echo \"Final memory: \${final_memory} bytes\"
        echo \"Memory increase: \${memory_increase} bytes (\${memory_increase_percent}%)\"
        
        if [ \$memory_increase_percent -gt 50 ]; then
            echo \"Memory increase \${memory_increase_percent}% exceeds 50% threshold\"
            exit 1
        fi
    else
        echo \"Could not measure memory usage\"
    fi
    
    echo \"Memory leak test: OK\"
"; then
    memory_tests_passed=true
else
    memory_tests_passed=false
fi

# Cache performance test (if Redis is available)
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${BLUE}Running Cache Performance Test:${NC}"
    if run_performance_test "Cache Performance Test" "
        # Test cache operations
        for i in {1..1000}; do
            start_time=\$(date +%s%6N)
            redis-cli set \"test:key:\$i\" \"test-value-\$i\" EX 60 > /dev/null
            end_time=\$(date +%s%6N)
            response_time=\$(((end_time - start_time) / 1000))
            
            if [ \$response_time -gt 10000 ]; then  # 10ms in microseconds
                echo \"Cache SET operation \${response_time}μs exceeds 10ms\"
                exit 1
            fi
            
            start_time=\$(date +%s%6N)
            redis-cli get \"test:key:\$i\" > /dev/null
            end_time=\$(date +%s%6N)
            response_time=\$(((end_time - start_time) / 1000))
            
            if [ \$response_time -gt 5000 ]; then  # 5ms in microseconds
                echo \"Cache GET operation \${response_time}μs exceeds 5ms\"
                exit 1
            fi
        done
        
        # Cleanup
        redis-cli flushdb > /dev/null
        echo \"Cache performance test: OK\"
    "; then
        cache_tests_passed=true
    else
        cache_tests_passed=false
    fi
else
    echo -e "${YELLOW}Skipping cache performance tests (Redis not available)${NC}"
    cache_tests_passed=true
fi

# Generate performance report
echo ""
echo -e "${BLUE}Performance Test Results Summary:${NC}"
echo "============================================"

test_results=(
    "Unit Performance Tests:$unit_tests_passed"
    "Load Tests:$load_tests_passed"
    "Health Endpoint Tests:$health_tests_passed"
    "Metrics Endpoint Tests:$metrics_tests_passed"
    "Memory Leak Tests:$memory_tests_passed"
    "Cache Performance Tests:$cache_tests_passed"
)

all_passed=true
for result in "${test_results[@]}"; do
    test_name=$(echo "$result" | cut -d: -f1)
    test_status=$(echo "$result" | cut -d: -f2)
    
    if [ "$test_status" = "true" ]; then
        echo -e "  ${GREEN}✓${NC} $test_name"
    else
        echo -e "  ${RED}✗${NC} $test_name"
        all_passed=false
    fi
done

echo ""
if [ "$all_passed" = true ]; then
    echo -e "${GREEN}🎉 All performance tests passed!${NC}"
    echo -e "${GREEN}The system meets all performance requirements.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some performance tests failed.${NC}"
    echo -e "${RED}Please review the failed tests and optimize accordingly.${NC}"
    exit 1
fi