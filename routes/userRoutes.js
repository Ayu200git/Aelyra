import express from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  updatePassword,
  uploadProfileImage,
  deleteProfileImage,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

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

router.use(protect);
router.route('/profile')
  .get(getProfile)
  .put(validateUpdateProfile, updateProfile);

router.route('/update-password')
  .put(validateUpdatePassword, updatePassword);

router.route('/delete-account')
  .delete(deleteAccount);

router.route('/profile-image')
  .post(uploadProfileImage)
  .delete(deleteProfileImage);

const handleImageChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 200 * 1024) {
    setError("Image too large (max 200KB)");
    return;
  }
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = reader.result.split(',')[1];
    const res = await fetch('/api/user/profile-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ image: base64 }),
    });
    const data = await res.json();
    if (data.success) {
      dispatch(setUser(data.data));
    } else {
      setError(data.error || "Upload failed");
    }
  };
  reader.readAsDataURL(file);
};

const handleDeleteImage = async () => {
  const res = await fetch('/api/user/profile-image', {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (data.success) {
    dispatch(setUser(data.data));
  } else {
    setError(data.error || "Delete failed");
  }
};

export default router;
