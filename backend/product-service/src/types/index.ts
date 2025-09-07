export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

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

export interface IUser {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}