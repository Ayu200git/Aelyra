// backend\routes\authRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  checkAuth
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware
const validateRegister = [
  body('name').not().isEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required'),
];

const validateForgotPassword = [
  body('email').isEmail().withMessage('Please include a valid email'),
];

const validateResetPassword = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// Debug route
router.get('/debug', (req, res) => {
  res.json({
    message: 'Auth routes are working',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/check',
      'GET /api/auth/me',
      'GET /api/auth/logout',
      'POST /api/auth/forgot-password',
      'PUT /api/auth/reset-password/:resettoken',
      'GET /api/auth/verify-email/:verificationtoken',
      'POST /api/auth/resend-verification'
    ]
  });
});

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.put('/reset-password/:resettoken', validateResetPassword, resetPassword);
router.get('/verify-email/:verificationtoken', verifyEmail);
router.post('/resend-verification', validateForgotPassword, resendVerification);

// Protected routes
router.get('/me', protect, getMe);
router.get('/check', protect, checkAuth);
router.get('/logout', protect, logout);

export default router;
