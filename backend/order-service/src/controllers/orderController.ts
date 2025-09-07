import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema
} from '../validation/orderValidation';
import { logger } from '../utils/logger';

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Validate request body
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      throw createError(400, 'VALIDATION_ERROR', error.details[0]?.message || 'Validation failed');
    }

    const { items, shippingAddress, paymentMethod, notes } = value;
    const userId = req.user!.id;

    // Get product IDs from items
    const productIds = items.map((item: any) => item.productId);
    
    // Fetch products and validate availability
    const products = await Product.find({ 
      _id: { $in: productIds },
      isActive: true 
    }).session(session);

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingIds = productIds.filter((id: string) => !foundIds.includes(id));
      throw createError(404, 'PRODUCT_NOT_FOUND', `Products not found: ${missingIds.join(', ')}`);
    }

    // Create product map for easy lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Validate inventory and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw createError(404, 'PRODUCT_NOT_FOUND', `Product ${item.productId} not found`);
      }

      if (product.inventory < item.quantity) {
        throw createError(400, 'INSUFFICIENT_INVENTORY', 
          `Insufficient inventory for ${product.name}. Available: ${product.inventory}, Requested: ${item.quantity}`);
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
        name: product.name
      });

      // Update product inventory
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { inventory: -item.quantity } },
        { session }
      );
    }

    // Create order
    const order = new Order({
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      notes,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save({ session });
    await session.commitTransaction();

    logger.info(`Order created successfully: ${order._id}`, { userId, totalAmount });

    res.status(201).json({
      success: true,
      data: order,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { error, value } = orderQuerySchema.validate(req.query);
    if (error) {
      throw createError(400, 'VALIDATION_ERROR', error.details[0]?.message || 'Validation failed');
    }

    const { page, limit, status, sortBy, sortOrder, dateFrom, dateTo } = value;
    const userId = req.user!.id;

    // Build query
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Validate ObjectId format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, 'INVALID_ID', 'Invalid order ID format');
    }

    // Build query - users can only see their own orders, admins can see all
    const query: any = { _id: id };
    if (userRole !== 'admin') {
      query.userId = userId;
    }

    const order = await Order.findOne(query).select('-__v');

    if (!order) {
      throw createError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    res.json({
      success: true,
      data: order,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate ObjectId format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, 'INVALID_ID', 'Invalid order ID format');
    }

    const order = await Order.findOne({ _id: id, userId }).session(session);

    if (!order) {
      throw createError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    if (order.status === 'cancelled') {
      throw createError(400, 'ORDER_ALREADY_CANCELLED', 'Order is already cancelled');
    }

    if (order.status === 'delivered') {
      throw createError(400, 'ORDER_ALREADY_DELIVERED', 'Cannot cancel delivered order');
    }

    if (!['pending', 'processing'].includes(order.status)) {
      throw createError(400, 'CANNOT_CANCEL_ORDER', 'Order cannot be cancelled in current status');
    }

    // Restore inventory
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { inventory: item.quantity } },
        { session }
      );
    }

    // Update order status
    order.status = 'cancelled';
    await order.save({ session });

    await session.commitTransaction();

    logger.info(`Order cancelled: ${order._id}`, { userId });

    res.json({
      success: true,
      data: order,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Admin-only endpoints
export const getAllOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { error, value } = orderQuerySchema.validate(req.query);
    if (error) {
      throw createError(400, 'VALIDATION_ERROR', error.details[0]?.message || 'Validation failed');
    }

    const { page, limit, status, sortBy, sortOrder, dateFrom, dateTo } = value;

    // Build query
    const query: any = {};
    
    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .populate('userId', 'firstName lastName email'),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, 'INVALID_ID', 'Invalid order ID format');
    }

    // Validate request body
    const { error, value } = updateOrderStatusSchema.validate(req.body);
    if (error) {
      throw createError(400, 'VALIDATION_ERROR', error.details[0]?.message || 'Validation failed');
    }

    const { status, trackingNumber, notes } = value;

    const order = await Order.findById(id);
    if (!order) {
      throw createError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Validate status transition (simplified)
    const validTransitions: Record<string, string[]> = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw createError(400, 'INVALID_STATUS_TRANSITION', 
        `Cannot change status from ${order.status} to ${status}`);
    }

    // Update order status
    order.status = status;

    // Update additional fields if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    if (notes) {
      order.notes = notes;
    }

    await order.save();

    logger.info(`Order status updated: ${order._id}`, { 
      oldStatus: order.status, 
      newStatus: status,
      adminId: req.user!.id 
    });

    res.json({
      success: true,
      data: order,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};