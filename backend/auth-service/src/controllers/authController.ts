import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema, updateProfileSchema } from '../validation/authValidation';
import { AuthRequest } from '../middleware/auth';
import { User } from '@ecommerce/shared/models/User';
import { logger } from '@ecommerce/shared/utils/logger';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw createError(error.details[0].message, 400);
    }

    const { email, password, firstName, lastName, role } = value;

    // Check if user already exists
    const existingUser = await (User as any).findByEmail(email);
    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Create new user (password will be hashed by pre-save middleware)
    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      role
    });

    await newUser.save();

    // Generate JWT token
    const token = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          createdAt: newUser.createdAt
        },
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw createError(error.details[0].message, 400);
    }

    const { email, password } = value;

    // Find user by email and include password for comparison
    const user = await (User as any).findByEmail(email).select('+password');
    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          address: user.address
        },
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    // Fetch user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          address: user.address,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      throw createError(error.details[0].message, 400);
    }

    // Find and update user
    const user = await User.findById(req.user.id);
    if (!user) {
      throw createError('User not found', 404);
    }

    // Update fields if provided
    if (value.firstName !== undefined) {
      user.firstName = value.firstName;
    }
    if (value.lastName !== undefined) {
      user.lastName = value.lastName;
    }
    if (value.address !== undefined) {
      user.address = value.address;
    }

    await user.save();

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          address: user.address,
          updatedAt: user.updatedAt
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Admin-only endpoints
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const search = req.query.search as string;

    // Build filter
    const filter: any = {};
    if (role && ['customer', 'admin'].includes(role)) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        data: users,
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

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['customer', 'admin'].includes(role)) {
      throw createError('Invalid role. Must be customer or admin', 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw createError('User not found', 404);
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user.id) {
      throw createError('Cannot change your own role', 400);
    }

    user.role = role;
    await user.save();

    logger.info(`User role updated: ${user.email} -> ${role}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          updatedAt: user.updatedAt
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const getUserStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const [totalUsers, adminUsers, customerUsers, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'customer' }),
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    // Get user registration stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        adminUsers,
        customerUsers,
        recentRegistrations,
        recentUsers
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};