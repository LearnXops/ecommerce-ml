# Ecommerce API Documentation

## Overview

This document provides comprehensive API documentation for the Ecommerce application. The API follows REST principles and returns JSON responses.

**Base URL**: `http://localhost:4000/api` (development)  
**Production URL**: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. Register a new user or login with existing credentials
2. Receive JWT token in response
3. Include token in subsequent requests

## Error Handling

All API responses follow a consistent format:

### Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details (optional)
    }
  },
  "timestamp": "2025-01-09T10:30:00.000Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

## API Endpoints

### Authentication Endpoints

#### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "createdAt": "2025-01-09T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Valid email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

#### Login User

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Invalid Credentials (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

#### Get User Profile

**GET** `/auth/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "12345",
        "country": "US"
      },
      "createdAt": "2025-01-09T10:30:00.000Z",
      "updatedAt": "2025-01-09T10:30:00.000Z"
    }
  }
}
```

#### Update User Profile

**PUT** `/auth/profile`

Update current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "address": {
    "street": "456 Oak Ave",
    "city": "Newtown",
    "state": "NY",
    "zipCode": "54321",
    "country": "US"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "address": {
        "street": "456 Oak Ave",
        "city": "Newtown",
        "state": "NY",
        "zipCode": "54321",
        "country": "US"
      },
      "updatedAt": "2025-01-09T11:00:00.000Z"
    }
  },
  "message": "Profile updated successfully"
}
```

### Product Endpoints

#### Get Products

**GET** `/products`

Retrieve a list of products with optional filtering and pagination.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search term for product name/description
- `category` (string, optional): Filter by category
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter
- `sortBy` (string, optional): Sort field (name, price, createdAt)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Example Request:**
```
GET /products?search=laptop&category=electronics&minPrice=500&maxPrice=2000&page=1&limit=10&sortBy=price&sortOrder=asc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "MacBook Pro 14-inch",
        "description": "Apple MacBook Pro with M2 chip, 14-inch display",
        "price": 1999.99,
        "category": "electronics",
        "images": [
          "https://example.com/images/macbook-pro-1.jpg",
          "https://example.com/images/macbook-pro-2.jpg"
        ],
        "inventory": 25,
        "tags": ["apple", "laptop", "m2", "professional"],
        "createdAt": "2025-01-09T10:30:00.000Z",
        "updatedAt": "2025-01-09T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Get Product by ID

**GET** `/products/{id}`

Retrieve detailed information about a specific product.

**Path Parameters:**
- `id` (string): Product ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "MacBook Pro 14-inch",
      "description": "Apple MacBook Pro with M2 chip, 14-inch display, 512GB SSD, 16GB RAM",
      "price": 1999.99,
      "category": "electronics",
      "images": [
        "https://example.com/images/macbook-pro-1.jpg",
        "https://example.com/images/macbook-pro-2.jpg",
        "https://example.com/images/macbook-pro-3.jpg"
      ],
      "inventory": 25,
      "tags": ["apple", "laptop", "m2", "professional"],
      "specifications": {
        "processor": "Apple M2",
        "memory": "16GB",
        "storage": "512GB SSD",
        "display": "14-inch Liquid Retina XDR"
      },
      "createdAt": "2025-01-09T10:30:00.000Z",
      "updatedAt": "2025-01-09T10:30:00.000Z"
    }
  }
}
```

**Product Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found"
  }
}
```

#### Create Product (Admin Only)

**POST** `/products`

Create a new product. Requires admin role.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with A17 Pro chip and titanium design",
  "price": 999.99,
  "category": "electronics",
  "images": [
    "https://example.com/images/iphone-15-pro-1.jpg"
  ],
  "inventory": 100,
  "tags": ["apple", "smartphone", "a17", "titanium"],
  "specifications": {
    "processor": "A17 Pro",
    "storage": "128GB",
    "display": "6.1-inch Super Retina XDR",
    "camera": "48MP Main + 12MP Ultra Wide + 12MP Telephoto"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone with A17 Pro chip and titanium design",
      "price": 999.99,
      "category": "electronics",
      "images": [
        "https://example.com/images/iphone-15-pro-1.jpg"
      ],
      "inventory": 100,
      "tags": ["apple", "smartphone", "a17", "titanium"],
      "specifications": {
        "processor": "A17 Pro",
        "storage": "128GB",
        "display": "6.1-inch Super Retina XDR",
        "camera": "48MP Main + 12MP Ultra Wide + 12MP Telephoto"
      },
      "createdAt": "2025-01-09T11:00:00.000Z",
      "updatedAt": "2025-01-09T11:00:00.000Z"
    }
  },
  "message": "Product created successfully"
}
```

#### Update Product (Admin Only)

**PUT** `/products/{id}`

Update an existing product. Requires admin role.

**Path Parameters:**
- `id` (string): Product ID

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "price": 899.99,
  "inventory": 150,
  "description": "Latest iPhone with A17 Pro chip and titanium design - Now with improved battery life"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone with A17 Pro chip and titanium design - Now with improved battery life",
      "price": 899.99,
      "inventory": 150,
      "updatedAt": "2025-01-09T12:00:00.000Z"
    }
  },
  "message": "Product updated successfully"
}
```

#### Delete Product (Admin Only)

**DELETE** `/products/{id}`

Delete a product. Requires admin role.

**Path Parameters:**
- `id` (string): Product ID

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### Cart Endpoints

#### Get User Cart

**GET** `/cart/{userId}`

Retrieve the current user's shopping cart.

**Path Parameters:**
- `userId` (string): User ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "userId": "507f1f77bcf86cd799439011",
      "items": [
        {
          "_id": "cart_item_1",
          "productId": "507f1f77bcf86cd799439012",
          "product": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "iPhone 15 Pro",
            "price": 999.99,
            "images": ["https://example.com/images/iphone-15-pro-1.jpg"]
          },
          "quantity": 2,
          "price": 999.99,
          "subtotal": 1999.98
        }
      ],
      "totalItems": 2,
      "totalAmount": 1999.98,
      "updatedAt": "2025-01-09T11:30:00.000Z"
    }
  }
}
```

#### Add Item to Cart

**POST** `/cart/{userId}/items`

Add a product to the user's cart.

**Path Parameters:**
- `userId` (string): User ID

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439012",
  "quantity": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cartItem": {
      "_id": "cart_item_2",
      "productId": "507f1f77bcf86cd799439012",
      "quantity": 1,
      "price": 999.99,
      "subtotal": 999.99,
      "addedAt": "2025-01-09T11:45:00.000Z"
    }
  },
  "message": "Item added to cart successfully"
}
```

**Product Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found"
  }
}
```

**Insufficient Inventory (409):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "Not enough inventory available",
    "details": {
      "requested": 5,
      "available": 2
    }
  }
}
```

#### Update Cart Item

**PUT** `/cart/{userId}/items/{itemId}`

Update the quantity of an item in the cart.

**Path Parameters:**
- `userId` (string): User ID
- `itemId` (string): Cart item ID

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cartItem": {
      "_id": "cart_item_1",
      "productId": "507f1f77bcf86cd799439012",
      "quantity": 3,
      "price": 999.99,
      "subtotal": 2999.97,
      "updatedAt": "2025-01-09T12:00:00.000Z"
    }
  },
  "message": "Cart item updated successfully"
}
```

#### Remove Item from Cart

**DELETE** `/cart/{userId}/items/{itemId}`

Remove an item from the cart.

**Path Parameters:**
- `userId` (string): User ID
- `itemId` (string): Cart item ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Item removed from cart successfully"
}
```

### Order Endpoints

#### Create Order

**POST** `/orders`

Create a new order from cart items.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "country": "US"
  },
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardToken": "tok_1234567890"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439013",
      "userId": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-2025-001234",
      "items": [
        {
          "productId": "507f1f77bcf86cd799439012",
          "product": {
            "name": "iPhone 15 Pro",
            "images": ["https://example.com/images/iphone-15-pro-1.jpg"]
          },
          "quantity": 2,
          "price": 999.99,
          "subtotal": 1999.98
        }
      ],
      "subtotal": 1999.98,
      "tax": 159.99,
      "shipping": 9.99,
      "totalAmount": 2169.96,
      "status": "pending",
      "shippingAddress": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "12345",
        "country": "US"
      },
      "paymentMethod": "credit_card",
      "createdAt": "2025-01-09T12:30:00.000Z",
      "estimatedDelivery": "2025-01-14T12:30:00.000Z"
    }
  },
  "message": "Order created successfully"
}
```

#### Get User Orders

**GET** `/orders`

Get all orders for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `status` (string, optional): Filter by order status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "orderNumber": "ORD-2025-001234",
        "totalAmount": 2169.96,
        "status": "shipped",
        "createdAt": "2025-01-09T12:30:00.000Z",
        "estimatedDelivery": "2025-01-14T12:30:00.000Z",
        "itemCount": 2
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

#### Get Order by ID

**GET** `/orders/{id}`

Get detailed information about a specific order.

**Path Parameters:**
- `id` (string): Order ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439013",
      "userId": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-2025-001234",
      "items": [
        {
          "productId": "507f1f77bcf86cd799439012",
          "product": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "iPhone 15 Pro",
            "images": ["https://example.com/images/iphone-15-pro-1.jpg"]
          },
          "quantity": 2,
          "price": 999.99,
          "subtotal": 1999.98
        }
      ],
      "subtotal": 1999.98,
      "tax": 159.99,
      "shipping": 9.99,
      "totalAmount": 2169.96,
      "status": "shipped",
      "shippingAddress": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "12345",
        "country": "US"
      },
      "paymentMethod": "credit_card",
      "trackingNumber": "1Z999AA1234567890",
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2025-01-09T12:30:00.000Z"
        },
        {
          "status": "processing",
          "timestamp": "2025-01-09T14:00:00.000Z"
        },
        {
          "status": "shipped",
          "timestamp": "2025-01-10T09:00:00.000Z"
        }
      ],
      "createdAt": "2025-01-09T12:30:00.000Z",
      "estimatedDelivery": "2025-01-14T12:30:00.000Z"
    }
  }
}
```

#### Update Order Status (Admin Only)

**PUT** `/orders/{id}/status`

Update the status of an order. Requires admin role.

**Path Parameters:**
- `id` (string): Order ID

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "delivered",
  "trackingNumber": "1Z999AA1234567890",
  "notes": "Package delivered to front door"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439013",
      "status": "delivered",
      "trackingNumber": "1Z999AA1234567890",
      "updatedAt": "2025-01-14T15:30:00.000Z"
    }
  },
  "message": "Order status updated successfully"
}
```

### Recommendation Endpoints

#### Get User Recommendations

**GET** `/recommendations/{userId}`

Get personalized product recommendations for a user.

**Path Parameters:**
- `userId` (string): User ID

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` (number, optional): Number of recommendations (default: 10, max: 50)
- `type` (string, optional): Recommendation type (collaborative, content-based, hybrid)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "product": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "AirPods Pro (2nd generation)",
          "description": "Active Noise Cancellation, Transparency mode",
          "price": 249.99,
          "category": "electronics",
          "images": ["https://example.com/images/airpods-pro-1.jpg"],
          "tags": ["apple", "headphones", "wireless"]
        },
        "score": 0.92,
        "reason": "Frequently bought together with iPhone 15 Pro"
      },
      {
        "product": {
          "_id": "507f1f77bcf86cd799439015",
          "name": "MagSafe Charger",
          "description": "Wireless charging for iPhone",
          "price": 39.99,
          "category": "accessories",
          "images": ["https://example.com/images/magsafe-1.jpg"],
          "tags": ["apple", "charger", "wireless"]
        },
        "score": 0.87,
        "reason": "Compatible with your recent purchases"
      }
    ],
    "algorithm": "hybrid",
    "generatedAt": "2025-01-09T13:00:00.000Z"
  }
}
```

#### Track User Interaction

**POST** `/recommendations/interactions`

Track user interactions for improving recommendations.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "productId": "507f1f77bcf86cd799439012",
  "interactionType": "view",
  "sessionId": "sess_1234567890",
  "metadata": {
    "duration": 45,
    "source": "search_results"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Interaction tracked successfully"
}
```

### Admin Endpoints

#### Get All Orders (Admin Only)

**GET** `/admin/orders`

Get all orders in the system. Requires admin role.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by order status
- `startDate` (string, optional): Filter orders from date (ISO format)
- `endDate` (string, optional): Filter orders to date (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "orderNumber": "ORD-2025-001234",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "totalAmount": 2169.96,
        "status": "shipped",
        "createdAt": "2025-01-09T12:30:00.000Z",
        "itemCount": 2
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 195,
      "itemsPerPage": 20
    },
    "summary": {
      "totalRevenue": 125430.50,
      "ordersByStatus": {
        "pending": 15,
        "processing": 8,
        "shipped": 25,
        "delivered": 140,
        "cancelled": 7
      }
    }
  }
}
```

#### Get All Users (Admin Only)

**GET** `/admin/users`

Get all users in the system. Requires admin role.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `role` (string, optional): Filter by user role
- `search` (string, optional): Search by email or name

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "customer",
        "createdAt": "2025-01-09T10:30:00.000Z",
        "lastLogin": "2025-01-09T12:00:00.000Z",
        "orderCount": 3,
        "totalSpent": 4567.89
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalItems": 487,
      "itemsPerPage": 20
    }
  }
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Admin endpoints**: 200 requests per minute per admin user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641734400
```

## Webhooks

The system supports webhooks for real-time notifications:

### Order Status Updates

**POST** `{your-webhook-url}`

Triggered when order status changes.

**Payload:**
```json
{
  "event": "order.status_updated",
  "data": {
    "orderId": "507f1f77bcf86cd799439013",
    "orderNumber": "ORD-2025-001234",
    "userId": "507f1f77bcf86cd799439011",
    "previousStatus": "processing",
    "newStatus": "shipped",
    "timestamp": "2025-01-10T09:00:00.000Z"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class EcommerceAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getProducts(params = {}) {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async addToCart(userId, productId, quantity) {
    const response = await this.client.post(`/cart/${userId}/items`, {
      productId,
      quantity
    });
    return response.data;
  }

  async createOrder(orderData) {
    const response = await this.client.post('/orders', orderData);
    return response.data;
  }
}

// Usage
const api = new EcommerceAPI('http://localhost:4000/api', 'your-jwt-token');
const products = await api.getProducts({ category: 'electronics' });
```

### Python

```python
import requests

class EcommerceAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def get_products(self, **params):
        response = requests.get(
            f'{self.base_url}/products',
            headers=self.headers,
            params=params
        )
        return response.json()

    def add_to_cart(self, user_id, product_id, quantity):
        response = requests.post(
            f'{self.base_url}/cart/{user_id}/items',
            headers=self.headers,
            json={'productId': product_id, 'quantity': quantity}
        )
        return response.json()

# Usage
api = EcommerceAPI('http://localhost:4000/api', 'your-jwt-token')
products = api.get_products(category='electronics')
```

## Testing

### Postman Collection

A Postman collection is available with pre-configured requests for all endpoints. Import the collection from:
`docs/postman/ecommerce-api.postman_collection.json`

### cURL Examples

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get products
curl -X GET "http://localhost:4000/api/products?category=electronics" \
  -H "Authorization: Bearer your-jwt-token"

# Add to cart
curl -X POST http://localhost:4000/api/cart/user123/items \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"productId":"507f1f77bcf86cd799439012","quantity":1}'
```

## Support

For API support and questions:
- Email: api-support@ecommerce.com
- Documentation: https://docs.ecommerce.com
- Status Page: https://status.ecommerce.com