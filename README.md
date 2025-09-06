# Ecommerce Application

A full-stack ecommerce application built with React, Node.js microservices, and ML-based recommendations.

## Architecture

- **Frontend**: React 18 with TypeScript and Material-UI
- **Backend**: Node.js microservices with Express.js
- **Database**: MongoDB for persistent data, Redis for caching
- **ML Service**: Python Flask with scikit-learn
- **Deployment**: Docker Compose for local development, Kubernetes for production

## Project Structure

```
ecommerce-app/
├── frontend/                 # React frontend application
├── backend/                  # Node.js backend services
│   ├── api-gateway/         # API Gateway service
│   ├── auth-service/        # Authentication service
│   ├── product-service/     # Product management service
│   ├── cart-service/        # Shopping cart service
│   └── order-service/       # Order processing service
├── ml-service/              # Python ML recommendation service
├── docker-compose.yml       # Docker Compose configuration
└── package.json            # Root package.json for monorepo
```

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Python 3.11+ (for ML service development)

## Quick Start

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration values.

3. **Start the development environment:**
   ```bash
   npm run dev
   ```
   This will start all services using Docker Compose.

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:4000
   - Individual services: ports 3001-3005

## Development

### Running Individual Services

```bash
# Frontend only
npm run dev:frontend

# API Gateway only
npm run dev:api-gateway

# Auth Service only
npm run dev:auth

# Product Service only
npm run dev:product

# Cart Service only
npm run dev:cart

# Order Service only
npm run dev:order
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific service
npm test --workspace=frontend
npm test --workspace=backend/auth-service
```

### Building

```bash
# Build all services
npm run build

# Build specific service
npm run build --workspace=frontend
```

## Services

### Frontend (Port 3000)
React application with Material-UI components, React Query for state management, and TypeScript.

### API Gateway (Port 4000)
Central entry point that routes requests to appropriate microservices with authentication and rate limiting.

### Auth Service (Port 3001)
Handles user registration, login, JWT token management, and user profile operations.

### Product Service (Port 3002)
Manages product catalog, search functionality, categories, and product images.

### Cart Service (Port 3003)
Manages shopping cart operations using Redis for session-based storage.

### Order Service (Port 3004)
Processes orders, handles payment integration, and manages order status updates.

### ML Service (Port 3005)
Python-based recommendation engine using collaborative and content-based filtering.

## Database

- **MongoDB**: Stores users, products, orders, and ML interaction data
- **Redis**: Handles session management and cart storage

## Environment Variables

Key environment variables (see `.env.example` for complete list):

- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `EMAIL_*`: Email service configuration for notifications

## Docker Compose Services

The `docker-compose.yml` includes:
- All application services
- MongoDB database with authentication
- Redis cache with persistence
- Proper networking and volume management

## Production Deployment

For production deployment using Kubernetes:

1. Build production images
2. Deploy to Kubernetes cluster
3. Configure ingress and load balancing
4. Set up monitoring and logging

## Contributing

1. Follow the established code structure
2. Write tests for new features
3. Use TypeScript for type safety
4. Follow the existing naming conventions
5. Update documentation as needed

## License

This project is licensed under the MIT License.