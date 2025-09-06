import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} from '../controllers/orderController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes (with authentication)
router.post('/', authenticate, createOrder);
router.get('/my-orders', authenticate, getUserOrders);
router.get('/:id', authenticate, getOrderById);
router.post('/:id/cancel', authenticate, cancelOrder);

// Admin routes
router.get('/', authenticate, requireAdmin, getAllOrders);
router.put('/:id', authenticate, requireAdmin, updateOrderStatus);

export default router;