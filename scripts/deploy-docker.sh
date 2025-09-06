#!/bin/bash

# Docker Compose deployment script for ecommerce application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Dependencies check passed."
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p scripts
    mkdir -p logs
}

# Build and start services
deploy_development() {
    print_status "Deploying development environment..."
    
    # Stop any existing containers
    docker-compose down --remove-orphans
    
    # Build and start services
    docker-compose up --build -d
    
    print_status "Development environment deployed successfully!"
    print_status "Services are starting up. This may take a few minutes..."
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
}

deploy_production() {
    print_status "Deploying production environment..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning "No .env file found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Please update .env file with production values before continuing."
            exit 1
        else
            print_error ".env.example file not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    # Stop any existing containers
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # Build and start services
    docker-compose -f docker-compose.prod.yml up --build -d
    
    print_status "Production environment deployed successfully!"
    print_status "Services are starting up. This may take a few minutes..."
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 60
    
    # Check service health
    check_service_health_prod
}

# Check service health
check_service_health() {
    print_status "Checking service health..."
    
    services=("mongodb" "redis" "auth-service" "product-service" "cart-service" "order-service" "ml-service" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            print_status "$service is running"
        else
            print_warning "$service is not running properly"
        fi
    done
}

check_service_health_prod() {
    print_status "Checking production service health..."
    
    services=("mongodb" "redis" "auth-service" "product-service" "cart-service" "order-service" "ml-service" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*Up"; then
            print_status "$service is running"
        else
            print_warning "$service is not running properly"
        fi
    done
}

# Show logs
show_logs() {
    print_status "Showing logs for all services..."
    docker-compose logs -f
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_status "Services stopped."
}

# Clean up
cleanup() {
    print_status "Cleaning up..."
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    print_status "Cleanup completed."
}

# Main script
main() {
    case "$1" in
        "dev"|"development")
            check_dependencies
            create_directories
            deploy_development
            ;;
        "prod"|"production")
            check_dependencies
            create_directories
            deploy_production
            ;;
        "logs")
            show_logs
            ;;
        "stop")
            stop_services
            ;;
        "clean")
            cleanup
            ;;
        "health")
            check_service_health
            ;;
        *)
            echo "Usage: $0 {dev|prod|logs|stop|clean|health}"
            echo ""
            echo "Commands:"
            echo "  dev        Deploy development environment"
            echo "  prod       Deploy production environment"
            echo "  logs       Show logs for all services"
            echo "  stop       Stop all services"
            echo "  clean      Clean up containers and volumes"
            echo "  health     Check service health"
            exit 1
            ;;
    esac
}

main "$@"