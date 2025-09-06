import { Router } from 'express';
import { productController } from '../controllers/productController';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Public routes (no authentication required)
router.get('/', optionalAuth, asyncHandler(productController.getProducts.bind(productController)));
router.get('/search', optionalAuth, asyncHandler(productController.searchProducts.bind(productController)));
router.get('/categories', asyncHandler(productController.getCategories.bind(productController)));
router.get('/:id', optionalAuth, asyncHandler(productController.getProductById.bind(productController)));

// Admin-only routes (authentication + admin role required)
router.post('/', authenticateToken, requireAdmin, asyncHandler(productController.createProduct.bind(productController)));
router.put('/:id', authenticateToken, requireAdmin, asyncHandler(productController.updateProduct.bind(productController)));
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(productController.deleteProduct.bind(productController)));

export default router;