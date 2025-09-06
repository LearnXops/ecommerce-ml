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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        maxlength: 255
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
        match: [/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
        match: [/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces']
    },
    address: {
        type: addressSchema,
        required: false
    },
    role: {
        type: String,
        enum: {
            values: ['customer', 'admin'],
            message: 'Role must be either customer or admin'
        },
        default: 'customer'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_doc, ret) {
            delete ret['password'];
            delete ret['__v'];
            return ret;
        }
    }
});
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.methods['comparePassword'] = async function (candidatePassword) {
    try {
        return await bcryptjs_1.default.compare(candidatePassword, this['password']);
    }
    catch (error) {
        throw new Error('Password comparison failed');
    }
};
userSchema.methods['getFullName'] = function () {
    return `${this['firstName']} ${this['lastName']}`;
};
userSchema.statics['findByEmail'] = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
exports.User = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map