# Ecommerce Application Deployment

A comprehensive containerized ecommerce application with microservices architecture, deployable via Docker Compose or Kubernetes.

## 🚀 Quick Start

### Docker Compose (Recommended for Development)

```bash
# Clone and deploy
git clone <repository-url>
cd ecommerce-app
./scripts/deploy-docker.sh dev

# Access the application
open http://localhost:3000
```

### Kubernetes with Kind (Production-like Environment)

```bash
# Prerequisites: Install Kind and kubectl
# Full deployment
./scripts/deploy-k8s.sh deploy

# Get access URLs
./scripts/deploy-k8s.sh urls
```

## 📋 Architecture Overview

### Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000/80 | React application with Material-UI |
| API Gateway | 4000 | Request routing and authentication |
| Auth Service | 3001 | User authentication and JWT management |
| Product Service | 3002 | Product catalog and search |
| Cart Service | 3003 | Shopping cart with Redis storage |
| Order Service | 3004 | Order processing and email notifications |
| ML Service | 3005 | Recommendation engine with scikit-learn |
| MongoDB | 27017 | Primary database for all services |
| Redis | 6379 | Cache and session storage |

### Technology Stack

- **Frontend**: React 18, TypeScript, Material-UI, Vite
- **Backend**: Node.js, Express.js, TypeScript
- **ML Service**: Python, Flask, scikit-learn
- **Databases**: MongoDB, Redis
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes (Kind)

## 🛠 Deployment Options

### 1. Docker Compose Development

**Best for**: Local development, testing, quick setup

```bash
# Start development environment
./scripts/deploy-docker.sh dev

# Features:
# - Hot reloading for all services
# - Volume mounts for live code changes
# - Exposed ports for direct service access
# - Development-optimized configurations
```

### 2. Docker Compose Production

**Best for**: Single-server production deployments

```bash
# Create production environment file
cp .env.example .env
# Edit .env with production values

# Deploy production environment
./scripts/deploy-docker.sh prod

# Features:
# - Multi-stage Docker builds
# - Production-optimized images
# - Environment-based configuration
# - Health checks and restart policies
```

### 3. Kubernetes with Kind

**Best for**: Production-like testing, CI/CD, learning Kubernetes

```bash
# Full deployment
./scripts/deploy-k8s.sh deploy

# Features:
# - Multi-node cluster simulation
# - High availability with replicas
# - Resource limits and requests
# - Liveness and readiness probes
# - LoadBalancer services
# - Persistent volumes
```

## 🔧 Configuration

### Environment Variables

#### Development (Docker Compose)
```yaml
# Automatically configured in docker-compose.yml
NODE_ENV: development
MONGODB_URI: mongodb://mongodb:27017/ecommerce_*
REDIS_URL: redis://redis:6379
```

#### Production (Docker Compose)
```bash
# Required in .env file
JWT_SECRET=your-secure-jwt-secret
MONGODB_PASSWORD=your-secure-password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### Kubernetes
```bash
# Update k8s/secrets.yaml with base64 encoded values
echo -n "your-secret" | base64
```

### Database Configuration

MongoDB databases are automatically created:
- `ecommerce_auth` - User accounts and authentication
- `ecommerce_products` - Product catalog
- `ecommerce_orders` - Order history and processing
- `ecommerce_ml` - User interactions for recommendations

## 📊 Monitoring and Health Checks

### Health Endpoints

All services expose `/health` endpoints:

```bash
# Check service health
curl http://localhost:4000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Product Service
# ... etc
```

### Docker Compose Monitoring

```bash
# Service status
./scripts/deploy-docker.sh health

# View logs
./scripts/deploy-docker.sh logs

# Resource usage
docker stats
```

### Kubernetes Monitoring

```bash
# Deployment status
./scripts/deploy-k8s.sh status

# Service logs
./scripts/deploy-k8s.sh logs auth-service

# Resource usage
kubectl top pods -n ecommerce
```

## 🔒 Security Features

### Container Security
- Non-root users in production containers
- Multi-stage builds to minimize attack surface
- Security contexts in Kubernetes
- Resource limits to prevent resource exhaustion

### Network Security
- Internal service communication only
- External access through designated endpoints
- Network policies (Kubernetes)
- Firewall-friendly port configuration

### Data Security
- JWT-based authentication
- Password hashing with bcrypt
- Environment-based secrets management
- Database authentication enabled

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Docker Compose
docker-compose logs <service-name>
docker-compose restart <service-name>

# Kubernetes
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce
```

#### Database Connection Issues
```bash
# Test MongoDB connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Test Redis connection
docker-compose exec redis redis-cli ping
```

#### Port Conflicts
```bash
# Find what's using the port
sudo netstat -tulpn | grep :3000

# Use different ports in docker-compose.yml if needed
```

### Performance Issues

#### High Memory Usage
- Adjust resource limits in Kubernetes manifests
- Monitor with `docker stats` or `kubectl top`
- Consider scaling down replicas for development

#### Slow Database Queries
- Check MongoDB indexes (created automatically)
- Monitor query performance in logs
- Consider adding custom indexes for specific use cases

## 📈 Scaling

### Docker Compose Scaling
```bash
# Scale specific services
docker-compose up --scale product-service=3 --scale auth-service=2
```

### Kubernetes Scaling
```bash
# Scale deployments
kubectl scale deployment product-service --replicas=3 -n ecommerce

# Horizontal Pod Autoscaler (HPA)
kubectl autoscale deployment product-service --cpu-percent=70 --min=2 --max=10 -n ecommerce
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Kind
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Kind
      run: ./scripts/deploy-k8s.sh deploy
```

### GitLab CI Example
```yaml
deploy:
  stage: deploy
  script:
    - ./scripts/deploy-k8s.sh deploy
  only:
    - main
```

## 📚 Additional Resources

- [Detailed Deployment Guide](./deployment.md)
- [API Documentation](./api.md)
- [Development Setup](./development.md)
- [Architecture Overview](./architecture.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test with `./scripts/deploy-docker.sh dev`
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Create an issue for bugs or feature requests
- Check the troubleshooting section above
- Review logs for detailed error information
- Ensure all prerequisites are installed correctly