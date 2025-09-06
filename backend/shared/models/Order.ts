import mongoose, { Schema } from 'mongoose';
import { IOrder, OrderItem, Address } from '../types';

const addressSchema = new Schema<Address>({
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
    match: /^[0-9]{5}(-[0-9]{4})?$/
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'United States'
  }
}, { _id: false });

const orderItemSchema = new Schema<OrderItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100'],
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value > 0;
      },
      message: 'Quantity must be a positive integer'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Price must be a valid positive number'
    }
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: 200
  }
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: function(items: OrderItem[]) {
        return items.length > 0 && items.length <= 50;
      },
      message: 'Order must have between 1 and 50 items'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Total amount must be a valid positive number'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: 'Invalid order status'
    },
    default: 'pending',
    index: true
  },
  shippingAddress: {
    type: addressSchema,
    required: [true, 'Shipping address is required']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    trim: true,
    enum: {
      values: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'],
      message: 'Invalid payment method'
    }
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'failed', 'refunded'],
      message: 'Invalid payment status'
    },
    default: 'pending',
    index: true
  },
  trackingNumber: {
    type: String,
    trim: true,
    maxlength: 100,
    sparse: true // Allow multiple null values
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ createdAt: -1 });

// Compound indexes for common queries
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

// Virtual for order number (formatted ID)
orderSchema.virtual('orderNumber').get(function() {
  return `ORD-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order age in days
orderSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to calculate total from items
orderSchema.methods.calculateTotal = function(): number {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Instance method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function(): boolean {
  return ['pending', 'processing'].includes(this.status);
};

// Instance method to check if order can be shipped
orderSchema.methods.canBeShipped = function(): boolean {
  return this.status === 'processing' && this.paymentStatus === 'completed';
};

// Instance method to update status with validation
orderSchema.methods.updateStatus = function(newStatus: IOrder['status']): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
  };

  if (validTransitions[this.status].includes(newStatus)) {
    this.status = newStatus;
    return true;
  }
  return false;
};

// Static method to find orders by user
orderSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find orders by status
orderSchema.statics.findByStatus = function(status: IOrder['status']) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find recent orders
orderSchema.statics.findRecent = function(days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return this.find({ createdAt: { $gte: cutoffDate } }).sort({ createdAt: -1 });
};

// Pre-save middleware to validate total amount
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    const calculatedTotal = this['calculateTotal']();
    // Allow small floating point differences
    if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
      return next(new Error('Total amount does not match sum of item prices'));
    }
  }
  next();
});

// Pre-save middleware to set tracking number when shipped
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'shipped' && !this.trackingNumber) {
    // Generate a simple tracking number if not provided
    this.trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  next();
});

export const Order = mongoose.model<IOrder>('Order', orderSchema);