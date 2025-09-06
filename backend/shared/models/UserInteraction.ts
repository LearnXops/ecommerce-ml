import mongoose, { Schema } from 'mongoose';
import { IUserInteraction } from '../types';

const userInteractionSchema = new Schema<IUserInteraction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  productId: {
    type: Schema.Types.ObjectId,
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
        validator: function(value: number) {
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
        validator: function(value: number) {
          return !value || (Number.isInteger(value) && value > 0);
        },
        message: 'Quantity must be a positive integer'
      }
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function(value: number) {
          return !value || (Number.isFinite(value) && value >= 0);
        },
        message: 'Price must be a valid positive number'
      }
    }
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

// Indexes for performance and analytics
userInteractionSchema.index({ userId: 1, timestamp: -1 });
userInteractionSchema.index({ productId: 1, timestamp: -1 });
userInteractionSchema.index({ interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ sessionId: 1, timestamp: -1 });
userInteractionSchema.index({ timestamp: -1 });

// Compound indexes for common ML queries
userInteractionSchema.index({ userId: 1, interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ productId: 1, interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ userId: 1, productId: 1, interactionType: 1 });

// TTL index to automatically remove old interactions (keep 2 years of data)
userInteractionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Virtual for interaction age in hours
userInteractionSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.timestamp.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60));
});

// Virtual for interaction weight (for ML algorithms)
userInteractionSchema.virtual('weight').get(function() {
  const weights = {
    'view': 1,
    'cart_add': 3,
    'wishlist_add': 2,
    'purchase': 5
  };
  return weights[this.interactionType] || 1;
});

// Instance method to check if interaction is recent
userInteractionSchema.methods.isRecent = function(hours: number = 24): boolean {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  return this.timestamp >= cutoffTime;
};

// Static method to find interactions by user
userInteractionSchema.statics.findByUser = function(userId: string, limit?: number) {
  const query = this.find({ userId }).sort({ timestamp: -1 });
  return limit ? query.limit(limit) : query;
};

// Static method to find interactions by product
userInteractionSchema.statics.findByProduct = function(productId: string, limit?: number) {
  const query = this.find({ productId }).sort({ timestamp: -1 });
  return limit ? query.limit(limit) : query;
};

// Static method to find interactions by type
userInteractionSchema.statics.findByType = function(interactionType: IUserInteraction['interactionType'], limit?: number) {
  const query = this.find({ interactionType }).sort({ timestamp: -1 });
  return limit ? query.limit(limit) : query;
};

// Static method to find recent interactions
userInteractionSchema.statics.findRecent = function(hours: number = 24, limit?: number) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  const query = this.find({ timestamp: { $gte: cutoffTime } }).sort({ timestamp: -1 });
  return limit ? query.limit(limit) : query;
};

// Static method to get user interaction summary
userInteractionSchema.statics.getUserSummary = function(userId: string, days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
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

// Static method to get product interaction summary
userInteractionSchema.statics.getProductSummary = function(productId: string, days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
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

// Static method for collaborative filtering data
userInteractionSchema.statics.getCollaborativeData = function(minInteractions: number = 5) {
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

// Pre-save middleware to validate metadata based on interaction type
userInteractionSchema.pre('save', function(next) {
  // Validate metadata based on interaction type
  if (this.interactionType === 'view' && this.metadata?.duration === undefined) {
    // Set default duration for view interactions if not provided
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

export const UserInteraction = mongoose.model<IUserInteraction>('UserInteraction', userInteractionSchema);