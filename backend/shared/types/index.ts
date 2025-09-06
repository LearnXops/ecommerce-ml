import { Document, ObjectId } from 'mongoose';

// Base interface for all documents
export interface BaseDocument extends Document {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Address interface for shipping and billing
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// User interface
export interface IUser extends BaseDocument {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address?: Address;
  role: 'customer' | 'admin';
}

// Product interface
export interface IProduct extends BaseDocument {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  inventory: number;
  tags: string[];
  isActive: boolean;
}

// Order item interface
export interface OrderItem {
  productId: ObjectId;
  quantity: number;
  price: number;
  name: string; // Store product name at time of order
}

// Enums for order and payment status
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Order interface
export interface IOrder extends BaseDocument {
  userId: ObjectId;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  trackingNumber?: string;
  notes?: string;
}

// User interaction interface for ML recommendations
export interface IUserInteraction extends BaseDocument {
  userId: ObjectId;
  productId: ObjectId;
  interactionType: 'view' | 'cart_add' | 'purchase' | 'wishlist_add';
  timestamp: Date;
  sessionId: string;
  metadata?: {
    duration?: number; // for view interactions
    quantity?: number; // for cart_add and purchase
    price?: number; // for purchase interactions
  };
}

// Cart item interface (for Redis storage)
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

// Cart interface
export interface ICart {
  userId: string;
  items: CartItem[];
  totalAmount: number;
  updatedAt: Date;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Pagination interface
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and filter interfaces
export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
  inStock?: boolean;
}

export interface UserFilter {
  role?: 'customer' | 'admin';
  search?: string; // search by name or email
}

export interface OrderFilter {
  status?: IOrder['status'];
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}