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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const productSchema = new mongoose_1.Schema({
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
            validator: function (value) {
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
            validator: function (images) {
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
            validator: function (value) {
                return Number.isInteger(value) && value >= 0;
            },
            message: 'Inventory must be a non-negative integer'
        }
    },
    tags: {
        type: [String],
        validate: {
            validator: function (tags) {
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
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ inventory: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isActive: 1, category: 1 });
productSchema.index({ isActive: 1, inventory: 1 });
productSchema.virtual('isAvailable').get(function () {
    return this.isActive && this.inventory > 0;
});
productSchema.virtual('stockStatus').get(function () {
    if (!this.isActive)
        return 'inactive';
    if (this.inventory === 0)
        return 'out-of-stock';
    if (this.inventory <= 5)
        return 'low-stock';
    return 'in-stock';
});
productSchema.methods.isInStock = function (quantity = 1) {
    return this.isActive && this.inventory >= quantity;
};
productSchema.methods.reserveInventory = function (quantity) {
    if (!this.isInStock(quantity)) {
        return false;
    }
    this.inventory -= quantity;
    return true;
};
productSchema.methods.restoreInventory = function (quantity) {
    this.inventory += quantity;
};
productSchema.statics.findAvailable = function () {
    return this.find({ isActive: true, inventory: { $gt: 0 } });
};
productSchema.statics.findByCategory = function (category) {
    return this.find({ category: category.toLowerCase(), isActive: true });
};
productSchema.statics.searchProducts = function (searchTerm) {
    return this.find({
        $text: { $search: searchTerm },
        isActive: true
    }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
};
productSchema.pre('save', function (next) {
    if (this.isModified('tags')) {
        this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
        this.tags = [...new Set(this.tags)];
    }
    next();
});
exports.Product = mongoose_1.default.model('Product', productSchema);
//# sourceMappingURL=Product.js.map