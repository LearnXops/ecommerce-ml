import { Request, Response } from 'express';
import { CartRedisService } from '../config/redis';
import { Product, IProduct } from '../models/Product';
import { ICart, CartItem, ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { validateCartItem, validateCartUpdate } from '../validation/cartValidation';

export class CartController {
  // Get user's cart
  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const cart = await CartRedisService.getCart(userId);
      
      if (!cart) {
        // Return empty cart if none exists
        const emptyCart: ICart = {
          userId,
          items: [],
          totalAmount: 0,
          totalItems: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const response: ApiResponse<ICart> = {
          success: true,
          data: emptyCart,
          timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
        return;
      }

      // Extend cart TTL on access
      await CartRedisService.extendCartTTL(userId);

      const response: ApiResponse<ICart> = {
        success: true,
        data: cart,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching cart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch cart'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Add item to cart
  async addItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { error, value } = validateCartItem(req.body);
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

      const { productId, quantity } = value;

      // Verify product exists and is available
      const product = await Product.findOne({ _id: productId, isActive: true });
      if (!product) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found or not available'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check inventory
      if (!product.isActive || product.stock < quantity) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_INVENTORY',
            message: `Only ${product.stock} items available in stock`
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get existing cart or create new one
      let cart = await CartRedisService.getCart(userId);
      if (!cart) {
        cart = {
          userId,
          items: [],
          totalAmount: 0,
          updatedAt: new Date()
        };
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item: CartItem) => item.productId === productId
      );

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        // Check total quantity against inventory
        if (!product.isActive || product.stock < newQuantity) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_INVENTORY',
              message: `Cannot add ${quantity} more items. Only ${product.stock} total available, ${cart.items[existingItemIndex].quantity} already in cart`
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        // Add new item to cart
        const cartItem: CartItem = {
          productId: productId,
          quantity,
          price: product.price,
          name: product.name,
          image: product.image || undefined
        };
        cart.items.push(cartItem);
      }

      // Recalculate total
      cart.totalAmount = this.calculateCartTotal(cart.items);
      cart.updatedAt = new Date();

      // Save cart to Redis
      await CartRedisService.setCart(userId, cart);

      const response: ApiResponse<ICart> = {
        success: true,
        data: cart,
        timestamp: new Date().toISOString()
      };

      logger.info(`Item added to cart for user ${userId}: ${productId} x${quantity}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add item to cart'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update item quantity in cart
  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { error, value } = validateCartUpdate(req.body);
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

      const { quantity } = value;

      // Get cart
      const cart = await CartRedisService.getCart(userId);
      if (!cart) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Find item in cart
      const itemIndex = cart.items.findIndex(
        (item: CartItem) => item.productId === productId
      );

      if (itemIndex === -1) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (quantity === 0) {
        // Remove item from cart
        cart.items.splice(itemIndex, 1);
      } else {
        // Verify product availability
        const product = await Product.findOne({ _id: productId, isActive: true });
        if (!product) {
          res.status(404).json({
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Product not found or not available'
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Check inventory
        if (!product.isActive || product.stock < quantity) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_INVENTORY',
              message: `Only ${product.stock} items available in stock`
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Update quantity and price (in case price changed)
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].price = product.price;
      }

      // Recalculate total
      cart.totalAmount = this.calculateCartTotal(cart.items);
      cart.updatedAt = new Date();

      // Save cart to Redis
      await CartRedisService.setCart(userId, cart);

      const response: ApiResponse<ICart> = {
        success: true,
        data: cart,
        timestamp: new Date().toISOString()
      };

      logger.info(`Cart item updated for user ${userId}: ${productId} quantity=${quantity}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error updating cart item:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update cart item'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Remove item from cart
  async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get cart
      const cart = await CartRedisService.getCart(userId);
      if (!cart) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Find and remove item
      const itemIndex = cart.items.findIndex(
        (item: CartItem) => item.productId === productId
      );

      if (itemIndex === -1) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      cart.items.splice(itemIndex, 1);

      // Recalculate total
      cart.totalAmount = this.calculateCartTotal(cart.items);
      cart.updatedAt = new Date();

      // Save cart to Redis
      await CartRedisService.setCart(userId, cart);

      const response: ApiResponse<ICart> = {
        success: true,
        data: cart,
        timestamp: new Date().toISOString()
      };

      logger.info(`Item removed from cart for user ${userId}: ${productId}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error removing cart item:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove cart item'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Clear entire cart
  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      await CartRedisService.deleteCart(userId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Cart cleared successfully' },
        timestamp: new Date().toISOString()
      };

      logger.info(`Cart cleared for user ${userId}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clear cart'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sync cart with latest product prices and availability
  async syncCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const cart = await CartRedisService.getCart(userId);
      if (!cart || cart.items.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_EMPTY',
            message: 'Cart is empty'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const productIds = cart.items.map((item: CartItem) => item.productId);
      const products = await Product.find({ 
        _id: { $in: productIds },
        isActive: true 
      });

      const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
      const updatedItems: CartItem[] = [];
      const removedItems: string[] = [];

      for (const item of cart.items) {
        const product = productMap.get(item.productId) as any;
        
        if (!product) {
          // Product no longer available
          removedItems.push(item.name);
          continue;
        }

        if (!product.isActive || product.stock < item.quantity) {
          // Adjust quantity to available stock
          if (product.stock > 0) {
            updatedItems.push({
              ...item,
              quantity: product.stock,
              price: product.price
            });
          } else {
            removedItems.push(item.name);
          }
        } else {
          // Update price if changed
          updatedItems.push({
            ...item,
            price: product.price
          });
        }
      }

      cart.items = updatedItems;
      cart.totalAmount = this.calculateCartTotal(cart.items);
      cart.updatedAt = new Date();

      await CartRedisService.setCart(userId, cart);

      const response: ApiResponse<{
        cart: ICart;
        removedItems: string[];
        message?: string;
      }> = {
        success: true,
        data: {
          cart,
          removedItems,
          ...(removedItems.length > 0 && {
            message: `Some items were removed or adjusted due to availability: ${removedItems.join(', ')}`
          })
        },
        timestamp: new Date().toISOString()
      };

      logger.info(`Cart synced for user ${userId}. Removed items: ${removedItems.length}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error syncing cart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to sync cart'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Private helper method to calculate cart total
  private calculateCartTotal(items: CartItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
}

export const cartController = new CartController();