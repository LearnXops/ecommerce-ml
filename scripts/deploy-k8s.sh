#!/bin/bash

# Kubernetes deployment script for ecommerce application using Kind

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="ecommerce-cluster"
NAMESPACE="ecommerce"
REGISTRY_NAME="kind-registry"
REGISTRY_PORT="5001"

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

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v kind &> /dev/null; then
        missing_deps+=("kind")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_status "Dependencies check passed."
}

# Create Kind cluster with registry
create_cluster() {
    print_header "Creating Kind cluster with local registry..."
    
    # Check if cluster already exists
    if kind get clusters | grep -q "$CLUSTER_NAME"; then
        print_warning "Cluster $CLUSTER_NAME already exists. Skipping creation."
        return 0
    fi
    
    # Create registry container unless it already exists
    if [ "$(docker inspect -f '{{.State.Running}}' "${REGISTRY_NAME}" 2>/dev/null || true)" != 'true' ]; then
        docker run \
            -d --restart=always -p "127.0.0.1:${REGISTRY_PORT}:5000" --name "${REGISTRY_NAME}" \
            registry:2
    fi
    
    # Create Kind cluster config
    cat <<EOF | kind create cluster --name "$CLUSTER_NAME" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:${REGISTRY_PORT}"]
    endpoint = ["http://${REGISTRY_NAME}:5000"]
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
EOF
    
    # Connect the registry to the cluster network if not already connected
    if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${REGISTRY_NAME}")" = 'null' ]; then
        docker network connect "kind" "${REGISTRY_NAME}"
    fi
    
    # Document the local registry
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${REGISTRY_PORT}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF
    
    print_status "Kind cluster created successfully."
}

# Build and push Docker images
build_and_push_images() {
    print_header "Building and pushing Docker images..."
    
    local services=("frontend" "api-gateway" "auth-service" "product-service" "cart-service" "order-service" "ml-service")
    
    for service in "${services[@]}"; do
        print_status "Building $service..."
        
        if [ "$service" = "frontend" ]; then
            docker build -t "localhost:${REGISTRY_PORT}/ecommerce/${service}:latest" ./frontend
        elif [ "$service" = "ml-service" ]; then
            docker build -t "localhost:${REGISTRY_PORT}/ecommerce/${service}:latest" ./ml-service
        else
            docker build -t "localhost:${REGISTRY_PORT}/ecommerce/${service}:latest" "./backend/${service}"
        fi
        
        print_status "Pushing $service..."
        docker push "localhost:${REGISTRY_PORT}/ecommerce/${service}:latest"
    done
    
    print_status "All images built and pushed successfully."
}

# Update Kubernetes manifests with correct image names
update_manifests() {
    print_header "Updating Kubernetes manifests..."
    
    local services=("frontend" "api-gateway" "auth-service" "product-service" "cart-service" "order-service" "ml-service")
    
    for service in "${services[@]}"; do
        if [ -f "k8s/${service}.yaml" ]; then
            sed -i.bak "s|ecommerce/${service}:latest|localhost:${REGISTRY_PORT}/ecommerce/${service}:latest|g" "k8s/${service}.yaml"
        fi
    done
    
    print_status "Manifests updated successfully."
}

# Deploy to Kubernetes
deploy_to_k8s() {
    print_header "Deploying to Kubernetes..."
    
    # Apply manifests in order
    print_status "Creating namespace..."
    kubectl apply -f k8s/namespace.yaml
    
    print_status "Creating secrets and configmaps..."
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/configmap.yaml
    
    print_status "Deploying databases..."
    kubectl apply -f k8s/mongodb.yaml
    kubectl apply -f k8s/redis.yaml
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/redis -n "$NAMESPACE"
    
    print_status "Deploying backend services..."
    kubectl apply -f k8s/auth-service.yaml
    kubectl apply -f k8s/product-service.yaml
    kubectl apply -f k8s/cart-service.yaml
    kubectl apply -f k8s/order-service.yaml
    kubectl apply -f k8s/ml-service.yaml
    
    # Wait for backend services to be ready
    print_status "Waiting for backend services to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/auth-service -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/product-service -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/cart-service -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/order-service -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/ml-service -n "$NAMESPACE"
    
    print_status "Deploying API gateway and frontend..."
    kubectl apply -f k8s/api-gateway.yaml
    kubectl apply -f k8s/frontend.yaml
    
    # Wait for frontend services to be ready
    print_status "Waiting for frontend services to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n "$NAMESPACE"
    
    print_status "Deployment completed successfully!"
}

# Check deployment status
check_status() {
    print_header "Checking deployment status..."
    
    print_status "Pods status:"
    kubectl get pods -n "$NAMESPACE"
    
    print_status "Services status:"
    kubectl get services -n "$NAMESPACE"
    
    print_status "Deployments status:"
    kubectl get deployments -n "$NAMESPACE"
}

# Get service URLs
get_urls() {
    print_header "Getting service URLs..."
    
    # Get LoadBalancer IPs (for Kind, these will be localhost)
    local frontend_port=$(kubectl get service frontend -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "80")
    local api_port=$(kubectl get service api-gateway -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "4000")
    
    print_status "Application URLs:"
    echo "  Frontend: http://localhost:${frontend_port}"
    echo "  API Gateway: http://localhost:${api_port}"
}

# Show logs
show_logs() {
    local service="$1"
    if [ -z "$service" ]; then
        print_status "Available services:"
        kubectl get deployments -n "$NAMESPACE" -o name | sed 's/deployment.apps\///'
        return 0
    fi
    
    print_status "Showing logs for $service..."
    kubectl logs -f deployment/"$service" -n "$NAMESPACE"
}

# Clean up
cleanup() {
    print_header "Cleaning up..."
    
    print_status "Deleting Kubernetes resources..."
    kubectl delete namespace "$NAMESPACE" --ignore-not-found=true
    
    print_status "Deleting Kind cluster..."
    kind delete cluster --name "$CLUSTER_NAME"
    
    print_status "Stopping registry..."
    docker stop "$REGISTRY_NAME" && docker rm "$REGISTRY_NAME"
    
    print_status "Cleanup completed."
}

# Restore manifest backups
restore_manifests() {
    print_status "Restoring original manifests..."
    for file in k8s/*.yaml.bak; do
        if [ -f "$file" ]; then
            mv "$file" "${file%.bak}"
        fi
    done
}

# Main script
main() {
    case "$1" in
        "deploy")
            check_dependencies
            create_cluster
            build_and_push_images
            update_manifests
            deploy_to_k8s
            check_status
            get_urls
            ;;
        "status")
            check_status
            ;;
        "urls")
            get_urls
            ;;
        "logs")
            show_logs "$2"
            ;;
        "clean")
            cleanup
            restore_manifests
            ;;
        "cluster")
            check_dependencies
            create_cluster
            ;;
        "build")
            build_and_push_images
            ;;
        *)
            echo "Usage: $0 {deploy|status|urls|logs [service]|clean|cluster|build}"
            echo ""
            echo "Commands:"
            echo "  deploy     Full deployment (cluster + build + deploy)"
            echo "  status     Check deployment status"
            echo "  urls       Get service URLs"
            echo "  logs       Show logs for a service"
            echo "  clean      Clean up cluster and resources"
            echo "  cluster    Create Kind cluster only"
            echo "  build      Build and push images only"
            exit 1
            ;;
    esac
}

main "$@"