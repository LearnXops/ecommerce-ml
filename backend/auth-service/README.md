# Authentication Service

A robust authentication service for the e-commerce application built with Express.js, MongoDB, and JWT tokens.

## Features

- ✅ User registration with email validation and password hashing
- ✅ User login with JWT token generation
- ✅ JWT authentication middleware with role-based authorization
- ✅ User profile management (get/update profile)
- ✅ Comprehensive input validation using Joi
- ✅ Password security with bcrypt hashing
- ✅ Error handling and logging
- ✅ Unit and integration tests

## API Endpoints

### Public Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer" // optional, defaults to "customer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "address": null
    },
    "token": "jwt_token_here"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Protected Endpoints

All protected endpoints require the `Authorization: Bearer <token>` header.

#### GET /api/auth/profile
Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "United States"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### PUT /api/auth/profile
Update current user's profile information.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "address": {
    "street": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210",
    "country": "United States"
  }
}
```

## Environment Variables

Create a `.env` file in the auth-service directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ecommerce

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## Password Requirements

Passwords must meet the following criteria:
- At least 8 characters long
- Contains at least one uppercase letter
- Contains at least one lowercase letter
- Contains at least one number
- Contains at least one special character (@$!%*?&)

## Development

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
npm start
```

### Test Authentication Flow
```bash
# Start the service first
npm run dev

# In another terminal, run the test script
node test-auth-flow.js
```

## Security Features

- **Password Hashing**: Uses bcrypt with salt rounds for secure password storage
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Input Validation**: Comprehensive validation using Joi schemas
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers via Helmet middleware
- **Rate Limiting**: Built-in Express rate limiting
- **Error Handling**: Secure error responses that don't leak sensitive information

## Architecture

The service follows a clean architecture pattern:

```
src/
├── controllers/     # Request handlers
├── middleware/      # Authentication and error handling
├── routes/         # API route definitions
├── utils/          # JWT utilities
├── validation/     # Input validation schemas
├── database/       # Database initialization
└── __tests__/      # Unit and integration tests
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "CLIENT_ERROR",
    "message": "Descriptive error message"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials or token)
- `403` - Forbidden (insufficient permissions)
- `409` - Conflict (user already exists)
- `500` - Internal Server Error