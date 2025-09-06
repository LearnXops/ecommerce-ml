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
exports.UserInteraction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const userInteractionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product ID is required'],
        index: true
    },
    interactionType: {
        type: String,
        enum: {
            values: ['view', 'cart_add', 'purchase', 'wishlist_add'],
            message: 'Invalid interaction type'
        },
        required: [true, 'Interaction type is required'],
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: [true, 'Session ID is required'],
        trim: true,
        maxlength: 100,
        index: true
    },
    metadata: {
        duration: {
            type: Number,
            min: [0, 'Duration cannot be negative'],
            validate: {
                validator: function (value) {
                    return !value || (Number.isInteger(value) && value >= 0);
                },
                message: 'Duration must be a non-negative integer'
            }
        },
        quantity: {
            type: Number,
            min: [1, 'Quantity must be at least 1'],
            max: [100, 'Quantity cannot exceed 100'],
            validate: {
                validator: function (value) {
                    return !value || (Number.isInteger(value) && value > 0);
                },
                message: 'Quantity must be a positive integer'
            }
        },
        price: {
            type: Number,
            min: [0, 'Price cannot be negative'],
            validate: {
                validator: function (value) {
                    return !value || (Number.isFinite(value) && value >= 0);
                },
                message: 'Price must be a valid positive number'
            }
        }
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
userInteractionSchema.index({ userId: 1, timestamp: -1 });
userInteractionSchema.index({ productId: 1, timestamp: -1 });
userInteractionSchema.index({ interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ sessionId: 1, timestamp: -1 });
userInteractionSchema.index({ timestamp: -1 });
userInteractionSchema.index({ userId: 1, interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ productId: 1, interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ userId: 1, productId: 1, interactionType: 1 });
userInteractionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });
userInteractionSchema.virtual('ageInHours').get(function () {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.timestamp.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60));
});
userInteractionSchema.virtual('weight').get(function () {
    const weights = {
        'view': 1,
        'cart_add': 3,
        'wishlist_add': 2,
        'purchase': 5
    };
    return weights[this.interactionType] || 1;
});
userInteractionSchema.methods.isRecent = function (hours = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    return this.timestamp >= cutoffTime;
};
userInteractionSchema.statics.findByUser = function (userId, limit) {
    const query = this.find({ userId }).sort({ timestamp: -1 });
    return limit ? query.limit(limit) : query;
};
userInteractionSchema.statics.findByProduct = function (productId, limit) {
    const query = this.find({ productId }).sort({ timestamp: -1 });
    return limit ? query.limit(limit) : query;
};
userInteractionSchema.statics.findByType = function (interactionType, limit) {
    const query = this.find({ interactionType }).sort({ timestamp: -1 });
    return limit ? query.limit(limit) : query;
};
userInteractionSchema.statics.findRecent = function (hours = 24, limit) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    const query = this.find({ timestamp: { $gte: cutoffTime } }).sort({ timestamp: -1 });
    return limit ? query.limit(limit) : query;
};
userInteractionSchema.statics.getUserSummary = function (userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.aggregate([
        {
            $match: {
                userId: new mongoose_1.default.Types.ObjectId(userId),
                timestamp: { $gte: cutoffDate }
            }
        },
        {
            $group: {
                _id: '$interactionType',
                count: { $sum: 1 },
                lastInteraction: { $max: '$timestamp' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};
userInteractionSchema.statics.getProductSummary = function (productId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.aggregate([
        {
            $match: {
                productId: new mongoose_1.default.Types.ObjectId(productId),
                timestamp: { $gte: cutoffDate }
            }
        },
        {
            $group: {
                _id: '$interactionType',
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$userId' }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: '$uniqueUsers' }
            }
        },
        {
            $project: {
                uniqueUsers: 0
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};
userInteractionSchema.statics.getCollaborativeData = function (minInteractions = 5) {
    return this.aggregate([
        {
            $match: {
                interactionType: { $in: ['cart_add', 'purchase', 'wishlist_add'] }
            }
        },
        {
            $group: {
                _id: {
                    userId: '$userId',
                    productId: '$productId'
                },
                totalWeight: {
                    $sum: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$interactionType', 'view'] }, then: 1 },
                                { case: { $eq: ['$interactionType', 'cart_add'] }, then: 3 },
                                { case: { $eq: ['$interactionType', 'wishlist_add'] }, then: 2 },
                                { case: { $eq: ['$interactionType', 'purchase'] }, then: 5 }
                            ],
                            default: 1
                        }
                    }
                },
                interactionCount: { $sum: 1 }
            }
        },
        {
            $match: {
                interactionCount: { $gte: minInteractions }
            }
        }
    ]);
};
userInteractionSchema.pre('save', function (next) {
    if (this.interactionType === 'view' && this.metadata?.duration === undefined) {
        this.metadata = this.metadata || {};
        this.metadata.duration = 0;
    }
    if (['cart_add', 'purchase'].includes(this.interactionType) && !this.metadata?.quantity) {
        return next(new Error(`Quantity is required for ${this.interactionType} interactions`));
    }
    if (this.interactionType === 'purchase' && !this.metadata?.price) {
        return next(new Error('Price is required for purchase interactions'));
    }
    next();
});
exports.UserInteraction = mongoose_1.default.model('UserInteraction', userInteractionSchema);
//# sourceMappingURL=UserInteraction.js.map