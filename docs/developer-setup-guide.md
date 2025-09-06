# Developer Setup Guide

This comprehensive guide will help developers set up the ecommerce application for local development, testing, and deployment.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Initial Setup](#initial-setup)
3. [Development Environment](#development-environment)
4. [Testing Setup](#testing-setup)
5. [Deployment Options](#deployment-options)
6. [IDE Configuration](#ide-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Contributing Guidelines](#contributing-guidelines)

## System Requirements

### Minimum Requirements

- **OS**: macOS 10.15+, Ubuntu 18.04+, Windows 10 with WSL2
- **RAM**: 8GB (16GB recommended)
- **Storage**: 20GB free space
- **CPU**: 2 cores (4 cores recommended)

### Required Software

#### Core Dependencies

```bash
# Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python (v3.9 or higher) for ML service
sudo apt-get install python3 python3-pip python3-venv

# Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Git
sudo apt-get install git
```

#### Development Tools

```bash
# TypeScript globally
npm install -g typescript ts-node

# Nodemon for development
npm install -g nodemon

# Jest for testing
npm install -g jest

# Kubernetes tools (optional)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Kind for local Kubernetes
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.17.0/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
```

#### Database Tools

```bash
# MongoDB Compass (GUI)
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# Redis CLI
sudo apt-get install redis-tools

# MongoDB CLI
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-mongosh
```

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ecommerce-app.git
cd ecommerce-app
```

### 2. Environment Configuration

Create environment files for different environments:

```bash
# Copy example environment files
cp .env.example .env
cp backend/auth-service/.env.example backend/auth-service/.env
cp backend/product-service/.env.example backend/product-service/.env
cp backend/cart-service/.env.example backend/cart-service/.env
cp backend/order-service/.env.example backend/order-service/.env
cp backend/api-gateway/.env.example backend/api-gateway/.env
cp ml-service/.env.example ml-service/.env
```

### 3. Install Dependencies

```bash
# Root dependencies
npm install

# Backend services
cd backend/auth-service && npm install && cd ../..
cd backend/product-service && npm install && cd ../..
cd backend/cart-service && npm install && cd ../..
cd backend/order-service && npm install && cd ../..
cd backend/api-gateway && npm install && cd ../..
cd backend/shared && npm install && cd ../..

# Frontend
cd frontend && npm install && cd ..

# ML Service
cd ml-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Integration tests
cd backend/integration-tests && npm install && cd ../..
```

### 4. Database Setup

```bash
# Start databases with Docker
docker-compose up -d mongodb redis

# Wait for databases to be ready
sleep 10

# Seed the database
cd backend/shared
npm run seed
cd ../..
```

## Development Environment

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Manual Service Startup

Start each service in separate terminals:

```bash
# Terminal 1: MongoDB & Redis
docker-compose up -d mongodb redis

# Terminal 2: Auth Service
cd backend/auth-service
npm run dev

# Terminal 3: Product Service
cd backend/product-service
npm run dev

# Terminal 4: Cart Service
cd backend/cart-service
npm run dev

# Terminal 5: Order Service
cd backend/order-service
npm run dev

# Terminal 6: API Gateway
cd backend/api-gateway
npm run dev

# Terminal 7: ML Service
cd ml-service
source venv/bin/activate
python app.py

# Terminal 8: Frontend
cd frontend
npm run dev
```

### Development Scripts

```bash
# Start all services in development mode
npm run dev

# Build all services
npm run build

# Run tests across all services
npm run test

# Run linting
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

### Environment Variables

#### Core Configuration (.env)

```bash
# Application
NODE_ENV=development
PORT=4000

# Database
MONGODB_URI=mongodb://localhost:27017/ecommerce
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-development-jwt-secret
JWT_EXPIRES_IN=7d

# Email (for development, use Mailtrap or similar)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASS=your-mailtrap-pass

# ML Service
ML_SERVICE_URL=http://localhost:3005

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880  # 5MB
```

#### Service-Specific Configuration

Each service has its own `.env` file with service-specific settings. Refer to `.env.example` files in each service directory.

## Testing Setup

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests for specific service
cd backend/auth-service && npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Integration Tests

```bash
# Setup test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
cd backend/integration-tests
npm test

# Clean up test environment
docker-compose -f docker-compose.test.yml down -v
```

### End-to-End Tests

```bash
# Start application
docker-compose up -d

# Run E2E tests
cd frontend
npm run test:e2e

# Run E2E tests in headless mode
npm run test:e2e:headless
```

### Load Testing

```bash
# Start application
docker-compose up -d

# Run basic load tests
cd backend/shared
npm run load-test

# Run comprehensive load test scenarios
cd ../../scripts
npm run load-test:scenarios

# Run performance tests
./scripts/run-performance-tests.sh
```

### Test Configuration

#### Jest Configuration (backend/jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

#### Cypress Configuration (frontend/cypress.config.ts)

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

## Deployment Options

### Local Development

```bash
# Docker Compose
docker-compose up -d

# Manual startup (see Development Environment section)
```

### Staging Environment

```bash
# Deploy to staging
./scripts/deploy-docker.sh staging

# Run staging tests
npm run test:staging
```

### Production Deployment

#### Docker Compose Production

```bash
# Deploy production environment
./scripts/deploy-docker.sh prod

# Validate deployment
./scripts/validate-deployment.sh
```

#### Kubernetes (Kind)

```bash
# Full deployment
./scripts/deploy-k8s.sh deploy

# Check status
./scripts/deploy-k8s.sh status

# Get service URLs
./scripts/deploy-k8s.sh urls
```

#### Cloud Deployment

For cloud deployment (AWS, GCP, Azure), refer to:
- `docs/cloud-deployment-aws.md`
- `docs/cloud-deployment-gcp.md`
- `docs/cloud-deployment-azure.md`

## IDE Configuration

### Visual Studio Code

#### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-python.python",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-vscode-remote.remote-containers",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "orta.vscode-jest",
    "ms-vscode.vscode-docker"
  ]
}
```

#### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/coverage": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

#### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Auth Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/auth-service/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/auth-service/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "cwd": "${workspaceFolder}/backend/auth-service"
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/.bin/vite",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/frontend"
    }
  ]
}
```

### IntelliJ IDEA / WebStorm

#### Project Structure

1. Open the root directory as a project
2. Mark `backend/*/src` as source folders
3. Mark `frontend/src` as source folder
4. Mark `ml-service/src` as source folder

#### Run Configurations

Create run configurations for each service:
- Auth Service: `backend/auth-service/src/index.ts`
- Product Service: `backend/product-service/src/index.ts`
- etc.

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check what's using a port
lsof -i :3000

# Kill process using port
kill -9 $(lsof -t -i:3000)
```

#### Database Connection Issues

```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis status
docker-compose exec redis redis-cli ping

# Reset databases
docker-compose down -v
docker-compose up -d mongodb redis
```

#### Node.js Version Issues

```bash
# Use Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Python Environment Issues

```bash
# Recreate virtual environment
cd ml-service
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Docker Issues

```bash
# Clean Docker system
docker system prune -a

# Rebuild containers
docker-compose build --no-cache

# Reset Docker Desktop (if using)
# Go to Docker Desktop > Troubleshoot > Reset to factory defaults
```

### Performance Issues

#### Memory Usage

```bash
# Monitor memory usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Go to Settings > Resources > Memory
```

#### Build Performance

```bash
# Use Docker BuildKit
export DOCKER_BUILDKIT=1

# Parallel builds
docker-compose build --parallel
```

### Debugging Tips

#### Backend Services

```bash
# Enable debug logging
export DEBUG=*

# Use Node.js inspector
node --inspect-brk=0.0.0.0:9229 dist/index.js
```

#### Frontend

```bash
# Enable React DevTools
# Install React Developer Tools browser extension

# Enable Redux DevTools
# Install Redux DevTools browser extension
```

#### Database Debugging

```bash
# MongoDB logs
docker-compose logs mongodb

# Redis logs
docker-compose logs redis

# Connect to MongoDB shell
docker-compose exec mongodb mongosh

# Connect to Redis CLI
docker-compose exec redis redis-cli
```

## Contributing Guidelines

### Code Style

- Use TypeScript for all backend code
- Use ESLint and Prettier for code formatting
- Follow conventional commit messages
- Write tests for all new features

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add appropriate labels
4. Request review from team members
5. Merge after approval

### Testing Requirements

- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage

### Documentation

- Update API documentation for new endpoints
- Add inline code comments for complex logic
- Update README files for significant changes
- Include examples in documentation

## Additional Resources

### Documentation

- [API Documentation](./api-documentation.md)
- [Deployment Guide](./deployment.md)
- [Architecture Overview](./architecture.md)

### External Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Documentation](https://reactjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Support

- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: dev-team@ecommerce.com
- **Slack**: #ecommerce-dev channel