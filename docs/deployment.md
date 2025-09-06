# Deployment Guide

This guide covers deployment of the ecommerce application in both Docker Compose (local development) and Kubernetes (Kind cluster) environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Health Checks](#health-checks)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Common Requirements

- Docker 20.10+ and Docker Compose 2.0+
- Git
- At least 8GB RAM and 20GB disk space

### For Kubernetes Deployment

- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) 0.17+
- [kubectl](https://kubernetes.io/docs/tasks/tools/) 1.25+

### Installation Commands

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.17.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

## Docker Compose Deployment

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ecommerce-app

# Deploy development environment
./scripts/deploy-docker.sh dev

# Check service health
./scripts/deploy-docker.sh health

# View logs
./scripts/deploy-docker.sh logs
```

### Available Commands

```bash
# Development deployment
./scripts/deploy-docker.sh dev

# Production deployment
./scripts/deploy-docker.sh prod

# Show logs
./scripts/deploy-docker.sh logs

# Stop services
./scripts/deploy-docker.sh stop

# Clean up (removes volumes)
./scripts/deploy-docker.sh clean

# Check health
./scripts/deploy-docker.sh health
```

### Service URLs (Development)

- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Auth Service: http://localhost:3001
- Product Service: http://localhost:3002
- Cart Service: http://localhost:3003
- Order Service: http://localhost:3004
- ML Service: http://localhost:3005
- MongoDB: localhost:27017
- Redis: localhost:6379

### Production Configuration

For production deployment, create a `.env` file with the following variables:

```bash
# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-key-here

# Database Configuration
MONGODB_PASSWORD=your-secure-mongodb-password

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Kubernetes Deployment

### Quick Start

```bash
# Full deployment (creates cluster, builds images, deploys)
./scripts/deploy-k8s.sh deploy

# Check deployment status
./scripts/deploy-k8s.sh status

# Get service URLs
./scripts/deploy-k8s.sh urls
```

### Available Commands

```bash
# Full deployment
./scripts/deploy-k8s.sh deploy

# Check status
./scripts/deploy-k8s.sh status

# Get service URLs
./scripts/deploy-k8s.sh urls

# Show logs for a service
./scripts/deploy-k8s.sh logs <service-name>

# Clean up everything
./scripts/deploy-k8s.sh clean

# Create cluster only
./scripts/deploy-k8s.sh cluster

# Build and push images only
./scripts/deploy-k8s.sh build
```

### Cluster Architecture

The Kind cluster includes:

- 1 Control plane node
- 2 Worker nodes
- Local Docker registry (localhost:5001)
- LoadBalancer services for external access

### Service Configuration

Each service runs with:

- 2 replicas for high availability
- Resource limits and requests
- Liveness and readiness probes
- Proper security contexts

### Accessing Services

After deployment, services are accessible via LoadBalancer:

```bash
# Get service URLs
./scripts/deploy-k8s.sh urls

# Example output:
# Frontend: http://localhost:80
# API Gateway: http://localhost:4000
```

## Environment Configuration

### Docker Compose

Environment variables are configured in:

- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `.env` file (production secrets)

### Kubernetes

Configuration is managed through:

- `k8s/configmap.yaml` (non-sensitive config)
- `k8s/secrets.yaml` (sensitive data)

Update secrets before deployment:

```bash
# Encode secrets in base64
echo -n "your-jwt-secret" | base64
echo -n "your-mongodb-password" | base64

# Update k8s/secrets.yaml with encoded values
```

## Health Checks

### Docker Health Checks

All services include Docker health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Kubernetes Probes

Services include both liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Health Check Endpoints

Each service exposes a `/health` endpoint:

- Returns 200 OK when healthy
- Includes dependency checks (database connections)
- Used by Docker and Kubernetes health checks

## Troubleshooting

### Common Issues

#### Docker Compose

**Services not starting:**
```bash
# Check logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Rebuild and restart
docker-compose up --build <service-name>
```

**Database connection issues:**
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify MongoDB is running
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker-compose exec redis redis-cli ping
```

**Port conflicts:**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop <service-name>
```

#### Kubernetes

**Pods not starting:**
```bash
# Check pod status
kubectl get pods -n ecommerce

# Describe problematic pod
kubectl describe pod <pod-name> -n ecommerce

# Check logs
kubectl logs <pod-name> -n ecommerce
```

**Image pull errors:**
```bash
# Check if images exist in registry
docker images | grep localhost:5001

# Rebuild and push images
./scripts/deploy-k8s.sh build
```

**Service connectivity issues:**
```bash
# Test service connectivity
kubectl exec -it <pod-name> -n ecommerce -- curl http://service-name:port/health

# Check service endpoints
kubectl get endpoints -n ecommerce
```

### Debugging Commands

```bash
# Docker Compose
docker-compose ps                    # Service status
docker-compose logs -f              # Follow logs
docker-compose exec <service> bash  # Shell into container

# Kubernetes
kubectl get all -n ecommerce         # All resources
kubectl describe deployment <name>   # Deployment details
kubectl exec -it <pod> -- /bin/sh   # Shell into pod
```

### Performance Tuning

#### Resource Limits

Adjust resource limits in Kubernetes manifests:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "200m"
```

#### Database Optimization

MongoDB indexes are automatically created via init script:

```javascript
// Product search optimization
db.products.createIndex({ name: "text", description: "text" });
db.products.createIndex({ category: 1 });

// User lookup optimization
db.users.createIndex({ email: 1 }, { unique: true });
```

### Monitoring

#### Docker Compose

```bash
# Resource usage
docker stats

# Service health
curl http://localhost:4000/health
```

#### Kubernetes

```bash
# Resource usage
kubectl top pods -n ecommerce
kubectl top nodes

# Service health
kubectl get pods -n ecommerce -o wide
```

## Security Considerations

### Production Deployment

1. **Change default passwords** in secrets
2. **Use proper TLS certificates** for HTTPS
3. **Configure firewall rules** appropriately
4. **Enable audit logging** in Kubernetes
5. **Regularly update base images** for security patches

### Network Security

- Services communicate only within their network
- External access only through LoadBalancer services
- Database access restricted to application services

### Data Protection

- Persistent volumes for data durability
- Regular backup procedures recommended
- Secrets stored in Kubernetes secrets or environment variables