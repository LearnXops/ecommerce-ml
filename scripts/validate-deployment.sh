#!/bin/bash

# Deployment validation script for ecommerce application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Test service health endpoint
test_health_endpoint() {
    local service_name="$1"
    local url="$2"
    local timeout="${3:-10}"
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
        print_success "$service_name health check passed"
        return 0
    else
        print_error "$service_name health check failed"
        return 1
    fi
}

# Test Docker Compose deployment
validate_docker_compose() {
    print_info "Validating Docker Compose deployment..."
    
    local failed=0
    
    # Check if containers are running
    local services=("mongodb" "redis" "auth-service" "product-service" "cart-service" "order-service" "ml-service" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            print_success "$service container is running"
        else
            print_error "$service container is not running"
            ((failed++))
        fi
    done
    
    # Test health endpoints
    sleep 5  # Give services time to start
    
    test_health_endpoint "API Gateway" "http://localhost:4000/health" || ((failed++))
    test_health_endpoint "Auth Service" "http://localhost:3001/health" || ((failed++))
    test_health_endpoint "Product Service" "http://localhost:3002/health" || ((failed++))
    test_health_endpoint "Cart Service" "http://localhost:3003/health" || ((failed++))
    test_health_endpoint "Order Service" "http://localhost:3004/health" || ((failed++))
    test_health_endpoint "ML Service" "http://localhost:3005/health" || ((failed++))
    test_health_endpoint "Frontend" "http://localhost:3000" || ((failed++))
    
    # Test database connections
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB connection test passed"
    else
        print_error "MongoDB connection test failed"
        ((failed++))
    fi
    
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis connection test passed"
    else
        print_error "Redis connection test failed"
        ((failed++))
    fi
    
    return $failed
}

# Test Kubernetes deployment
validate_kubernetes() {
    print_info "Validating Kubernetes deployment..."
    
    local failed=0
    local namespace="ecommerce"
    
    # Check if namespace exists
    if kubectl get namespace "$namespace" > /dev/null 2>&1; then
        print_success "Namespace $namespace exists"
    else
        print_error "Namespace $namespace does not exist"
        return 1
    fi
    
    # Check deployments
    local deployments=("mongodb" "redis" "auth-service" "product-service" "cart-service" "order-service" "ml-service" "api-gateway" "frontend")
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$namespace" > /dev/null 2>&1; then
            local ready=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.spec.replicas}')
            
            if [ "$ready" = "$desired" ] && [ "$ready" != "" ]; then
                print_success "$deployment deployment is ready ($ready/$desired)"
            else
                print_error "$deployment deployment is not ready ($ready/$desired)"
                ((failed++))
            fi
        else
            print_error "$deployment deployment does not exist"
            ((failed++))
        fi
    done
    
    # Check services
    local services=("mongodb" "redis" "auth-service" "product-service" "cart-service" "order-service" "ml-service" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        if kubectl get service "$service" -n "$namespace" > /dev/null 2>&1; then
            print_success "$service service exists"
        else
            print_error "$service service does not exist"
            ((failed++))
        fi
    done
    
    # Test health endpoints through port-forward (if LoadBalancer not available)
    print_info "Testing service health endpoints..."
    
    # Get API Gateway port
    local api_port=$(kubectl get service api-gateway -n "$namespace" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "4000")
    local frontend_port=$(kubectl get service frontend -n "$namespace" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "80")
    
    # For Kind clusters, services are accessible via localhost
    test_health_endpoint "API Gateway (K8s)" "http://localhost:$api_port/health" 15 || ((failed++))
    test_health_endpoint "Frontend (K8s)" "http://localhost:$frontend_port" 15 || ((failed++))
    
    return $failed
}

# Test API functionality
test_api_functionality() {
    print_info "Testing API functionality..."
    
    local api_url="$1"
    local failed=0
    
    # Test API Gateway routing
    if curl -f -s --max-time 10 "$api_url/health" > /dev/null 2>&1; then
        print_success "API Gateway is accessible"
    else
        print_error "API Gateway is not accessible"
        ((failed++))
        return $failed
    fi
    
    # Test auth endpoints
    local register_response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$api_url/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"testpass123","firstName":"Test","lastName":"User"}' \
        --max-time 10 2>/dev/null || echo "000")
    
    if [ "$register_response" = "201" ] || [ "$register_response" = "400" ]; then
        print_success "Auth service registration endpoint is working"
    else
        print_warning "Auth service registration endpoint returned: $register_response"
    fi
    
    # Test product endpoints
    local products_response=$(curl -s -w "%{http_code}" -o /dev/null "$api_url/products" --max-time 10 2>/dev/null || echo "000")
    
    if [ "$products_response" = "200" ]; then
        print_success "Product service is working"
    else
        print_warning "Product service returned: $products_response"
    fi
    
    return $failed
}

# Main validation function
main() {
    local deployment_type="$1"
    local total_failed=0
    
    case "$deployment_type" in
        "docker"|"compose")
            validate_docker_compose
            total_failed=$?
            
            if [ $total_failed -eq 0 ]; then
                test_api_functionality "http://localhost:4000/api"
                total_failed=$((total_failed + $?))
            fi
            ;;
        "k8s"|"kubernetes")
            validate_kubernetes
            total_failed=$?
            
            if [ $total_failed -eq 0 ]; then
                test_api_functionality "http://localhost:4000/api"
                total_failed=$((total_failed + $?))
            fi
            ;;
        *)
            echo "Usage: $0 {docker|k8s}"
            echo ""
            echo "Validates deployment for:"
            echo "  docker    Docker Compose deployment"
            echo "  k8s       Kubernetes deployment"
            exit 1
            ;;
    esac
    
    echo ""
    if [ $total_failed -eq 0 ]; then
        print_success "All validation tests passed! 🎉"
        echo ""
        print_info "Your ecommerce application is ready to use:"
        if [ "$deployment_type" = "docker" ] || [ "$deployment_type" = "compose" ]; then
            echo "  Frontend: http://localhost:3000"
            echo "  API: http://localhost:4000/api"
        else
            echo "  Frontend: http://localhost:80"
            echo "  API: http://localhost:4000/api"
        fi
    else
        print_error "$total_failed validation test(s) failed"
        echo ""
        print_info "Check the logs for more details:"
        if [ "$deployment_type" = "docker" ] || [ "$deployment_type" = "compose" ]; then
            echo "  docker-compose logs"
        else
            echo "  kubectl logs -n ecommerce <pod-name>"
        fi
        exit 1
    fi
}

main "$@"