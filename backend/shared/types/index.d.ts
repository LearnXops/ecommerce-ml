import { Document, ObjectId } from 'mongoose';
export interface BaseDocument extends Document {
    _id: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}
export interface IUser extends BaseDocument {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    address?: Address;
    role: 'customer' | 'admin';
}
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
export interface OrderItem {
    productId: ObjectId;
    quantity: number;
    price: number;
    name: string;
}
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
export interface IUserInteraction extends BaseDocument {
    userId: ObjectId;
    productId: ObjectId;
    interactionType: 'view' | 'cart_add' | 'purchase' | 'wishlist_add';
    timestamp: Date;
    sessionId: string;
    metadata?: {
        duration?: number;
        quantity?: number;
        price?: number;
    };
}
export interface CartItem {
    productId: string;
    quantity: number;
    price: number;
    name: string;
    image?: string;
}
export interface ICart {
    userId: string;
    items: CartItem[];
    totalAmount: number;
    updatedAt: Date;
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
    search?: string;
}
export interface OrderFilter {
    status?: IOrder['status'];
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}
//# sourceMappingURL=index.d.ts.map