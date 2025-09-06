import mongoose, { Schema } from 'mongoose';
import { IProduct } from '../types';

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    minlength: [2, 'Product name must be at least 2 characters long']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Product description cannot exceed 2000 characters'],
    minlength: [10, 'Product description must be at least 10 characters long']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
    max: [999999.99, 'Price cannot exceed $999,999.99'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Price must be a valid positive number'
    }
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true,
    lowercase: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    enum: {
      values: [
        'electronics',
        'clothing',
        'books',
        'home-garden',
        'sports-outdoors',
        'toys-games',
        'health-beauty',
        'automotive',
        'food-beverages',
        'jewelry-accessories',
        'other'
      ],
      message: 'Invalid category selected'
    }
  },
  images: {
    type: [String],
    validate: {
      validator: function(images: string[]) {
        return images.length > 0 && images.length <= 10;
      },
      message: 'Product must have between 1 and 10 images'
    },
    default: []
  },
  inventory: {
    type: Number,
    required: [true, 'Inventory count is required'],
    min: [0, 'Inventory cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value >= 0;
      },
      message: 'Inventory must be a non-negative integer'
    }
  },
  tags: {
    type: [String],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 20;
      },
      message: 'Product cannot have more than 20 tags'
    },
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
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

// Indexes for performance and search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ inventory: 1 });

// Compound indexes for common queries
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isActive: 1, category: 1 });
productSchema.index({ isActive: 1, inventory: 1 });

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.inventory > 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.inventory === 0) return 'out-of-stock';
  if (this.inventory <= 5) return 'low-stock';
  return 'in-stock';
});

// Instance method to check if product is in stock
productSchema.methods.isInStock = function(quantity: number = 1): boolean {
  return this.isActive && this.inventory >= quantity;
};

// Instance method to reserve inventory
productSchema.methods.reserveInventory = function(quantity: number): boolean {
  if (!this.isInStock(quantity)) {
    return false;
  }
  this.inventory -= quantity;
  return true;
};

// Instance method to restore inventory
productSchema.methods.restoreInventory = function(quantity: number): void {
  this.inventory += quantity;
};

// Static method to find available products
productSchema.statics.findAvailable = function() {
  return this.find({ isActive: true, inventory: { $gt: 0 } });
};

// Static method to find by category
productSchema.statics.findByCategory = function(category: string) {
  return this.find({ category: category.toLowerCase(), isActive: true });
};

// Static method for text search
productSchema.statics.searchProducts = function(searchTerm: string) {
  return this.find(
    { 
      $text: { $search: searchTerm },
      isActive: true 
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware to normalize tags
productSchema.pre('save', function(next) {
  if (this.isModified('tags')) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
    // Remove duplicates
    this.tags = [...new Set(this.tags)];
  }
  next();
});

export const Product = mongoose.model<IProduct>('Product', productSchema);