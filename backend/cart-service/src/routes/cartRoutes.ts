import { Router } from 'express';
import { cartController } from '../controllers/cartController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All cart routes require authentication
router.use(authenticateToken);

// Get user's cart
router.get('/', asyncHandler(cartController.getCart.bind(cartController)));

// Add item to cart
router.post('/items', asyncHandler(cartController.addItem.bind(cartController)));

// Update item quantity in cart
router.put('/items/:productId', asyncHandler(cartController.updateItem.bind(cartController)));

// Remove item from cart
router.delete('/items/:productId', asyncHandler(cartController.removeItem.bind(cartController)));

// Clear entire cart
router.delete('/', asyncHandler(cartController.clearCart.bind(cartController)));

// Sync cart with latest product data
router.post('/sync', asyncHandler(cartController.syncCart.bind(cartController)));

export default router;