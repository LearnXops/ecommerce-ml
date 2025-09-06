import { Router } from 'express';
import { register, login, getProfile, updateProfile, getAllUsers, getUserById, updateUserRole, getUserStats } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

// Admin-only routes
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.get('/users/stats', authenticateToken, requireAdmin, getUserStats);
router.get('/users/:id', authenticateToken, requireAdmin, getUserById);
router.put('/users/:id/role', authenticateToken, requireAdmin, updateUserRole);

export default router;