import { Request, Response } from 'express';
import { Product } from 'shared/models/Product';
import { IProduct, ProductFilter, PaginatedResponse, ApiResponse } from 'shared/types';
import { logger } from 'shared/utils/logger';
import { validateProduct, validateProductUpdate, validateProductQuery } from '../validation/productValidation';

export class ProductController {
  // Get all products with filtering, search, and pagination
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateProductQuery(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        category,
        minPrice,
        maxPrice,
        tags,
        search,
        inStock
      } = value;

      // Build filter object
      const filter: any = { isActive: true };

      if (category) {
        filter.category = category.toLowerCase();
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) filter.price.$gte = minPrice;
        if (maxPrice !== undefined) filter.price.$lte = maxPrice;
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: tags.map((tag: string) => tag.toLowerCase()) };
      }

      if (inStock) {
        filter.inventory = { $gt: 0 };
      }

      // Build sort object
      const sort: any = {};
      if (search) {
        // For text search, we'll use text score for sorting
        sort.score = { $meta: 'textScore' };
        filter.$text = { $search: search };
      } else {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query
      const [products, total] = await Promise.all([
        Product.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-__v'),
        Product.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: ApiResponse<PaginatedResponse<IProduct>> = {
        success: true,
        data: {
          data: products,
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
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch products'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get product by ID
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await Product.findOne({ _id: id, isActive: true }).select('-__v');

      if (!product) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const response: ApiResponse<IProduct> = {
        success: true,
        data: product,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching product by ID:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Create new product (admin only)
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateProduct(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if product with same name already exists
      const existingProduct = await Product.findOne({ 
        name: { $regex: new RegExp(`^${value.name}$`, 'i') },
        isActive: true 
      });

      if (existingProduct) {
        res.status(409).json({
          success: false,
          error: {
            code: 'PRODUCT_EXISTS',
            message: 'Product with this name already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const product = new Product(value);
      await product.save();

      const response: ApiResponse<IProduct> = {
        success: true,
        data: product,
        timestamp: new Date().toISOString()
      };

      logger.info(`Product created: ${product._id}`);
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update product (admin only)
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = validateProductUpdate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if product exists
      const existingProduct = await Product.findOne({ _id: id, isActive: true });
      if (!existingProduct) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If name is being updated, check for duplicates
      if (value.name && value.name !== existingProduct.name) {
        const duplicateProduct = await Product.findOne({
          name: { $regex: new RegExp(`^${value.name}$`, 'i') },
          _id: { $ne: id },
          isActive: true
        });

        if (duplicateProduct) {
          res.status(409).json({
            success: false,
            error: {
              code: 'PRODUCT_EXISTS',
              message: 'Product with this name already exists'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
      ).select('-__v');

      const response: ApiResponse<IProduct> = {
        success: true,
        data: updatedProduct!,
        timestamp: new Date().toISOString()
      };

      logger.info(`Product updated: ${id}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Delete product (admin only) - soft delete
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await Product.findOne({ _id: id, isActive: true });
      if (!product) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Soft delete by setting isActive to false
      await Product.findByIdAndUpdate(id, { isActive: false });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Product deleted successfully' },
        timestamp: new Date().toISOString()
      };

      logger.info(`Product deleted: ${id}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete product'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get product categories
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Product.distinct('category', { isActive: true });
      
      const response: ApiResponse<string[]> = {
        success: true,
        data: categories.sort(),
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch categories'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Search products
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const products = await Product.find(
        {
          $text: { $search: query },
          isActive: true
        },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(Number(limit))
        .select('-__v');

      const response: ApiResponse<IProduct[]> = {
        success: true,
        data: products,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error searching products:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search products'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const productController = new ProductController();