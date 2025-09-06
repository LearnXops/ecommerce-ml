"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const addressSchema = new mongoose_1.Schema({
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
const orderItemSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product ID is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
        max: [100, 'Quantity cannot exceed 100'],
        validate: {
            validator: function (value) {
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
            validator: function (value) {
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
const orderSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    items: {
        type: [orderItemSchema],
        required: [true, 'Order items are required'],
        validate: {
            validator: function (items) {
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
            validator: function (value) {
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
        sparse: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.virtual('orderNumber').get(function () {
    return `ORD-${this._id.toString().slice(-8).toUpperCase()}`;
});
orderSchema.virtual('totalItems').get(function () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});
orderSchema.virtual('ageInDays').get(function () {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
orderSchema.methods.calculateTotal = function () {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};
orderSchema.methods.canBeCancelled = function () {
    return ['pending', 'processing'].includes(this.status);
};
orderSchema.methods.canBeShipped = function () {
    return this.status === 'processing' && this.paymentStatus === 'completed';
};
orderSchema.methods.updateStatus = function (newStatus) {
    const validTransitions = {
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
orderSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ createdAt: -1 });
};
orderSchema.statics.findByStatus = function (status) {
    return this.find({ status }).sort({ createdAt: -1 });
};
orderSchema.statics.findRecent = function (days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.find({ createdAt: { $gte: cutoffDate } }).sort({ createdAt: -1 });
};
orderSchema.pre('save', function (next) {
    if (this.isModified('items')) {
        const calculatedTotal = this['calculateTotal']();
        if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
            return next(new Error('Total amount does not match sum of item prices'));
        }
    }
    next();
});
orderSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'shipped' && !this.trackingNumber) {
        this.trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});
exports.Order = mongoose_1.default.model('Order', orderSchema);
//# sourceMappingURL=Order.js.map