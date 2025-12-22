import express from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  updatePassword,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please include a valid email'),
];

const validateUpdatePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

// All routes are protected
router.use(protect);

// User profile routes
router.route('/profile')
  .get(getProfile)
  .put(validateUpdateProfile, updateProfile);

router.route('/update-password')
  .put(validateUpdatePassword, updatePassword);

router.route('/delete-account')
  .delete(deleteAccount);

export default router;
